/**
 * The agent's tools.
 *
 * The agent decides what to look at, in what order, and what it means. The
 * tools do the parts that must not depend on generated language: they read the
 * case file, apply the six checks and the outcome rules, score candidates, run
 * the fairness test and search the approved library. Every number and every
 * outcome the agent reports comes back from one of these calls.
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { CANDIDATES } from "@/lib/case/candidates";
import {
  COMPANY,
  DECISION_OWNERS,
  PROBLEM,
  PROPOSAL,
  VENDOR,
  VENDOR_DOCUMENTS,
} from "@/lib/case/dossier";
import { SIGNALS } from "@/lib/case/signals";
import type { SignalFacts, Trait } from "@/lib/case/types";
import { LIBRARY_BY_ID } from "@/lib/library/entries";
import { searchLibrary } from "@/lib/library/search";
import { reviewCandidateById, reviewAllCandidates } from "@/lib/review/candidates";
import { buildDecisionSheet, RECOMMENDATION_LABEL } from "@/lib/review/decision";
import {
  CHECKS,
  OUTCOME_LABEL,
  RULES,
  reviewAllSignals,
  reviewSignal,
  reviewSignalById,
} from "@/lib/review/engine";
import { runFairnessTest } from "@/lib/review/fairness";
import { REVIEWED_CONFIG, VENDOR_CONFIG } from "@/lib/review/scoring";
import { MAX_LIBRARY_SEARCHES } from "@/config";
import type { UISource } from "@/types/data";

/** Collector callback: a cited source plus the text the model saw (for claim verification). */
export type CollectSource = (s: UISource, content?: string) => void;

const TRAITS = [
  "religion",
  "caste",
  "gender",
  "marital_status",
  "health",
  "political_opinion",
  "region",
  "language",
  "socioeconomic",
  "college_tier",
  "age",
] as const satisfies readonly Trait[];

const SIGNAL_IDS = SIGNALS.map((s) => s.id) as [string, ...string[]];
const CANDIDATE_IDS = CANDIDATES.map((c) => c.id) as [string, ...string[]];

function compactSignalReview(id: string) {
  const r = reviewSignalById(id);
  if (!r) return null;
  return {
    id: r.signal.id,
    name: r.signal.name,
    vendorClaim: r.signal.vendorClaim,
    weight: `${r.signal.direction > 0 ? "+" : "-"}${r.signal.weight} points`,
    checks: r.checks.map((c) => ({
      question: CHECKS.find((q) => q.id === c.check)!.question,
      status: c.status,
      reason: c.reason,
    })),
    outcome: OUTCOME_LABEL[r.outcome],
    ruleApplied: `${r.rule.id}: ${r.rule.text}`,
    conditions: r.conditions,
    openLegalQuestion: r.signal.facts.legalQuestion,
    evidenceIds: r.signal.evidence,
  };
}

