import {
  streamText,
  UIMessage,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { assertEnv, MissingEnvError } from "@/lib/env";
import { SYSTEM_PROMPT, REVIEW_MISSION } from "@/prompts";
import { isContentFlagged } from "@/lib/moderation";
import {
  MODERATION_FAIL_POLICY,
  MAX_STEPS,
  MAX_MESSAGES,
  MAX_MESSAGE_TEXT_LENGTH,
  MAX_OUTPUT_TOKENS,
  COMPACTION_MAX_SUMMARY_CHARS,
} from "@/config";
import { signSummary, verifySummary } from "@/lib/summary-signature";
import { getModel } from "@/lib/ai/model-registry";
import { routeRequest, getLatestUserText, buildProviderOptions } from "@/lib/ai/routing";
import { buildToolSet } from "@/lib/ai/tools";
import { agentBackend } from "@/lib/ai/backend";
import { buildSourcesBox, createSourceCollector } from "@/lib/ai/sources-box";
import { compactMessages } from "@/lib/compaction";
import { normUrl } from "@/lib/citations";
import { uiSourceSchema, type UISource } from "@/types/data";
import { buildPageContext } from "@/lib/review/page-context";

// A full autonomous review makes twenty-odd tool calls; 300s is the ceiling
// on Vercel's default (fluid compute) functions. Keep VERCEL_MAX_DURATION in step.
export const maxDuration = 300;

/** Step budget for an autonomous full review: every tool the mission asks for, plus the memo. */
const REVIEW_MAX_STEPS = 30;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Only text is accepted. File parts would reach the model unchecked. */
function hasNonTextParts(messages: UIMessage[]): boolean {
  return messages.some(
    (m) => m.role === "user" && (m.parts ?? []).some((p) => (p as { type?: string }).type === "file")
  );
}

function createPlainTextResponse(message: string) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      const id = "server-message";
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: message });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/** Sources shown under earlier answers; reused so follow-up citations keep their titles. */
function priorSources(messages: UIMessage[]): Map<string, UISource> {
  const map = new Map<string, UISource>();
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts ?? []) {
      const p = part as { type?: string; data?: unknown };
      if (p.type === "data-sources" && Array.isArray(p.data)) {
        for (const raw of p.data) {
          const parsed = uiSourceSchema.safeParse(raw);
          if (parsed.success && parsed.data.url) map.set(normUrl(parsed.data.url), parsed.data);
        }
      }
    }
  }
  return map;
}

/** A plain transcript of the conversation, for the ChatGPT-backed agent. */
function transcript(messages: UIMessage[]): string {
  const lines: string[] = [];
  for (const m of messages.slice(-12)) {
    const text = (m.parts ?? [])
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("\n")
      .trim();
    if (text) lines.push(`${m.role === "user" ? "USER" : "AGENT"}: ${text}`);
  }
  const last = lines.pop() ?? "";
  return (lines.length ? `Conversation so far:\n${lines.join("\n\n")}\n\n` : "") + `Answer this:\n${last.replace(/^USER: /, "")}`;
}

