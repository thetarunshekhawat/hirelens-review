/**
 * Running the agent on a ChatGPT sign-in, through OpenAI's official Codex SDK.
 *
 * Codex drives the model; our review tools reach it over MCP (mcp/server.ts),
 * so the agent calls exactly the same tools as in the hosted mode. Codex's own
 * built-in abilities are switched off as far as configuration allows: a
 * read-only sandbox in an empty working folder, no network, no web search, and
 * instructions to use only the HireLens tools.
 *
 * Codex events are translated into the same UI message stream the hosted
 * agent produces, so the trace, the memo and the Sources box render the same
 * way whichever model is behind them.
 */
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Codex, type ThreadItem } from "@openai/codex-sdk";
import type { UIMessageStreamWriter } from "ai";
import type { SourceCollector } from "./sources-box";

const TOOL_RULES = `
<operating_rules>
You are running inside OpenAI Codex, but you are not a coding agent here.
Use ONLY the tools of the "hirelens" MCP server. Do not run shell commands,
read or write files, or browse the web. If a tool you need is unavailable,
say so in your answer instead of improvising.
</operating_rules>`;

function root() {
  return process.cwd();
}

function emptyWorkdir(): string {
  const dir = path.join(tmpdir(), "hirelens-agent-workdir");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function createCodexClient(systemPrompt: string): Codex {
  const tsxCli = path.join(root(), "node_modules", "tsx", "dist", "cli.mjs");
  return new Codex({
    config: {
      developer_instructions: systemPrompt + "\n" + TOOL_RULES,
      mcp_servers: {
        hirelens: {
          command: process.execPath,
          args: [tsxCli, path.join(root(), "mcp", "server.ts")],
          cwd: root(),
          startup_timeout_sec: 40,
          tool_timeout_sec: 60,
          default_tools_approval_mode: "approve",
        },
      },
    },
  });
}

/** The library tools return sources; feed them to the Sources box collector. */
function collectSourcesFrom(tool: string, output: unknown, collector: SourceCollector) {
  const rows =
    tool === "searchEvidenceLibrary"
      ? ((output as { results?: unknown[] })?.results ?? [])
      : tool === "getEvidenceForSignal" && Array.isArray(output)
        ? output
        : [];
  for (const r of rows as Array<Record<string, unknown>>) {
    if (typeof r.url !== "string" || typeof r.title !== "string") continue;
    collector.collect(
      { kind: "kb", title: r.title, url: r.url, site: String(r.kind ?? "Library") },
      [r.title, r.summary, ...(Array.isArray(r.keyPoints) ? r.keyPoints : []), r.caveat ?? ""].join("\n")
    );
  }
}

function parseToolOutput(item: Extract<ThreadItem, { type: "mcp_tool_call" }>): unknown {
  if (item.error) return { error: item.error.message };
  const block = item.result?.content?.[0] as { type?: string; text?: string } | undefined;
  if (block?.type === "text" && typeof block.text === "string") {
    try {
      return JSON.parse(block.text);
    } catch {
      return block.text;
    }
  }
  return item.result?.structured_content ?? null;
}

/**
 * Run one agent turn and write it to the UI stream. Returns the full answer
 * text, for building the Sources box.
 */
export async function runCodexTurn(opts: {
  systemPrompt: string;
  prompt: string;
  writer: UIMessageStreamWriter;
  collector: SourceCollector;
  signal?: AbortSignal;
}): Promise<string> {
  const { writer, collector } = opts;
  const codex = createCodexClient(opts.systemPrompt);
  const thread = codex.startThread({
    workingDirectory: emptyWorkdir(),
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    networkAccessEnabled: false,
    webSearchMode: "disabled",
    modelReasoningEffort: (process.env.CODEX_REASONING_EFFORT as "low" | "medium" | "high") || "low",
    ...(process.env.CODEX_MODEL ? { model: process.env.CODEX_MODEL } : {}),
  });

  const texts: string[] = [];
  const startedTools = new Set<string>();
  writer.write({ type: "start" });

  const { events } = await thread.runStreamed(opts.prompt, { signal: opts.signal });
  for await (const event of events) {
    if (event.type === "turn.failed") {
      throw new Error(event.error?.message || "The ChatGPT-backed agent could not complete the turn.");
    }
    if (event.type === "error") {
      throw new Error((event as { message?: string }).message || "The ChatGPT-backed agent reported an error.");
    }
    if (event.type !== "item.started" && event.type !== "item.completed") continue;
    const item = event.item;

    if (item.type === "mcp_tool_call") {
      if (!startedTools.has(item.id)) {
        startedTools.add(item.id);
        writer.write({ type: "tool-input-available", toolCallId: item.id, toolName: item.tool, input: item.arguments ?? {} });
      }
      if (event.type === "item.completed") {
        const output = parseToolOutput(item);
        collectSourcesFrom(item.tool, output, collector);
        writer.write({ type: "tool-output-available", toolCallId: item.id, output });
      }
    } else if (item.type === "agent_message" && event.type === "item.completed" && item.text.trim()) {
      texts.push(item.text);
      writer.write({ type: "text-start", id: item.id });
      writer.write({ type: "text-delta", id: item.id, delta: item.text });
      writer.write({ type: "text-end", id: item.id });
    } else if (item.type === "error" && event.type === "item.completed") {
      console.warn("Codex item error:", item.message);
    }
  }
  return texts.join("\n");
}
