/**
 * The six-question review.
 *
 * Every vendor signal is put through the same six questions, and the answers
 * are turned into one of four outcomes by an ordered list of rules. Nothing
 * here calls a model: the same facts always produce the same result, the
 * assistant reads this output rather than recomputing it, and a reader who
 * disagrees with a result can trace it to a single fact or a single rule.
 */
import { SIGNALS, SIGNAL_BY_ID } from "@/lib/case/signals";
import type {
  CheckId,
  CheckStatus,
  Outcome,
  ProxyLink,
  SignalFacts,
  Trait,
  VendorSignal,
} from "@/lib/case/types";

/* ------------------------------------------------------------- the method */

export const CHECKS: Array<{ id: CheckId; number: number; question: string; short: string }> = [
  { id: "job_relevance", number: 1, question: "Is it related to the job?", short: "Job-related" },
  { id: "proxy", number: 2, question: "Does it stand in for who someone is?", short: "Hidden trait" },
  { id: "identity", number: 3, question: "Is it the right person?", short: "Right person" },
  {
    id: "source_expectation",
    number: 4,
    question: "Did the candidate publish it, and would they expect an employer to use it this way?",
    short: "Fair source",
  },
  { id: "coverage", number: 5, question: "Does it work equally for everyone?", short: "Equal coverage" },
  { id: "less_intrusive", number: 6, question: "Is there a less intrusive way?", short: "Less intrusive" },
];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  keep: "Keep, with conditions",
  restrict: "Restrict",
  remove: "Remove",
  human: "Needs human decision",
};

export const TRAIT_LABEL: Record<Trait, string> = {
  religion: "religion",
  caste: "caste",
  gender: "gender",
  marital_status: "marital status",
  health: "health",
  political_opinion: "political opinion",
  region: "home region",
  language: "language",
  socioeconomic: "family income and background",
  college_tier: "college tier",
  age: "age",
};

/** Traits named by an Indian statute that bars discrimination in private hiring. */
export const STATUTORY_TRAITS: Partial<Record<Trait, string>> = {
  gender: "Code on Wages, 2019 (s.3)",
  health: "RPwD Act 2016 and HIV and AIDS Act 2017, where the condition is a disability or HIV",
};

/* --------------------------------------------------------- the six checks */

export interface CheckResult {
  check: CheckId;
  status: CheckStatus;
  /** One sentence the reader can verify against the facts. */
  reason: string;
}

function jobRelevance(f: SignalFacts): CheckResult {
  const status: CheckStatus =
    f.jobLink === "direct" ? "pass" : f.jobLink === "indirect" ? "concern" : "fail";
  return { check: "job_relevance", status, reason: f.jobLinkReason };
}

function proxy(f: SignalFacts): CheckResult {
  const worst = strongestProxy(f.proxies);
  if (!worst) {
    return { check: "proxy", status: "pass", reason: "No link found to a personal characteristic." };
  }
  const status: CheckStatus = worst.strength === "weak" ? "concern" : "fail";
  const named = f.proxies
    .map((p) => `${TRAIT_LABEL[p.trait]} (${p.strength})`)
    .join(", ");
  return { check: "proxy", status, reason: `Tracks ${named}. ${worst.basis}` };
}

function identity(f: SignalFacts): CheckResult {
  const status: CheckStatus =
    f.identityRisk === "low" ? "pass" : f.identityRisk === "medium" ? "concern" : "fail";
  return { check: "identity", status, reason: f.identityReason };
}

function sourceExpectation(f: SignalFacts): CheckResult {
  let status: CheckStatus;
  if (f.source === "third_party") status = "fail";
  else if (f.source === "mixed") status = "fail";
  else status = f.audience === "professional" ? "pass" : "concern";
  return { check: "source_expectation", status, reason: f.sourceReason };
}

function coverage(f: SignalFacts): CheckResult {
  const status: CheckStatus =
    f.coverage === "even" ? "pass" : f.coverage === "uneven" ? "concern" : "fail";
  return { check: "coverage", status, reason: f.coverageReason };
}

function lessIntrusive(f: SignalFacts): CheckResult {
  if (!f.alternative) {
    return { check: "less_intrusive", status: "pass", reason: "No less intrusive way to learn the same thing was identified." };
  }
  return {
    check: "less_intrusive",
    status: f.alternativeEquivalent ? "fail" : "concern",
    reason: f.alternativeEquivalent
      ? `A less intrusive method answers the same question: ${f.alternative}`
      : `A partial alternative exists: ${f.alternative}`,
  };
}

const ORDER: ProxyLink["strength"][] = ["direct", "strong", "weak"];
function strongestProxy(proxies: ProxyLink[]): ProxyLink | null {
  for (const s of ORDER) {
    const hit = proxies.find((p) => p.strength === s);
    if (hit) return hit;
  }
  return null;
}

export function runChecks(f: SignalFacts): CheckResult[] {
  return [jobRelevance(f), proxy(f), identity(f), sourceExpectation(f), coverage(f), lessIntrusive(f)];
}

/* ----------------------------------------------------------- the rules */

export interface Rule {
  id: string;
  /** Plain statement of the rule, shown on the Method page. */
  text: string;
  outcome: Outcome;
}

