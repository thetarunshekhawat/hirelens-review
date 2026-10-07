/**
 * Shared shapes for the HireLens Review case file.
 *
 * Everything in the case file is fictional: the company, the vendor, the
 * candidates and their posts. The shapes are what a real review would need,
 * so the engine that reads them would work unchanged on a real dossier.
 */

/* ------------------------------------------------------------------ signals */

/** The six review questions, in the order the method asks them. */
export type CheckId =
  | "job_relevance"
  | "proxy"
  | "identity"
  | "source_expectation"
  | "coverage"
  | "less_intrusive";

export type CheckStatus = "pass" | "concern" | "fail";

/** What the review recommends doing with a signal. */
export type Outcome = "keep" | "restrict" | "remove" | "human";

/** Characteristics a signal can stand in for. */
export type Trait =
  | "religion"
  | "caste"
  | "gender"
  | "marital_status"
  | "health"
  | "political_opinion"
  | "region"
  | "language"
  | "socioeconomic"
  | "college_tier"
  | "age";

export type ProxyStrength = "direct" | "strong" | "weak";

export interface ProxyLink {
  trait: Trait;
  strength: ProxyStrength;
  /** Why this signal tracks the trait, in one sentence. */
  basis: string;
}

/**
 * The facts the review records about one vendor signal. Every check result is
 * derived from these by fixed rules (lib/review/engine.ts) — the facts are the
 * judgement, written down where it can be read and challenged; the rules turn
 * them into results the same way every time.
 */
export interface SignalFacts {
  /** Is what the signal measures linked to doing the job, or to joining? */
  jobLink: "direct" | "indirect" | "none";
  jobLinkReason: string;
  proxies: ProxyLink[];
  /** How often the content behind this signal could belong to someone else. */
  identityRisk: "low" | "medium" | "high";
  identityReason: string;
  /** Who publishes the content the signal reads. */
  source: "self" | "mixed" | "third_party";
  /** Who the candidate posted it for. */
  audience: "professional" | "social";
  sourceReason: string;
  /** Does the signal work equally for everyone? */
  coverage: "even" | "uneven" | "excludes";
  coverageReason: string;
  /** A less intrusive way to learn the same thing, if one exists. */
  alternative: string | null;
  /** True when the alternative answers the same question at least as well. */
  alternativeEquivalent: boolean;
  /** An open legal question only a qualified person can settle. */
  legalQuestion: string | null;
}

export interface VendorSignal {
  id: string;
  /** Short name used across the product. */
  name: string;
  /** What the vendor's documentation says it detects. */
  vendorClaim: string;
  /** Which of the vendor's three outputs the signal feeds. */
  feeds: "reliability" | "culture_fit" | "professionalism";
  /** +1 raises the vendor score when present; -1 lowers it. */
  direction: 1 | -1;
  /** Maximum points the signal can move the vendor score. */
  weight: number;
  facts: SignalFacts;
  /** Library entries that ground the facts above. */
  evidence: string[];
}

/* -------------------------------------------------------------- candidates */

export type Presence = "active" | "private" | "minimal" | "none";

export interface Post {
  id: string;
  platform: "Instagram" | "X" | "Facebook" | "LinkedIn" | "YouTube";
  /** ISO date-time, IST. */
  postedAt: string;
  language: string;
  /** What the post says, translated where needed. */
  text: string;
  /** The original wording, when it was not in English. */
  original?: string;
  /** Who published it. "tagged" means another account posted it and named the candidate. */
  publishedBy: "self" | "tagged";
  /** Vendor signals this post triggered. */
  triggered: string[];
}

export interface Candidate {
  id: string;
  name: string;
  degree: string;
  college: string;
  collegeTier: 1 | 2 | 3;
  city: string;
  state: string;
  graduationYear: number;
  /** The company's own aptitude assessment, out of 100. */
  aptitude: number;
  presence: Presence;
  postLanguage: string;
  /** Facts from the application form — the record the candidate supplied. */
  application: {
    statedLinks: string[];
    notes: string;
  };
  /** The profile the vendor tool attached to this candidate. */
  matchedProfile: {
    displayName: string;
    city: string | null;
    college: string | null;
    graduationYear: number | null;
    /** How the vendor says it made the match. */
    matchBasis: string;
  } | null;
  posts: Post[];
  /** Signal intensities the vendor tool recorded, 0–1, keyed by signal id. */
  signalValues: Record<string, number>;
  /** The one-line story the case review tells. */
  headline: string;
  /** What the review found, in plain language, for the case page. */
  reviewNote: string;
}

/* --------------------------------------------------------------- applicants */

export type Gender = "Woman" | "Man";
export type Region = "North" | "South" | "East" | "West" | "Northeast";
export type LanguageGroup = "English" | "Hindi / Hinglish" | "Other Indian language";
export type ReligionGroup = "Majority" | "Minority";

/** One synthetic applicant in the fairness-test pool. */
export interface Applicant {
  id: string;
  gender: Gender;
  region: Region;
  collegeTier: 1 | 2 | 3;
  languageGroup: LanguageGroup;
  religionGroup: ReligionGroup;
  presence: Presence;
  aptitude: number;
  signalValues: Record<string, number>;
}
