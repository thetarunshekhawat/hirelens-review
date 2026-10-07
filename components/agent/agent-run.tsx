"use client";

/**
 * The autonomous review, run live.
 *
 * One button starts the agent on the fixed mission (prompts.ts: REVIEW_MISSION).
 * While it works, the left column shows its plan ticking off and every tool
 * call it makes, with the note it wrote before the call and what came back.
 * Hand-offs to people are marked distinctly. When it finishes, the memo
 * appears with its sources. The last completed run is kept in this browser so
 * the page does not need a fresh run on every visit.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  BookOpen,
  Check,
  FileSearch,
  FileText,
  Gavel,
  History,
  ListChecks,
  Loader2,
  Play,
  RotateCcw,
  Scale,
  Square,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Response } from "@/components/ai-elements/response";
import { Sources } from "@/components/messages/sources";
import { rewriteCitationsInParts } from "@/lib/citations";
import type { UISource } from "@/types/data";
import { PHASES, parseRun, type TraceStep } from "./trace";
import recorded from "@/data/recorded-run.json";

type Status = { backend: "anthropic" | "chatgpt" | "none"; label: string };
const RECORDED = recorded as unknown as {
  recordedAt: string;
  backend: string;
  durationSeconds: number;
  toolCalls: number;
  messages: UIMessage[];
};
const recordedDate = new Date(RECORDED.recordedAt).toLocaleDateString("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STORAGE_KEY = "hirelens:last-run:v1";

const ICONS: Record<string, React.ReactNode> = {
  getCaseFile: <FileSearch className="size-3" />,
  getSignalReview: <ListChecks className="size-3" />,
  assessNewSignal: <ListChecks className="size-3" />,
  getCandidateReview: <UserRound className="size-3" />,
  runFairnessTest: <Scale className="size-3" />,
  searchEvidenceLibrary: <BookOpen className="size-3" />,
  getEvidenceForSignal: <BookOpen className="size-3" />,
  recordHandoff: <UsersRound className="size-3" />,
  getDecisionRules: <Gavel className="size-3" />,
};

function loadSaved(): UIMessage[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.messages) ? parsed.messages : null;
  } catch {
    return null;
  }
}

function save(messages: UIMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), messages }));
  } catch {
    /* storage full or blocked: the run still shows, it just is not kept */
  }
}

function Step({ step, live }: { step: TraceStep; live: boolean }) {
  return (
    <li className="hl-trace__step">
      <span
        className={`hl-trace__icon ${step.isHandoff ? "hl-trace__icon--handoff" : ""} ${live ? "hl-trace__icon--live" : ""}`}
        aria-hidden
      >
        {live ? <Loader2 className="size-3 animate-spin" /> : ICONS[step.tool] ?? <Check className="size-3" />}
      </span>
      {step.narration && <p className="mb-1 text-[12.5px] italic leading-snug text-subtle">{step.narration}</p>}
      <div className={`text-[13px] font-semibold leading-snug ${step.isHandoff ? "text-human" : "text-ink"}`}>
        {step.title}
      </div>
      {step.summary && (
        <div className={`mt-0.5 text-[12.5px] leading-snug ${step.isHandoff ? "text-human/90" : "text-subtle"}`}>
          {step.summary}
        </div>
      )}
    </li>
  );
}

