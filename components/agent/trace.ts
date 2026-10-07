/**
 * Turning the agent's stream into a readable trace.
 *
 * The run arrives as one assistant message whose parts interleave short
 * narration, tool calls and, last, the memo. This module splits it into
 * steps (one per tool call, carrying the narration that introduced it) and the
 * memo (the text after the final tool call), and writes a one-line summary of
 * what each tool returned, from the tool's own output.
 */
import type { UIMessage } from "ai";
import { SIGNAL_BY_ID } from "@/lib/case/signals";
import { CANDIDATE_BY_ID } from "@/lib/case/candidates";

export type Phase = "case" | "signals" | "candidates" | "fairness" | "evidence" | "handoff" | "decision" | "other";

export const PHASES: Array<{ id: Phase; label: string }> = [
  { id: "case", label: "Read the case file" },
  { id: "signals", label: "Review the signals" },
  { id: "candidates", label: "Investigate candidates" },
  { id: "fairness", label: "Run the fairness test" },
  { id: "evidence", label: "Check the evidence" },
  { id: "handoff", label: "Hand off to people" },
  { id: "decision", label: "Apply the decision rules" },
];

const PHASE_OF: Record<string, Phase> = {
  getCaseFile: "case",
  getSignalReview: "signals",
  assessNewSignal: "signals",
  getCandidateReview: "candidates",
  runFairnessTest: "fairness",
  searchEvidenceLibrary: "evidence",
  getEvidenceForSignal: "evidence",
  recordHandoff: "handoff",
  getDecisionRules: "decision",
};

export interface TraceStep {
  key: string;
  tool: string;
  phase: Phase;
  narration: string;
  title: string;
  summary: string | null;
  done: boolean;
  isHandoff: boolean;
}

export interface ParsedRun {
  steps: TraceStep[];
  memo: string;
  phasesDone: Set<Phase>;
}

type AnyPart = { type: string; text?: string; state?: string; input?: any; output?: any; toolCallId?: string };

function toolName(p: AnyPart): string | null {
  if (p.type.startsWith("tool-")) return p.type.slice(5);
  return null;
}

function title(tool: string, input: any): string {
  switch (tool) {
    case "getCaseFile":
      return "Read the case file";
    case "getSignalReview": {
      const id = input?.signalId as string | undefined;
      return id ? `Reviewed signal ${id}: ${SIGNAL_BY_ID[id]?.name ?? ""}` : "Reviewed all thirteen signals";
    }
    case "getCandidateReview": {
      const id = input?.candidateId as string | undefined;
      return id ? `Opened the case of ${CANDIDATE_BY_ID[id]?.name ?? id}` : "Summarised all nine candidate cases";
    }
    case "runFairnessTest":
      return `Ran the fairness test: ${input?.configuration ?? ""} configuration`;
    case "searchEvidenceLibrary":
      return `Searched the evidence library: “${input?.query ?? ""}”`;
    case "getEvidenceForSignal":
      return `Pulled the evidence recorded for ${input?.signalId ?? "a signal"}`;
    case "assessNewSignal":
      return `Assessed a new signal: ${input?.name ?? ""}`;
    case "recordHandoff":
      return `Handed to ${input?.owner ?? "a person"}`;
    case "getDecisionRules":
      return "Applied the decision rules";
    default:
      return tool;
  }
}

function summary(tool: string, input: any, output: any): string | null {
  if (output == null) return null;
  try {
    switch (tool) {
      case "getCaseFile": {
        const missing = (output.vendorDocuments ?? []).filter((d: any) => d.status !== "received").length;
        return `${output.signals?.length ?? 0} signals, ${output.candidates?.length ?? 0} sample candidates; ${missing} vendor documents missing or partial.`;
      }
      case "getSignalReview": {
        if (Array.isArray(output)) {
          const n: Record<string, number> = {};
          for (const r of output) n[r.outcome] = (n[r.outcome] ?? 0) + 1;
          return Object.entries(n)
            .map(([k, v]) => `${v} ${k.toLowerCase()}`)
            .join(" · ");
        }
        return `${output.outcome} (${String(output.ruleApplied ?? "").split(":")[0]})`;
      }
      case "getCandidateReview": {
        if (Array.isArray(output)) {
          const flipped = output.filter((r: any) => r.vendorShortlisted !== r.reviewedShortlisted).length;
          return `${flipped} of ${output.length} shortlist outcomes change once the review is applied.`;
        }
        const v = output.vendor, a = output.afterReview;
        return `Vendor ${v?.score} (${v?.shortlisted ? "shortlisted" : "below the line"}) → after review ${a?.score} (${a?.shortlisted ? "shortlisted" : "below the line"}). Identity: ${output.identityCheck?.status}.`;
      }
      case "runFairnessTest":
        return output.flagged?.length ? `Below 0.80: ${output.flagged.join(", ")}.` : "No group below the 0.80 line.";
      case "searchEvidenceLibrary":
        return output.results?.length
          ? output.results.map((r: any) => r.title).slice(0, 3).join(" · ")
          : "No matching source in the library.";
      case "getEvidenceForSignal":
        return Array.isArray(output) ? output.map((r: any) => r.title).join(" · ") : null;
      case "assessNewSignal":
        return `${output.outcome}. ${output.status ?? ""}`;
      case "recordHandoff":
        return input?.question ?? null;
      case "getDecisionRules":
        return output.recommendation ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseRun(message: UIMessage | undefined): ParsedRun {
  const steps: TraceStep[] = [];
  const phasesDone = new Set<Phase>();
  if (!message) return { steps, memo: "", phasesDone };

  const parts = message.parts as unknown as AnyPart[];
  let lastToolIndex = -1;
  parts.forEach((p, i) => {
    if (toolName(p)) lastToolIndex = i;
  });

  let pendingNarration: string[] = [];
  const memoChunks: string[] = [];
  parts.forEach((p, i) => {
    const tool = toolName(p);
    if (p.type === "text") {
      if (i > lastToolIndex) memoChunks.push(p.text ?? "");
      else pendingNarration.push((p.text ?? "").trim());
      return;
    }
    if (!tool) return;
    const done = p.state === "output-available";
    const phase = PHASE_OF[tool] ?? "other";
    if (done) phasesDone.add(phase);
    steps.push({
      key: p.toolCallId ?? `${tool}-${i}`,
      tool,
      phase,
      narration: pendingNarration.filter(Boolean).join(" "),
      title: title(tool, p.input),
      summary: done ? summary(tool, p.input, p.output) : null,
      done,
      isHandoff: tool === "recordHandoff",
    });
    pendingNarration = [];
  });

  return { steps, memo: memoChunks.join("\n").trim(), phasesDone };
}
