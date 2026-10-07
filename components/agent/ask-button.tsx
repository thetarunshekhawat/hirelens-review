"use client";

import { MessageSquare } from "lucide-react";
import { askAgent } from "./agent-panel";

/** A button that opens the agent panel with a question already sent. */
export function AskButton({ question, children }: { question: string; children?: React.ReactNode }) {
  return (
    <button type="button" className="hl-btn hl-btn--ghost hl-btn--sm hl-no-print" onClick={() => askAgent(question)}>
      <MessageSquare className="size-3.5" />
      {children ?? "Ask the agent"}
    </button>
  );
}
