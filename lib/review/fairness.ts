/**
 * The fairness test: who gets shortlisted, by group, under a given set of
 * enabled signals.
 *
 * Benchmark: the impact ratio — a group's selection rate divided by the
 * highest group's rate on the same attribute. A ratio below 0.80 is flagged.
 * The 0.80 line is the US "four-fifths" rule of thumb (29 CFR 1607.4(D)),
 * also used in New York City's bias audits. India has no statutory equivalent;
 * it is used here as a reference standard, not a legal test.
 */
import type { Applicant } from "@/lib/case/types";
import { applicantPool } from "@/lib/review/pool";
import { score, SHORTLIST_SHARE, type SignalSet } from "@/lib/review/scoring";

export const IMPACT_RATIO_THRESHOLD = 0.8;
/** Groups smaller than this are reported but not judged: a few people change the ratio too much. */
export const MIN_GROUP_SIZE = 15;

export type Attribute = "gender" | "collegeTier" | "languageGroup" | "region" | "religionGroup" | "presence";

export const ATTRIBUTES: Array<{ id: Attribute; label: string; format?: (v: unknown) => string }> = [
  { id: "gender", label: "Gender" },
  { id: "collegeTier", label: "College tier", format: (v) => `Tier ${v}` },
  { id: "languageGroup", label: "Language of posts" },
  { id: "region", label: "Home region" },
  { id: "religionGroup", label: "Religion (synthetic label)" },
  { id: "presence", label: "Social media presence", format: (v) => String(v)[0].toUpperCase() + String(v).slice(1) },
];

export interface GroupResult {
  group: string;
  n: number;
  selected: number;
  rate: number;
  /** Rate divided by the best group's rate for this attribute. */
  ratio: number;
  flagged: boolean;
  tooSmall: boolean;
}

export interface AttributeResult {
  attribute: Attribute;
  label: string;
  groups: GroupResult[];
  /** Lowest judged ratio for the attribute. */
  worstRatio: number;
  flagged: boolean;
}

export interface FairnessResult {
  poolSize: number;
  shortlisted: number;
  cutoff: number;
  attributes: AttributeResult[];
  flaggedAttributes: string[];
}

/** Rank by score (desc), break ties by applicant id so the result is stable. */
export function shortlist(pool: Applicant[], enabled: SignalSet) {
  const scored = pool
    .map((a) => ({ a, s: score(a.aptitude, a.signalValues, enabled) }))
    .sort((x, y) => y.s - x.s || x.a.id.localeCompare(y.a.id));
  const k = Math.round(pool.length * SHORTLIST_SHARE);
  const selectedIds = new Set(scored.slice(0, k).map((x) => x.a.id));
  const cutoff = scored[k - 1]?.s ?? 0;
  return { selectedIds, cutoff, scored };
}

export function runFairnessTest(enabled: SignalSet, pool: Applicant[] = applicantPool()): FairnessResult {
  const { selectedIds, cutoff } = shortlist(pool, enabled);

  const attributes: AttributeResult[] = ATTRIBUTES.map(({ id, label, format }) => {
    const buckets = new Map<string, { n: number; selected: number }>();
    for (const a of pool) {
      const key = format ? format(a[id]) : String(a[id]);
      const b = buckets.get(key) ?? { n: 0, selected: 0 };
      b.n += 1;
      if (selectedIds.has(a.id)) b.selected += 1;
      buckets.set(key, b);
    }
    const raw = [...buckets.entries()].map(([group, b]) => ({
      group,
      n: b.n,
      selected: b.selected,
      rate: b.n ? b.selected / b.n : 0,
    }));
    const judged = raw.filter((g) => g.n >= MIN_GROUP_SIZE);
    const best = Math.max(...judged.map((g) => g.rate), 0);
    const groups: GroupResult[] = raw
      .map((g) => {
        const tooSmall = g.n < MIN_GROUP_SIZE;
        const ratio = best > 0 ? g.rate / best : 1;
        return {
          ...g,
          rate: round3(g.rate),
          ratio: round3(ratio),
          tooSmall,
          flagged: !tooSmall && ratio < IMPACT_RATIO_THRESHOLD,
        };
      })
      .sort((x, y) => x.group.localeCompare(y.group));
    const judgedRatios = groups.filter((g) => !g.tooSmall).map((g) => g.ratio);
    const worstRatio = judgedRatios.length ? Math.min(...judgedRatios) : 1;
    return { attribute: id, label, groups, worstRatio, flagged: worstRatio < IMPACT_RATIO_THRESHOLD };
  });

  return {
    poolSize: pool.length,
    shortlisted: selectedIds.size,
    cutoff,
    attributes,
    flaggedAttributes: attributes.filter((a) => a.flagged).map((a) => a.label),
  };
}

function round3(x: number) {
  return Math.round(x * 1000) / 1000;
}
