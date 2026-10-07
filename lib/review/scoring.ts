/**
 * How Orbis SocialFit turns signals into a score, as described in the vendor
 * brochure: the company's own aptitude score, moved up or down by each
 * enabled signal in proportion to how strongly it was detected.
 *
 *   score = aptitude + Σ (direction × weight × intensity)   over enabled signals
 *
 * Kestrel shortlists the top half of applicants by this score. The cut-off is
 * therefore relative: it is set by the pool, and a candidate's outcome depends
 * on how everyone else scored.
 */
import { SIGNALS } from "@/lib/case/signals";
import { reviewAllSignals } from "@/lib/review/engine";

export const SHORTLIST_SHARE = 0.5;

export type SignalSet = ReadonlySet<string>;

/** Every signal on — the configuration the vendor proposes. */
export const VENDOR_CONFIG: SignalSet = new Set(SIGNALS.map((s) => s.id));

/**
 * The configuration the review leaves in the automated score: none.
 *
 * Removed signals go. Restricted signals and the one awaiting a human decision
 * leave the automated score and go to a person or a direct question. The one
 * kept signal (profile consistency) is a verification step — confirming that a
 * claimed project exists — not a ranking input, because ranking on it would
 * reward candidates who happen to have a portfolio. What is left to rank on is
 * Kestrel's own aptitude test.
 */
export const REVIEWED_CONFIG: SignalSet = new Set<string>();

export function signalContribution(id: string, intensity: number): number {
  const s = SIGNALS.find((x) => x.id === id);
  if (!s) return 0;
  return s.direction * s.weight * Math.max(0, Math.min(1, intensity));
}

export function score(
  aptitude: number,
  values: Record<string, number>,
  enabled: SignalSet
): number {
  let total = aptitude;
  for (const id of enabled) total += signalContribution(id, values[id] ?? 0);
  return Math.round(total * 10) / 10;
}

/** Per-signal breakdown of how the vendor score was reached. */
export function scoreBreakdown(values: Record<string, number>, enabled: SignalSet) {
  return SIGNALS.filter((s) => enabled.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      intensity: values[s.id] ?? 0,
      points: Math.round(signalContribution(s.id, values[s.id] ?? 0) * 10) / 10,
    }))
    .filter((r) => r.points !== 0);
}

/** Check that the reviewed configuration contains no signal the review removed. */
export function reviewedConfigIsConsistent(): boolean {
  const removed = new Set(
    reviewAllSignals()
      .filter((r) => r.outcome !== "keep")
      .map((r) => r.signal.id)
  );
  for (const id of REVIEWED_CONFIG) if (removed.has(id)) return false;
  return true;
}
