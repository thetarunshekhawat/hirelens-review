/**
 * Which screen the user is asking from.
 *
 * The client sends only a screen name and, where relevant, an id. The note the
 * agent receives is built here from the case file, never from client text, so
 * the panel cannot be used to write instructions into the system prompt. An
 * unknown screen or id is ignored and the agent simply runs unscoped.
 */
import { CANDIDATE_BY_ID } from "@/lib/case/candidates";
import { SIGNAL_BY_ID } from "@/lib/case/signals";
import { pageContextNote } from "@/prompts";

export const SCREENS = ["overview", "signals", "signal", "candidates", "candidate", "fairness", "evidence", "decision", "method"] as const;
export type Screen = (typeof SCREENS)[number];

export function buildPageContext(screen: unknown, id: unknown): string | null {
  if (typeof screen !== "string" || !(SCREENS as readonly string[]).includes(screen)) return null;
  const s = screen as Screen;
  const key = typeof id === "string" && id.length <= 20 ? id : null;

  switch (s) {
    case "signal": {
      const sig = key ? SIGNAL_BY_ID[key] : null;
      if (!sig) return null;
      return pageContextNote(
        `the review of signal ${sig.id}, "${sig.name}"`,
        `Questions like "why" or "what does this mean" refer to this signal. Use getSignalReview with signalId "${sig.id}".`
      );
    }
    case "candidate": {
      const c = key ? CANDIDATE_BY_ID[key] : null;
      if (!c) return null;
      return pageContextNote(
        `the case review for sample candidate ${c.name} (fictional)`,
        `Questions about "this candidate" or "her/him/them" refer to ${c.name}. Use getCandidateReview with candidateId "${c.id}".`
      );
    }
    case "overview":
      return pageContextNote("the overview of the proposal and the review", "Use getCaseFile and getDecisionRules for the big picture.");
    case "signals":
      return pageContextNote("the table of all thirteen signal reviews", "Use getSignalReview.");
    case "candidates":
      return pageContextNote("the list of nine sample candidate reviews", "Use getCandidateReview.");
    case "fairness":
      return pageContextNote(
        "the fairness test",
        "Use runFairnessTest. Explain impact ratios plainly and state the synthetic-pool limits."
      );
    case "evidence":
      return pageContextNote("the evidence library", "Use searchEvidenceLibrary and cite results.");
    case "decision":
      return pageContextNote("the decision sheet", "Use getDecisionRules. Remember: the decision belongs to the two owners.");
    case "method":
      return pageContextNote("the method and limits page", "Explain the six questions, the rules R1–R7 and the decision rules D1–D3.");
  }
}