export function AgentRun() {
  const [restored, setRestored] = useState<UIMessage[] | null>(null);
  const [status_, setStatus] = useState<Status | null>(null);
  const [showingRecorded, setShowingRecorded] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    experimental_throttle: 80,
    onError(error) {
      toast.error(error.message || "The agent could not complete the run.");
    },
    onFinish({ messages: all }) {
      save(all);
    },
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent-status")
      .then((r) => r.json())
      .then((s: Status) => {
        if (cancelled) return;
        setStatus(s);
        const saved = loadSaved();
        if (saved) {
          setRestored(saved);
          setMessages(saved);
        } else if (s.backend === "none") {
          setShowingRecorded(true);
          setMessages(RECORDED.messages);
        }
      })
      .catch(() => setStatus({ backend: "none", label: "Unknown" }));
    return () => {
      cancelled = true;
    };
  }, [setMessages]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const live = status_ ? status_.backend !== "none" : false;
  const assistant = [...messages].reverse().find((m) => m.role === "assistant");
  const visible = useMemo(() => {
    if (!assistant || revealed === null) return assistant;
    return { ...assistant, parts: assistant.parts.slice(0, revealed) };
  }, [assistant, revealed]);
  const replaying = revealed !== null && !!assistant && revealed < assistant.parts.length;
  const run = useMemo(() => parseRun(visible), [visible]);
  const sources =
    ((visible?.parts.find((p) => p.type === "data-sources") as { data?: UISource[] } | undefined)?.data ?? []);
  const memo = useMemo(() => (run.memo ? rewriteCitationsInParts([run.memo])[0] : ""), [run.memo]);
  const handoffs = run.steps.filter((s) => s.isHandoff);
  const hasRun = run.steps.length > 0 || busy;

  function start() {
    if (timer.current) clearInterval(timer.current);
    setRevealed(null);
    setShowingRecorded(false);
    setRestored(null);
    setMessages([]);
    sendMessage({ text: "Run the full review." }, { body: { mode: "review" } });
  }

  function replayRecorded() {
    if (timer.current) clearInterval(timer.current);
    setRestored(null);
    setShowingRecorded(true);
    setMessages(RECORDED.messages);
    const total = (RECORDED.messages.find((m) => m.role === "assistant")?.parts.length ?? 0);
    setRevealed(0);
    timer.current = setInterval(() => {
      setRevealed((n) => {
        const next = (n ?? 0) + 1;
        if (next >= total && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
        return Math.min(next, total);
      });
    }, 420);
  }

  return (
    <section aria-labelledby="agent-run-heading" className="hl-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="hl-eyebrow">The agent</div>
          <h2 id="agent-run-heading" className="hl-h2">
            Autonomous review run
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!busy && (
            <button type="button" className="hl-btn hl-btn--ghost" onClick={replayRecorded} disabled={replaying}>
              <History className="size-4" /> Replay the recorded run
            </button>
          )}
          {busy ? (
            <button type="button" className="hl-btn hl-btn--ghost" onClick={() => stop()}>
              <Square className="size-3.5" /> Stop
            </button>
          ) : live ? (
            <button type="button" className="hl-btn hl-btn--accent" onClick={start}>
              {hasRun && !showingRecorded ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
              {hasRun && !showingRecorded ? "Run the review again" : "Run the review live"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-canvas/60 px-5 py-2 text-[12px] text-subtle sm:px-6">
        <span>
          Model:{" "}
          <span className={status_?.backend === "none" ? "text-restrict" : "text-ink"}>
            {status_?.label ?? "checking…"}
          </span>
        </span>
        {showingRecorded && (
          <span className="hl-chip hl-chip--brand">
            Recorded run · {recordedDate} · {RECORDED.toolCalls} tool calls · {Math.round(RECORDED.durationSeconds / 60 * 10) / 10} min · {RECORDED.backend}
          </span>
        )}
        {status_?.backend === "none" && (
          <span>To run the agent live, run HireLens Review on your own computer and sign in with ChatGPT (see START-HERE.md).</span>
        )}
      </div>

      {!hasRun ? (
        <div className="grid gap-6 px-5 py-6 sm:px-6 md:grid-cols-[1fr_1fr]">
          <div className="text-[14px] leading-relaxed text-ink/85">
            <p className="mb-3">
              Press <strong>Run the review live</strong> and the agent works through the case on its own: it reads the
              case file, puts every signal through the six questions, opens candidate files, runs the fairness test,
              checks the law and research, and hands to named people anything outside its authority.
            </p>
            <p>
              You can watch each step as it happens. It finishes with a memo for the two decision owners. A live run
              takes two to three minutes. <strong>Replay the recorded run</strong> plays back a real earlier run, step
              by step.
            </p>
          </div>
          <ol className="grid gap-2 text-[13px]">
            {PHASES.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                <span className="hl-num text-subtle">{i + 1}</span>
                {p.label}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[380px_1fr]">
          {/* Plan and trace */}
          <div className="border-b border-line bg-canvas/60 px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r">
            <div className="hl-eyebrow mb-2">Plan</div>
            <ul className="mb-5 grid grid-cols-1 gap-1 text-[12.5px] sm:grid-cols-2 lg:grid-cols-1">
              {PHASES.map((p) => {
                const done = run.phasesDone.has(p.id);
                return (
                  <li key={p.id} className={`flex items-center gap-2 ${done ? "text-ink" : "text-subtle"}`}>
                    <span
                      className={`grid size-4 place-items-center rounded-full border ${
                        done ? "border-keep bg-keep text-white" : "border-line bg-paper"
                      }`}
                    >
                      {done && <Check className="size-2.5" />}
                    </span>
                    {p.label}
                  </li>
                );
              })}
            </ul>

            <div className="hl-eyebrow mb-3">
              Steps taken <span className="hl-num">({run.steps.length})</span>
              {restored && !busy && <span className="ml-2 normal-case tracking-normal">· your last run</span>}
            </div>
            {status === "submitted" && run.steps.length === 0 && (
              <p className="flex items-center gap-2 text-[13px] text-subtle">
                <Loader2 className="size-3.5 animate-spin" /> Starting the review…
              </p>
            )}
            <ol className="hl-trace max-h-[640px] overflow-y-auto pr-1">
              {run.steps.map((s, i) => (
                <Step key={s.key} step={s} live={(busy || replaying) && !s.done && i === run.steps.length - 1} />
              ))}
            </ol>
          </div>

          {/* Memo */}
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <FileText className="size-4 text-brand" />
              <span className="hl-eyebrow">Memo to the decision owners</span>
              {handoffs.length > 0 && (
                <span className="hl-chip hl-chip--human ml-auto">
                  {handoffs.length} matter{handoffs.length > 1 ? "s" : ""} handed to people
                </span>
              )}
            </div>
            {memo ? (
              <div className="hl-memo">
                <Response isAnimating={status === "streaming"}>{memo}</Response>
                {!busy && !replaying && sources.length > 0 && <Sources sources={sources} />}
              </div>
            ) : (
              <p className="text-[13.5px] text-subtle">
                {busy || replaying
                  ? "The memo will appear here once the agent has gathered its evidence."
                  : "The run ended before a memo was written. Run the review again."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
