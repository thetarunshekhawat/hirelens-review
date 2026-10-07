/**
 * The synthetic applicant pool for the fairness test.
 *
 * 1,000 applicants generated from a fixed seed, so every run — on any machine,
 * in the browser or in a test — produces the same pool and the same result.
 *
 * MODELLING ASSUMPTIONS. These are stated here, and on the Fairness page,
 * because the result depends on them. They are plausible, not measured:
 *
 *  1. The aptitude test is equally distributed across every group. This is
 *     enforced by construction (see `balanceAptitude`), not left to chance, so
 *     any gap the test finds comes from the vendor's signals and not from
 *     sampling noise. The review did not audit Kestrel's aptitude test; if it
 *     is itself biased, that bias is outside this test.
 *  2. Women more often keep accounts private, so less of their content is
 *     visible and the "little or no social media" penalty falls on them more.
 *  3. Post language follows home region; English posting is more common at
 *     tier-1 colleges.
 *  4. Network overlap with employees, follower reach and professional
 *     portfolios are higher at tier-1 colleges.
 *  5. The vendor's culture-fit model scores minority-faith festival content as
 *     dissimilar to the current workforce, and its attrition model applies the
 *     engagement-post penalty to women (signals S07, S11).
 *
 * The pool shows what the vendor's scoring rules DO to a realistic mix of
 * applicants. It cannot show whether the tool predicts joining — that needs
 * real outcome data, which the vendor has not provided.
 */
import type {
  Applicant,
  Gender,
  LanguageGroup,
  Presence,
  Region,
  ReligionGroup,
} from "@/lib/case/types";

export const POOL_SIZE = 1000;
export const POOL_SEED = 2027;
export const APTITUDE_MEAN = 64;
export const APTITUDE_SD = 10;

