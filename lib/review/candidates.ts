/**
 * Candidate case reviews.
 *
 * For each sample candidate: what the vendor's score was and why, what it
 * becomes once the review's outcomes are applied, and the specific findings —
 * wrong-person matches, content others posted, misread languages, absence
 * penalties — that the six checks surface for this one person.
 *
 * Shortlist lines come from the synthetic pool, so a candidate is judged
 * against the same 1,000 applicants under both configurations.
 */
import { CANDIDATES, CANDIDATE_BY_ID } from "@/lib/case/candidates";
import { SIGNAL_BY_ID } from "@/lib/case/signals";
import type { Candidate, CheckId, Outcome } from "@/lib/case/types";
import { reviewSignalById, OUTCOME_LABEL } from "@/lib/review/engine";
import { shortlist } from "@/lib/review/fairness";
import { applicantPool } from "@/lib/review/pool";
import {
  REVIEWED_CONFIG,
  VENDOR_CONFIG,
  score,
  scoreBreakdown,
  type SignalSet,
} from "@/lib/review/scoring";

export interface CandidateFinding {
  check: CheckId;
  /** "signal" findings come from a signal's outcome; the rest are specific to this candidate's data. */
  kind: "signal" | "identity" | "tagged" | "language" | "absence";
  signalId?: string;
  outcome?: Outcome;
  points?: number;
  text: string;
}

export interface CandidateReview {
  candidate: Candidate;
  vendor: { score: number; cutoff: number; shortlisted: boolean };
  reviewed: { score: number; cutoff: number; shortlisted: boolean };
  breakdown: ReturnType<typeof scoreBreakdown>;
  identity: IdentityCheck;
  findings: CandidateFinding[];
  /** Restricted or held signals that need a person or a direct question for this candidate. */
  followUps: string[];
}

export interface IdentityCheck {
  status: "verified" | "unverified" | "mismatch" | "no_profile";
  matched: number;
  checked: number;
  detail: string;
}

let cutoffs: { vendor: number; reviewed: number } | null = null;

export function shortlistCutoffs() {
  if (!cutoffs) {
    const pool = applicantPool();
    cutoffs = {
      vendor: shortlist(pool, VENDOR_CONFIG).cutoff,
      reviewed: shortlist(pool, REVIEWED_CONFIG).cutoff,
    };
  }
  return cutoffs;
}

/**
 * Does the profile the vendor attached belong to the applicant?
 *
 * Three facts can be compared with the application: city, college and
 * graduation year. A profile linked by the candidate is taken as theirs.
 * A searched-for profile that matches fewer than two of three is a mismatch.
 */
export function checkIdentity(c: Candidate): IdentityCheck {
  const m = c.matchedProfile;
  if (!m) {
    return { status: "no_profile", matched: 0, checked: 0, detail: "No profile was attached." };
  }
  const pairs: Array<[string | number | null, string | number]> = [
    [m.city, c.city],
    [m.college, c.college],
    [m.graduationYear, c.graduationYear],
  ];
  const checked = pairs.filter(([a]) => a !== null).length;
  const matched = pairs.filter(([a, b]) => a !== null && String(a).toLowerCase() === String(b).toLowerCase()).length;
  const linked = c.application.statedLinks.length > 0 && /supplied/i.test(m.matchBasis);

  if (linked) {
    return { status: "verified", matched, checked, detail: "The profile was linked by the candidate in the application." };
  }
  if (checked > 0 && matched < 2) {
    return {
      status: "mismatch",
      matched,
      checked,
      detail:
        `The attached profile matches ${matched} of ${checked} details in the application ` +
        `(found by: ${m.matchBasis}). It very likely belongs to someone else.`,
    };
  }
  return {
    status: "unverified",
    matched,
    checked,
    detail: `Found by ${m.matchBasis}; matches ${matched} of ${checked} details but was not confirmed by the candidate.`,
  };
}

export function reviewCandidate(c: Candidate, enabledVendor: SignalSet = VENDOR_CONFIG): CandidateReview {
  const { vendor: vendorCut, reviewed: reviewedCut } = shortlistCutoffs();
  const vendorScore = score(c.aptitude, c.signalValues, enabledVendor);
  const reviewedScore = score(c.aptitude, c.signalValues, REVIEWED_CONFIG);
  const breakdown = scoreBreakdown(c.signalValues, enabledVendor);
  const identity = checkIdentity(c);
  const findings: CandidateFinding[] = [];
  const followUps: string[] = [];

  // Candidate-specific findings first: they are the reason this case is in the file.
  if (identity.status === "mismatch") {
    findings.push({ check: "identity", kind: "identity", text: identity.detail });
  }
  const tagged = c.posts.filter((p) => p.publishedBy === "tagged" && p.triggered.length > 0);
  for (const p of tagged) {
    findings.push({
      check: "source_expectation",
      kind: "tagged",
      text:
        `A ${p.platform} post that triggered ${p.triggered.map((id) => SIGNAL_BY_ID[id]?.name ?? id).join(", ")} ` +
        `was published by someone else who tagged the candidate. The DPDP public-data exemption covers only what ` +
        `a person makes public themselves.`,
    });
  }
  const misread = c.posts.filter((p) => p.language !== "English" && p.triggered.includes("S02"));
  if (misread.length > 0) {
    findings.push({
      check: "coverage",
      kind: "language",
      text:
        `${misread.length} post${misread.length > 1 ? "s" : ""} in ${[...new Set(misread.map((p) => p.language))].join(" and ")} ` +
        `were scored by an English-only language model.`,
    });
  }
  if ((c.signalValues.S12 ?? 0) > 0) {
    findings.push({
      check: "coverage",
      kind: "absence",
      text:
        c.presence === "none"
          ? "The candidate does not use social media. The tool scored the absence of data as a risk."
          : "The candidate's account is private. The tool scored what it could not see as a risk.",
    });
  }

  // Then every signal that moved this candidate's score, with the review's outcome.
  for (const b of [...breakdown].sort((x, y) => Math.abs(y.points) - Math.abs(x.points))) {
    const r = reviewSignalById(b.id);
    if (!r) continue;
    findings.push({
      check: r.rule.id === "R1" ? "proxy" : r.rule.id === "R2" ? "job_relevance" : "less_intrusive",
      kind: "signal",
      signalId: b.id,
      outcome: r.outcome,
      points: b.points,
      text: `${b.name} moved the score by ${b.points > 0 ? "+" : ""}${b.points}. Review outcome: ${OUTCOME_LABEL[r.outcome]} (${r.rule.id}).`,
    });
    if (r.outcome === "restrict" || r.outcome === "human") {
      followUps.push(...r.conditions.slice(0, 1).map((cond) => `${b.name}: ${cond}`));
    }
  }

  return {
    candidate: c,
    vendor: { score: vendorScore, cutoff: vendorCut, shortlisted: vendorScore >= vendorCut },
    reviewed: { score: reviewedScore, cutoff: reviewedCut, shortlisted: reviewedScore >= reviewedCut },
    breakdown,
    identity,
    findings,
    followUps,
  };
}

export function reviewCandidateById(id: string): CandidateReview | null {
  const c = CANDIDATE_BY_ID[id];
  return c ? reviewCandidate(c) : null;
}

export function reviewAllCandidates(): CandidateReview[] {
  return CANDIDATES.map((c) => reviewCandidate(c));
}