export async function POST(req: Request) {
  const backend = agentBackend();
  if (backend === "none") {
    return jsonError(
      "The agent is not connected on this deployment. Every review screen still works. To run the agent, " +
        "run HireLens Review on your own computer and sign in with ChatGPT (see START-HERE.md), or set " +
        "ANTHROPIC_API_KEY on the server.",
      503
    );
  }
  if (backend === "anthropic") {
    try {
      assertEnv();
    } catch (e) {
      if (e instanceof MissingEnvError) {
        return jsonError(`The agent is not configured: ${e.missing.join(", ")} is not set on the server.`, 503);
      }
      throw e;
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON in request body.", 400);
  }

  // "review" runs the autonomous full review: the mission is fixed on the
  // server and client messages are ignored, so the run cannot be steered by
  // what the client sends. "ask" is a question to the same agent.
  const reviewMode = body.mode === "review";
  const messages: UIMessage[] = reviewMode
    ? [{ id: "mission", role: "user", parts: [{ type: "text", text: REVIEW_MISSION }] }]
    : body.messages ?? [];

  if (!Array.isArray(messages)) return jsonError("'messages' must be an array.", 400);
  if (messages.length > MAX_MESSAGES) {
    return jsonError(`Too many messages (max ${MAX_MESSAGES}). Please start a new conversation.`, 400);
  }
  if (hasNonTextParts(messages)) return jsonError("Only text messages are accepted.", 400);

  const latestText = getLatestUserText(messages);
  if (!reviewMode && latestText.length > MAX_MESSAGE_TEXT_LENGTH) {
    return jsonError(`Message too long (max ${MAX_MESSAGE_TEXT_LENGTH} characters).`, 400);
  }

  // Screen-scoped questions: the client names a screen and an id; the note the
  // agent sees is built server-side from the case file.
  const pageContext = reviewMode ? null : buildPageContext(body.screen, body.screenId);
  const collector = createSourceCollector();
  const prior = priorSources(messages);

  /* ------------------------------------------------ ChatGPT sign-in (local) */
  if (backend === "chatgpt") {
    const { runCodexTurn } = await import("@/lib/ai/codex-agent");
    const systemPrompt = SYSTEM_PROMPT + (pageContext ? "\n" + pageContext : "");
    const prompt = reviewMode ? REVIEW_MISSION : transcript(messages);
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const answer = await runCodexTurn({ systemPrompt, prompt, writer, collector, signal: req.signal });
        const box = buildSourcesBox(answer, collector, prior);
        if (box.length > 0) writer.write({ type: "data-sources", id: "sources", data: box });
        writer.write({ type: "finish" });
      },
      onError: (error) => {
        console.error("ChatGPT-backed agent failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        if (/login|auth|unauthori[sz]ed|401|sign in/i.test(msg)) {
          return "The agent could not use your ChatGPT sign-in. Run `npx codex login` in the project folder, sign in, and try again.";
        }
        return `The agent stopped: ${msg}`;
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  /* ------------------------------------------------------ Anthropic (hosted) */
  // The conversation summary enters the model context as trusted history, so it
  // is accepted only with a valid server-issued signature and within size limits.
  const summaryB64 = req.headers.get("X-Compacted-Summary");
  const upToStr = req.headers.get("X-Compacted-UpTo");
  const summarySignature = req.headers.get("X-Compacted-Signature");
  let storedSummary: string | undefined;
  let summarizedUpTo: number | undefined;
  if (summaryB64 && upToStr) {
    try {
      const summary = decodeURIComponent(escape(atob(summaryB64)));
      const upTo = parseInt(upToStr, 10);
      if (
        summary.length <= COMPACTION_MAX_SUMMARY_CHARS &&
        Number.isInteger(upTo) &&
        upTo >= 0 &&
        verifySummary(summary, upTo, summarySignature)
      ) {
        storedSummary = summary;
        summarizedUpTo = upTo;
      }
    } catch {
      // invalid base64: ignore and recompact
    }
  }

  const { vendor, modelId, mode, thinkingLevel } = routeRequest(messages);
  const model = getModel(vendor, modelId);
  const tools = buildToolSet(collector.collect);
  const providerOptions = buildProviderOptions(vendor, mode, thinkingLevel, modelId);

  const [moderationResult, compactionResult] = await Promise.all([
    latestText && !reviewMode
      ? isContentFlagged(latestText)
      : Promise.resolve({ flagged: false, skipped: false, denialMessage: "" }),
    compactMessages(messages, storedSummary, summarizedUpTo),
  ]);

  if (moderationResult.flagged) {
    return createPlainTextResponse(moderationResult.denialMessage || "That message is outside what I can help with.");
  }
  if (moderationResult.skipped && MODERATION_FAIL_POLICY === "closed") {
    return jsonError("Content moderation is temporarily unavailable. Please try again shortly.", 503);
  }

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(compactionResult.messages);
  } catch (error) {
    console.error("convertToModelMessages failed:", error);
    return jsonError("Could not process the message format. Please retry or simplify your last message.", 400);
  }

  const systemPrompt =
    SYSTEM_PROMPT +
    (compactionResult.compacted
      ? "\n\n[Note: Earlier conversation context is provided as a summary. Continue naturally.]"
      : "") +
    (pageContext ? "\n" + pageContext : "");

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model,
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(reviewMode ? REVIEW_MAX_STEPS : MAX_STEPS),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        providerOptions,
        onFinish: ({ steps }) => {
          const box = buildSourcesBox(steps.map((s) => s.text).join("\n"), collector, prior);
          if (box.length > 0) writer.write({ type: "data-sources", id: "sources", data: box });
        },
      });
      writer.merge(result.toUIMessageStream({ sendReasoning: true }));
    },
    onError: (error) => {
      console.error("streamText failed:", error);
      return "The model provider returned an error. Please try again.";
    },
  });

  const response = createUIMessageStreamResponse({ stream });
  if (compactionResult.newSummary) {
    const newUpTo = compactionResult.newSummarizedUpTo ?? 0;
    response.headers.set("X-Compacted-Summary", Buffer.from(compactionResult.newSummary).toString("base64"));
    response.headers.set("X-Compacted-UpTo", String(newUpTo));
    response.headers.set("X-Compacted-Signature", signSummary(compactionResult.newSummary, newUpTo));
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-Compacted-Summary, X-Compacted-UpTo, X-Compacted-Signature"
    );
  }
  return response;
}