/** Applied in order; the first rule that fires decides the outcome. */
export const RULES: Rule[] = [
  {
    id: "R1",
    text: "If a signal stands in strongly or directly for a personal characteristic (question 2 fails), remove it.",
    outcome: "remove",
  },
  {
    id: "R2",
    text: "If a signal has no link to the job or to joining (question 1 fails), remove it.",
    outcome: "remove",
  },
  {
    id: "R3",
    text: "If a signal raises an open legal question, send it to a human decision-maker before any use.",
    outcome: "human",
  },
  {
    id: "R4",
    text: "If a less intrusive method answers the same question (question 6 fails), restrict the signal and use that method instead.",
    outcome: "restrict",
  },
  {
    id: "R5",
    text: "If the signal may read the wrong person, content others posted, or misread some groups (question 3, 4 or 5 fails), restrict it to human review under conditions.",
    outcome: "restrict",
  },
  {
    id: "R6",
    text: "If three or more questions raise concerns, restrict the signal.",
    outcome: "restrict",
  },
  {
    id: "R7",
    text: "Otherwise keep the signal, with a condition for every question that raised a concern.",
    outcome: "keep",
  },
];

function decide(results: CheckResult[], f: SignalFacts): Rule {
  const st = (id: CheckId) => results.find((r) => r.check === id)!.status;
  const fails = results.filter((r) => r.status === "fail").map((r) => r.check);
  const concerns = results.filter((r) => r.status === "concern").length;

  if (st("proxy") === "fail") return RULES[0];
  if (st("job_relevance") === "fail") return RULES[1];
  if (f.legalQuestion) return RULES[2];
  if (st("less_intrusive") === "fail") return RULES[3];
  if (fails.some((c) => c === "identity" || c === "source_expectation" || c === "coverage")) return RULES[4];
  if (concerns >= 3) return RULES[5];
  return RULES[6];
}

/* -------------------------------------------------------- conditions */

/**
 * What must be true for a kept or restricted signal to be used. Derived from
 * the checks that did not pass, so a condition always answers a finding.
 */
function conditionsFor(results: CheckResult[], f: SignalFacts, outcome: Outcome): string[] {
  if (outcome === "remove") return [];
  const out: string[] = [];
  const st = (id: CheckId) => results.find((r) => r.check === id)!.status;

  if (outcome === "human" && f.legalQuestion) {
    out.push("Do not use until the Data Protection Officer and legal counsel have answered the open legal question.");
  }
  if (st("less_intrusive") === "fail" && f.alternative) {
    out.push(`Replace the automated signal with: ${f.alternative}`);
  } else if (st("less_intrusive") === "concern" && f.alternative) {
    out.push(`Prefer the alternative where practical: ${f.alternative}`);
  }
  if (st("identity") !== "pass") {
    out.push("Use only profiles the candidate has linked in their own application.");
  }
  if (st("source_expectation") !== "pass") {
    out.push("Use only content the candidate published themselves; never content others posted or tagged.");
  }
  if (st("coverage") !== "pass") {
    out.push("Absence of content must be treated as neutral, never as a negative.");
  }
  if (st("job_relevance") === "concern") {
    out.push("Must not be scored automatically; a trained person decides whether a specific item is relevant.");
  }
  if (st("proxy") === "concern") {
    out.push("Check selection rates by the groups the signal could track before and after use.");
  }
  out.push("Tell candidates in the application notice that this check is made, and let them respond to any adverse finding.");
  return out;
}

/* ------------------------------------------------------------ results */

export interface SignalReview {
  signal: VendorSignal;
  checks: CheckResult[];
  outcome: Outcome;
  rule: Rule;
  conditions: string[];
}

export function reviewSignal(signal: VendorSignal): SignalReview {
  const checks = runChecks(signal.facts);
  const rule = decide(checks, signal.facts);
  return {
    signal,
    checks,
    outcome: rule.outcome,
    rule,
    conditions: conditionsFor(checks, signal.facts, rule.outcome),
  };
}

let cached: SignalReview[] | null = null;

/** All thirteen reviews, computed once. */
export function reviewAllSignals(): SignalReview[] {
  if (!cached) cached = SIGNALS.map(reviewSignal);
  return cached;
}

export function reviewSignalById(id: string): SignalReview | null {
  const s = SIGNAL_BY_ID[id];
  return s ? reviewSignal(s) : null;
}

export function outcomeCounts(reviews: SignalReview[] = reviewAllSignals()): Record<Outcome, number> {
  const counts: Record<Outcome, number> = { keep: 0, restrict: 0, remove: 0, human: 0 };
  for (const r of reviews) counts[r.outcome] += 1;
  return counts;
}

/** Share of the vendor's total scoring weight carried by removed signals. */
export function removedWeightShare(reviews: SignalReview[] = reviewAllSignals()): number {
  const total = reviews.reduce((a, r) => a + r.signal.weight, 0);
  const removed = reviews
    .filter((r) => r.outcome === "remove")
    .reduce((a, r) => a + r.signal.weight, 0);
  return total === 0 ? 0 : removed / total;
}