export function buildToolSet(collect: CollectSource = () => {}): ToolSet {
  return {
    getCaseFile: tool({
      description:
        "Read the case file: the company, its hiring problem, the vendor tool and its claims, the proposal, who owns the decision, and which vendor documents were received or are missing. Call this first in any full review.",
      inputSchema: z.object({}),
      execute: async () => ({
        company: COMPANY,
        problem: PROBLEM,
        vendor: VENDOR,
        proposal: PROPOSAL,
        decisionOwners: DECISION_OWNERS,
        vendorDocuments: VENDOR_DOCUMENTS,
        signals: SIGNALS.map((s) => ({ id: s.id, name: s.name, feeds: s.feeds, vendorClaim: s.vendorClaim })),
        candidates: CANDIDATES.map((c) => ({ id: c.id, name: c.name, headline: c.headline })),
        note: "All names in the case file are fictional.",
      }),
    }),

    getSignalReview: tool({
      description:
        "Apply the six review questions and the outcome rules to one vendor signal, or to all thirteen when no id is given. Returns each check's status and reason, the outcome (keep / restrict / remove / needs human decision), the rule that decided it, and the conditions for any use. The result is computed by fixed rules; report it, do not recompute it.",
      inputSchema: z.object({
        signalId: z.enum(SIGNAL_IDS).optional().describe("Signal id, S01 to S13. Omit for all signals."),
      }),
      execute: async ({ signalId }) => {
        if (signalId) return compactSignalReview(signalId);
        return reviewAllSignals().map((r) => ({
          id: r.signal.id,
          name: r.signal.name,
          outcome: OUTCOME_LABEL[r.outcome],
          rule: r.rule.id,
          failedChecks: r.checks.filter((c) => c.status === "fail").map((c) => c.check),
          concerns: r.checks.filter((c) => c.status === "concern").map((c) => c.check),
        }));
      },
    }),

    getCandidateReview: tool({
      description:
        "Open a sample candidate's case review: vendor score and shortlist outcome, score after the review, the identity check on the matched profile, and findings such as content posted by others, posts misread by an English-only model, or penalties for having no social media. Omit the id for a one-line summary of all nine candidates.",
      inputSchema: z.object({
        candidateId: z.enum(CANDIDATE_IDS).optional(),
      }),
      execute: async ({ candidateId }) => {
        if (!candidateId) {
          return reviewAllCandidates().map((r) => ({
            id: r.candidate.id,
            name: r.candidate.name,
            vendorScore: r.vendor.score,
            vendorShortlisted: r.vendor.shortlisted,
            reviewedScore: r.reviewed.score,
            reviewedShortlisted: r.reviewed.shortlisted,
            headline: r.candidate.headline,
          }));
        }
        const r = reviewCandidateById(candidateId);
        if (!r) return { error: "Unknown candidate." };
        const c = r.candidate;
        return {
          name: c.name,
          profile: `${c.degree}, ${c.college} (tier ${c.collegeTier}), ${c.city}, ${c.state}, graduating ${c.graduationYear}`,
          aptitude: c.aptitude,
          socialPresence: c.presence,
          applicationNotes: c.application.notes,
          posts: c.posts.map((p) => ({
            platform: p.platform,
            postedAt: p.postedAt,
            language: p.language,
            text: p.text,
            original: p.original,
            publishedBy: p.publishedBy,
            triggered: p.triggered,
          })),
          vendor: r.vendor,
          afterReview: r.reviewed,
          scoreBreakdown: r.breakdown,
          identityCheck: r.identity,
          findings: r.findings.map((f) => f.text),
          followUps: r.followUps,
          reviewNote: c.reviewNote,
        };
      },
    }),

    runFairnessTest: tool({
      description:
        "Run the fairness test on 1,000 synthetic applicants: shortlist the top half under a configuration, then compare selection rates by gender, college tier, language of posts, home region, religion and social-media presence. Groups whose impact ratio is below 0.80 are flagged; groups under 15 people are not judged. 'vendor' = every signal on; 'reviewed' = the configuration left after the review; 'custom' = vendor configuration minus the listed signals.",
      inputSchema: z.object({
        configuration: z.enum(["vendor", "reviewed", "custom"]),
        disabledSignals: z.array(z.enum(SIGNAL_IDS)).optional(),
      }),
      execute: async ({ configuration, disabledSignals }) => {
        const enabled =
          configuration === "vendor"
            ? VENDOR_CONFIG
            : configuration === "reviewed"
              ? REVIEWED_CONFIG
              : new Set([...VENDOR_CONFIG].filter((id) => !(disabledSignals ?? []).includes(id)));
        const r = runFairnessTest(enabled);
        return {
          configuration,
          signalsInScore: [...enabled],
          shortlisted: `${r.shortlisted} of ${r.poolSize}`,
          flagged: r.flaggedAttributes,
          byAttribute: r.attributes.map((a) => ({
            attribute: a.label,
            worstImpactRatio: a.worstRatio,
            groups: a.groups.map((g) => `${g.group}: ${Math.round(g.rate * 100)}% selected (n=${g.n}, ratio ${g.ratio}${g.tooSmall ? ", too small to judge" : ""})`),
          })),
          limits:
            "Synthetic pool built on stated assumptions. Shows what the scoring rules do, not whether the tool predicts joining; that needs outcome data the vendor has not provided.",
        };
      },
    }),

    searchEvidenceLibrary: tool({
      description: `Search the approved evidence library: Indian law (DPDP Act and Rules, Puttaswamy, anti-discrimination statutes), reference standards from other jurisdictions, research and precedents. Cite results inline using their exact url. At most ${MAX_LIBRARY_SEARCHES} searches per answer.`,
      inputSchema: z.object({
        query: z.string().min(2).max(300).describe("What to look for, in plain words."),
      }),
      execute: async ({ query }) => {
        const hits = searchLibrary(query, 4);
        for (const { entry } of hits) {
          collect(
            { kind: "kb", title: entry.title, url: entry.url, site: entry.kind },
            [entry.title, entry.summary, ...entry.keyPoints, entry.caveat ?? ""].join("\n")
          );
        }
        if (hits.length === 0) return { results: [], note: "Nothing in the approved library matches. Say so; do not answer from memory as if it were sourced." };
        return {
          results: hits.map(({ entry }) => ({
            title: entry.title,
            url: entry.url,
            kind: entry.kind,
            authority:
              entry.authority === "binding"
                ? "Indian law: governs Kestrel"
                : entry.authority === "reference"
                  ? "Reference only: not binding in India"
                  : "Evidence",
            citation: entry.citation,
            summary: entry.summary,
            keyPoints: entry.keyPoints,
            caveat: entry.caveat,
          })),
        };
      },
    }),

    getEvidenceForSignal: tool({
      description: "Fetch the library entries the review recorded as grounding for a specific signal.",
      inputSchema: z.object({ signalId: z.enum(SIGNAL_IDS) }),
      execute: async ({ signalId }) => {
        const s = SIGNALS.find((x) => x.id === signalId)!;
        return s.evidence
          .map((id) => LIBRARY_BY_ID[id])
          .filter(Boolean)
          .map((entry) => {
            collect(
              { kind: "kb", title: entry.title, url: entry.url, site: entry.kind },
              [entry.title, entry.summary, ...entry.keyPoints].join("\n")
            );
            return { title: entry.title, url: entry.url, authority: entry.authority, summary: entry.summary, caveat: entry.caveat };
          });
      },
    }),

    assessNewSignal: tool({
      description:
        "Review a signal that is NOT in the vendor's list — for example one a user proposes. You supply the facts (your judgement); the fixed rules then apply the six checks and decide the outcome. Your facts are recorded as agent-assessed and must be confirmed by a person.",
      inputSchema: z.object({
        name: z.string().min(2).max(80),
        whatItMeasures: z.string().min(5).max(400),
        jobLink: z.enum(["direct", "indirect", "none"]),
        jobLinkReason: z.string().max(400),
        proxies: z
          .array(
            z.object({
              trait: z.enum(TRAITS),
              strength: z.enum(["direct", "strong", "weak"]),
              basis: z.string().max(300),
            })
          )
          .max(6),
        identityRisk: z.enum(["low", "medium", "high"]),
        identityReason: z.string().max(300),
        source: z.enum(["self", "mixed", "third_party"]),
        audience: z.enum(["professional", "social"]),
        sourceReason: z.string().max(300),
        coverage: z.enum(["even", "uneven", "excludes"]),
        coverageReason: z.string().max(300),
        alternative: z.string().max(300).nullable(),
        alternativeEquivalent: z.boolean(),
        legalQuestion: z.string().max(400).nullable(),
      }),
      execute: async (input) => {
        const facts: SignalFacts = {
          jobLink: input.jobLink,
          jobLinkReason: input.jobLinkReason,
          proxies: input.proxies,
          identityRisk: input.identityRisk,
          identityReason: input.identityReason,
          source: input.source,
          audience: input.audience,
          sourceReason: input.sourceReason,
          coverage: input.coverage,
          coverageReason: input.coverageReason,
          alternative: input.alternative,
          alternativeEquivalent: input.alternativeEquivalent,
          legalQuestion: input.legalQuestion,
        };
        const r = reviewSignal({
          id: "NEW",
          name: input.name,
          vendorClaim: input.whatItMeasures,
          feeds: "reliability",
          direction: -1,
          weight: 0,
          facts,
          evidence: [],
        });
        return {
          name: input.name,
          checks: r.checks.map((c) => ({ check: c.check, status: c.status, reason: c.reason })),
          outcome: OUTCOME_LABEL[r.outcome],
          ruleApplied: `${r.rule.id}: ${r.rule.text}`,
          conditions: r.conditions,
          status: "Agent-assessed facts. A person must confirm the facts before this outcome is relied on.",
        };
      },
    }),

    recordHandoff: tool({
      description:
        "Formally hand a matter to a human decision-maker. Use this whenever something is outside your authority: a legal interpretation, a business judgement, a final approval, or a fact you cannot verify. State who must decide, the exact question, and why you cannot.",
      inputSchema: z.object({
        owner: z.enum(["Data Protection Officer", "Head of Talent Acquisition", "Legal counsel", "Both decision owners"]),
        question: z.string().min(10).max(400),
        whyNotTheAgent: z.string().min(10).max(300),
        evidenceSoFar: z.string().max(400).optional(),
      }),
      execute: async ({ owner, question }) => ({
        recorded: true,
        owner,
        question,
        note: "Recorded on the decision sheet as an open item. The agent will not decide this.",
      }),
    }),

    getDecisionRules: tool({
      description:
        "Apply the fixed decision rules to the review's findings and return the recommendation they produce, the rationale, the uses the review would permit instead, the documented gaps, and the decisions reserved for humans. Call this before writing a recommendation.",
      inputSchema: z.object({}),
      execute: async () => {
        const d = buildDecisionSheet();
        return {
          recommendation: RECOMMENDATION_LABEL[d.recommendation],
          headline: d.headline,
          rationale: d.rationale,
          permittedUse: d.permittedUse,
          gaps: d.gaps,
          humanDecisions: d.humanDecisions,
          decisionRules: [
            "D1. If removed signals carry more than half the scoring weight, the vendor configuration fails the fairness test, or no signal survives in the automated score: do not adopt as proposed.",
            "D2. Otherwise, without a validation study: pilot with safeguards only.",
            "D3. Otherwise: adopt with conditions.",
          ],
          outcomeRules: RULES.map((r) => `${r.id}: ${r.text}`),
        };
      },
    }),
  };
}
