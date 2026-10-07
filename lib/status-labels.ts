/**
 * Status labels shown while the assistant works.
 *
 * Present-tense labels rotate while a phase is running; past-tense labels
 * replace them once it finishes. The vocabulary is a reviewer's, not a
 * chatbot's: a privacy manager reading "Checking the evidence library" knows
 * what the assistant is doing and why it is taking a moment.
 */

export const STATUS_LABELS = {
  thinking: ["Reviewing", "Considering", "Weighing the evidence", "Thinking it through"],
  processing: ["Running the review", "Applying the six checks", "Working through the findings"],
  library: ["Checking the evidence library", "Looking up the rule", "Finding the source"],
  review: ["Reading the case file", "Pulling the signal review", "Opening the candidate file"],
  fairness: ["Running the fairness test", "Comparing selection rates"],
  assembling: ["Drafting the answer", "Assembling the findings"],
  compacting: ["Condensing earlier conversation", "Summarising the thread so far"],
} as const;

export const STATUS_PAST_TENSE: Record<StatusCategory, string[]> = {
  thinking: ["Reviewed", "Considered"],
  processing: ["Ran the review", "Applied the checks"],
  library: ["Checked the evidence library", "Found the source"],
  review: ["Read the case file", "Opened the record"],
  fairness: ["Ran the fairness test"],
  assembling: ["Drafted"],
  compacting: ["Condensed earlier conversation"],
};

export type StatusCategory = keyof typeof STATUS_LABELS;

function pick(list: readonly string[], exclude?: string): string {
  const candidates = list.filter((l) => l !== exclude);
  const pool = candidates.length > 0 ? candidates : list;
  return pool[Math.floor(Math.random() * pool.length)] ?? "";
}

/** A present-tense label, optionally different from the one on screen. */
export function pickRandom(category: StatusCategory, exclude?: string): string {
  return pick(STATUS_LABELS[category] ?? STATUS_LABELS.thinking, exclude);
}

/** The past-tense label for a finished phase. */
export function pickRandomPastTense(category: StatusCategory): string {
  return pick(STATUS_PAST_TENSE[category] ?? STATUS_PAST_TENSE.thinking);
}
