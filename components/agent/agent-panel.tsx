"use client";

/**
 * "Ask the agent" — the same review agent, answering questions.
 *
 * Docked at the right on every screen and scoped to whatever is open: on a
 * candidate's page, "why was this person flagged?" means that candidate. The
 * panel sends only the screen name and id; the server builds the context the
 * agent sees from the case file. The conversation lives in the layout, so it
 * survives moving between screens and ends when the tab is closed.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Square, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Mark } from "@/components/brand/logo";
import { MessageWall } from "@/components/messages/message-wall";
import { ThinkingIndicator } from "@/components/ai-elements/thinking-indicator";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_TEXT_LENGTH } from "@/config";

type ScreenRef = { screen: string; screenId?: string; label: string; suggestions: string[] };

export function screenFromPath(path: string): ScreenRef {
  const [, a, b] = path.split("/");
  if (a === "signals" && b)
    return {
      screen: "signal",
      screenId: b,
      label: `Signal ${b}`,
      suggestions: [
        "Explain this outcome in plain language",
        "Which rule decided this, and what would change it?",
        "What does Indian law say about this signal?",
      ],
    };
  if (a === "candidates" && b)
    return {
      screen: "candidate",
      screenId: b,
      label: "This candidate's case",
      suggestions: [
        "Why did the tool score this candidate this way?",
        "Which findings would a hiring manager most need to know?",
        "What should happen next for this case, and who decides?",
      ],
    };
  const map: Record<string, ScreenRef> = {
    signals: {
      screen: "signals",
      label: "All signals",
      suggestions: ["Which signals survive the review, and on what conditions?", "Why is S04 sent to a human?"],
    },
    candidates: {
      screen: "candidates",
      label: "All candidates",
      suggestions: ["What patterns run across these nine cases?", "Who did the tool lift unfairly, and how?"],
    },
    fairness: {
      screen: "fairness",
      label: "Fairness test",
      suggestions: [
        "Explain the impact ratio simply",
        "Why does gender pass the test when S11 penalises women?",
        "What can this test not tell us?",
      ],
    },
    evidence: {
      screen: "evidence",
      label: "Evidence library",
      suggestions: ["Does the DPDP Act cover public social media?", "Is there research that social media predicts job performance?"],
    },
    decision: {
      screen: "decision",
      label: "Decision sheet",
      suggestions: ["Summarise the recommendation for a board in five lines", "What exactly must the DPO decide?"],
    },
    method: {
      screen: "method",
      label: "Method and limits",
      suggestions: ["Walk me through the six questions", "Review a new signal: candidates' Spotify listening habits"],
    },
  };
  return (
    map[a] ?? {
      screen: "overview",
      label: "Overview",
      suggestions: [
        "What is the recommendation, in one paragraph?",
        "Review a new signal: number of LinkedIn connections",
        "What is missing from the vendor's evidence?",
      ],
    }
  );
}

export function AgentPanel() {
  const path = usePathname();
  const ref = useMemo(() => screenFromPath(path), [path]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    experimental_throttle: 50,
    onError(error) {
      toast.error(error.message || "Something went wrong. Please try again.");
    },
  });

  const busy = status === "streaming" || status === "submitted";

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (trimmed.length > MAX_MESSAGE_TEXT_LENGTH) {
        toast.error(`Message must be at most ${MAX_MESSAGE_TEXT_LENGTH} characters.`);
        return;
      }
      sendMessage({ text: trimmed }, { body: { mode: "ask", screen: ref.screen, screenId: ref.screenId } });
      setInput("");
    },
    [busy, sendMessage, ref]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (busy) stop();
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, stop]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Other parts of the page can open the panel with a question ready to send.
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      setOpen(true);
      if (q) setTimeout(() => send(q), 50);
    };
    window.addEventListener("hl:ask", handler);
    return () => window.removeEventListener("hl:ask", handler);
  }, [send]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hl-btn hl-btn--primary hl-no-print fixed bottom-4 right-4 z-40 shadow-lg sm:bottom-6 sm:right-6"
          aria-label="Ask the agent"
        >
          <Mark size={18} />
          Ask the agent
        </button>
      )}

      {open && <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside
        aria-label="Ask the agent"
        aria-hidden={!open}
        className={`hl-no-print fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-canvas shadow-2xl transition-transform duration-300 ease-out sm:w-[440px] lg:w-[500px] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-start gap-3 bg-brand px-4 py-3 text-white">
          <Mark size={22} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Ask the agent</div>
            <div className="mt-0.5 truncate text-[12px] opacity-75">Looking at: {ref.label}</div>
          </div>
          {messages.length > 0 && !busy && (
            <button
              type="button"
              className="rounded px-2 py-1 text-[12px] opacity-80 hover:bg-white/10 hover:opacity-100"
              onClick={() => setMessages([])}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="rounded p-1 hover:bg-white/10"
            onClick={() => setOpen(false)}
            aria-label="Close the agent panel"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div>
              <p className="text-[13px] leading-relaxed text-subtle">
                The agent answers from the case file, the review tools and the evidence library, and cites what it
                uses. It recommends; it does not decide. It can also review a signal the vendor did not list.
              </p>
              <div className="hl-eyebrow mb-2 mt-5">Try</div>
              <div className="flex flex-col gap-2">
                {ref.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-line bg-paper px-3 py-2 text-left text-[13px] hover:border-brand/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageWall messages={messages} status={status} />
          )}
          {status === "submitted" && (
            <div className="mt-3">
              <ThinkingIndicator />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-line bg-paper px-3 pb-3 pt-3">
          <div className="relative">
            <Textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="max-h-40 min-h-12 resize-none rounded-lg border-line bg-paper py-3 pl-3 pr-12 text-sm"
              placeholder="Ask about this screen…"
              disabled={status === "streaming"}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-md bg-ink text-white"
                onClick={() => stop()}
                aria-label="Stop"
              >
                <Square className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-md bg-brand text-white disabled:opacity-40"
                onClick={() => send(input)}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-subtle">Shift+Enter for a new line. Answers can be wrong; check the cited source.</p>
        </div>
      </aside>
    </>
  );
}

/** Open the agent panel from anywhere, optionally with a question to send. */
export function askAgent(question?: string) {
  window.dispatchEvent(new CustomEvent("hl:ask", { detail: question ?? "" }));
}