/** mulberry32: small, fast, deterministic. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(r: () => number, options: Array<[T, number]>): T {
  const total = options.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of options) {
    x -= w;
    if (x <= 0) return v;
  }
  return options[options.length - 1][0];
}

/** Inverse of the standard normal CDF (Acklam's approximation). */
function probit(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Assign aptitude so every group gets the same spread of scores.
 *
 * Applicants are sorted by their attributes, so each group — and each
 * sub-group within it — is a run of neighbours in that order. Walking the
 * order with a golden-ratio stride hands each run an evenly spread set of
 * quantiles. A random draw would leave a 1,000-person pool with chance gaps of
 * ten points or more between groups, which the test would then report as if
 * the vendor's signals had caused them.
 */
function balanceAptitude(pool: Applicant[]): void {
  const PHI = 0.6180339887498949;
  const presenceOrder: Record<Presence, number> = { active: 0, private: 1, minimal: 2, none: 3 };
  const order = [...pool].sort(
    (x, y) =>
      presenceOrder[x.presence] - presenceOrder[y.presence] ||
      x.collegeTier - y.collegeTier ||
      x.languageGroup.localeCompare(y.languageGroup) ||
      x.region.localeCompare(y.region) ||
      x.religionGroup.localeCompare(y.religionGroup) ||
      x.gender.localeCompare(y.gender) ||
      x.id.localeCompare(y.id)
  );
  order.forEach((a, k) => {
    const u = ((k + 0.5) * PHI) % 1;
    const z = probit(Math.min(0.999, Math.max(0.001, u)));
    a.aptitude = Math.round(Math.max(30, Math.min(98, APTITUDE_MEAN + z * APTITUDE_SD)) * 10) / 10;
  });
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

function makeApplicant(i: number, r: () => number): Applicant {
  const gender: Gender = r() < 0.42 ? "Woman" : "Man";
  const region: Region = pickWeighted<Region>(r, [
    ["South", 35],
    ["North", 25],
    ["East", 20],
    ["West", 15],
    ["Northeast", 5],
  ]);
  const collegeTier = pickWeighted<1 | 2 | 3>(r, [
    [1, 15],
    [2, 40],
    [3, 45],
  ]);
  const religionGroup: ReligionGroup = r() < 0.2 ? "Minority" : "Majority";

  // Assumption 3: language follows region; English more common at tier 1.
  const englishOdds = collegeTier === 1 ? 0.65 : collegeTier === 2 ? 0.4 : 0.25;
  let languageGroup: LanguageGroup;
  if (r() < englishOdds) languageGroup = "English";
  else if (region === "North" || (region === "West" && r() < 0.5) || (region === "East" && r() < 0.3))
    languageGroup = "Hindi / Hinglish";
  else languageGroup = "Other Indian language";

  // Assumption 2: women keep accounts private more often.
  const presence: Presence =
    gender === "Woman"
      ? pickWeighted<Presence>(r, [["active", 45], ["private", 33], ["minimal", 14], ["none", 8]])
      : pickWeighted<Presence>(r, [["active", 66], ["private", 14], ["minimal", 12], ["none", 8]]);
  const visible = presence === "active" ? 1 : presence === "minimal" ? 0.35 : 0;

  // Assumption 1: placeholder; balanceAptitude() assigns the real value.
  const aptitude = 0;

  const v: Record<string, number> = {};
  v.S01 = round2(visible * (r() < 0.45 ? 0.4 + r() * 0.6 : r() * 0.2));
  // English-only text model misreads code-mixed and regional posts.
  const misread = languageGroup === "English" ? 0 : 0.35;
  v.S02 = round2(visible * clamp01((r() < 0.3 ? 0.4 + r() * 0.5 : r() * 0.2) + misread));
  v.S03 = round2(visible * (r() < (collegeTier === 1 ? 0.3 : 0.18) ? 0.7 + r() * 0.3 : 0));
  v.S04 = round2(visible * (r() < (collegeTier === 1 ? 0.35 : collegeTier === 2 ? 0.18 : 0.08) ? 0.6 + r() * 0.4 : 0));
  v.S05 = round2(visible * (r() < 0.3 ? 0.5 + r() * 0.5 : 0));
  v.S06 = round2(visible * (r() < 0.15 ? 0.5 + r() * 0.5 : 0));
  // Assumption 5: minority-faith content scored as dissimilar.
  v.S07 = round2(visible * (religionGroup === "Minority" ? (r() < 0.7 ? 0.6 + r() * 0.4 : 0) : r() < 0.08 ? 0.5 : 0));
  // Assumption 4: reach, network and portfolios track college tier.
  const tierBoost = collegeTier === 1 ? 0.35 : collegeTier === 2 ? 0.15 : 0;
  v.S08 = round2(visible * clamp01(r() * 0.6 + tierBoost));
  v.S09 = round2(
    presence === "none" ? 0 : languageGroup === "English" ? 0.85 + r() * 0.15 : languageGroup === "Hindi / Hinglish" ? 0.3 + r() * 0.2 : 0.05 + r() * 0.15
  );
  v.S10 = round2(clamp01((collegeTier === 1 ? 0.55 : collegeTier === 2 ? 0.25 : 0.08) + r() * 0.25) * (presence === "none" ? 0 : 1));
  // Assumption 5: the attrition penalty is applied to women's engagement posts.
  v.S11 = round2(gender === "Woman" ? (r() < 0.22 ? 0.7 + r() * 0.3 : 0) * Math.max(visible, 0.5) : r() < 0.06 ? 0.4 : 0);
  v.S12 = presence === "none" ? 1 : presence === "private" ? 0.8 : presence === "minimal" ? 0.5 : 0;
  const portfolioOdds = collegeTier === 1 ? 0.8 : collegeTier === 2 ? 0.55 : 0.3;
  v.S13 = round2(r() < portfolioOdds ? 0.5 + r() * 0.5 : 0);

  return {
    id: `A${String(i + 1).padStart(4, "0")}`,
    gender,
    region,
    collegeTier,
    languageGroup,
    religionGroup,
    presence,
    aptitude,
    signalValues: v,
  };
}

let cachedPool: Applicant[] | null = null;

export function applicantPool(): Applicant[] {
  if (cachedPool) return cachedPool;
  const r = rng(POOL_SEED);
  const pool = Array.from({ length: POOL_SIZE }, (_, i) => makeApplicant(i, r));
  balanceAptitude(pool);
  cachedPool = pool;
  return cachedPool;
}
