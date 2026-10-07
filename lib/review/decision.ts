/**
 * The decision sheet: the review's recommendation, built from its findings.
 *
 * The recommendation is chosen by fixed rules over the signal review, the
 * fairness test and the vendor's documents, so it moves only when one of those
 * moves. It is a recommendation to two named people, never a decision: the
 * sheet ends with what only they can decide, and a place to record it.
 */
import { DECISION_OWNERS, VENDOR, VENDOR_DOCUMENTS, COMPANY } from "@/lib/case/dossier";
import { SIGNALS } from "@/lib/case/signals";
import {
  OUTCOME_LABEL,
  outcomeCounts,
  removedWeightShare,
  reviewAllSignals,
  type SignalReview,
} from "@/lib/review/engine";
import { runFairnessTest } from "@/lib/review/fairness";
import { REVIEWED_CONFIG, VENDOR_CONFIG } from "@/lib/review/scoring";

export type Recommendation = "do_not_adopt" | "adopt_with_conditions" | "pilot_with_safeguards";

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  do_not_adopt: "Do not adopt as proposed",
  adopt_with_conditions: "Adopt with conditions",
  pilot_with_safeguards: "Pilot with safeguards",
};

export interface DecisionGap {
  area: "Vendor evidence" | "Modelling assumption" | "Legal question" | "Conflicting evidence";
  text: string;
}

export interface DecisionSheet {
  recommendation: Recommendation;
  headline: string;
  rationale: string[];
  /** What the review lets Kestrel do instead, so the answer is not only "no". */
  permittedUse: string[];
  signalTable: Array<{ id: string; name: string; outcome: string; reason: string }>;
  gaps: DecisionGap[];
  humanDecisions: Array<{ owner: string; decision: string }>;
  candidateNotice: string;
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function buildDecisionSheet(): DecisionSheet {
  const reviews = reviewAllSignals();
  const counts = outcomeCounts(reviews);
  const removedShare = removedWeightShare(reviews);
  const vendorFair = runFairnessTest(VENDOR_CONFIG);
  const reviewedFair = runFairnessTest(REVIEWED_CONFIG);
  const validationMissing = VENDOR_DOCUMENTS.some((d) => /validation/i.test(d.item) && d.status === "missing");
  const automatedSignalsLeft = REVIEWED_CONFIG.size;

  /*
   * Decision rules, in order:
   *  D1. If more than half of the vendor's scoring weight sits in removed
   *      signals, or the vendor configuration fails the fairness test, the tool
   *      cannot be used as proposed.
   *  D2. If, after the review, no signal remains in the automated score, there
   *      is nothing left to adopt as a scoring tool.
   *  D3. If there is no validation study, no use may rank or reject candidates.
   *  Otherwise: with flags cleared and validation present, adopt with
   *  conditions; with flags cleared but no validation, pilot with safeguards.
   */
  let recommendation: Recommendation;
  if (removedShare > 0.5 || vendorFair.flaggedAttributes.length > 0 || automatedSignalsLeft === 0) {
    recommendation = "do_not_adopt";
  } else if (validationMissing) {
    recommendation = "pilot_with_safeguards";
  } else {
    recommendation = "adopt_with_conditions";
  }

  const rationale: string[] = [
    `${counts.remove} of ${SIGNALS.length} signals fail the review and must be removed; they carry ${pct(removedShare)} of the tool's scoring weight.`,
    `Under the vendor's configuration, ${vendorFair.flaggedAttributes.length} group comparisons fall below the 0.80 impact-ratio line: ${vendorFair.flaggedAttributes.join(", ").toLowerCase()}.`,
    `After the review, no signal is left in the automated score. Shortlisting falls back to Kestrel's own aptitude test, and ${reviewedFair.flaggedAttributes.length === 0 ? "no group falls below the line" : `${reviewedFair.flaggedAttributes.length} groups still fall below the line`}.`,
    validationMissing
      ? `The vendor has not provided a validation study, so the claim of "${VENDOR.claimedAccuracy}" cannot be checked. There is no evidence the tool predicts joining or retention.`
      : "The vendor has provided a validation study.",
    `${counts.human} signal raises a legal question only Kestrel's counsel and Data Protection Officer can answer.`,
  ];

  const permittedUse = [
    "Ask every candidate directly about further-study plans and joining date at offer stage, and record the answer. This replaces the higher-studies signal, which addresses Kestrel's real problem: offers accepted and not taken up.",
    "Verify claimed projects and skills against LinkedIn or GitHub links the candidate supplies, as a pass-or-query check by a person. Never rank on it, and never penalise a candidate without a portfolio.",
    "If Kestrel wants a conduct check, a trained person may review only content the candidate published themselves that shows explicit threats, harassment or hate, in a language they understand, with the candidate given the chance to respond.",
    "Hold the competing-offers signal until the Data Protection Officer and counsel have decided whether it may be used at all.",
  ];

  const signalTable = reviews.map((r: SignalReview) => ({
    id: r.signal.id,
    name: r.signal.name,
    outcome: OUTCOME_LABEL[r.outcome],
    reason: r.rule.text,
  }));

  const gaps: DecisionGap[] = [
    ...VENDOR_DOCUMENTS.filter((d) => d.status !== "received").map((d) => ({
      area: "Vendor evidence" as const,
      text: `${d.item} (${d.status}): ${d.why}`,
    })),
    {
      area: "Modelling assumption",
      text:
        "The fairness test uses 1,000 synthetic applicants built on stated assumptions. It shows what the scoring rules do to a realistic mix of people, not what happened to real applicants.",
    },
    {
      area: "Modelling assumption",
      text:
        "The review assumes Kestrel's aptitude test treats all groups equally. That test was not audited here; if it is biased, falling back to it inherits that bias.",
    },
    ...reviews
      .filter((r) => r.signal.facts.legalQuestion)
      .map((r) => ({ area: "Legal question" as const, text: `${r.signal.name}: ${r.signal.facts.legalQuestion}` })),
    {
      area: "Legal question",
      text:
        "Whether the DPDP exemption for publicly available data covers a vendor's bulk collection of candidates' posts for scoring is untested.",
    },
    {
      area: "Conflicting evidence",
      text:
        "One small study (Kluemper et al., 2012) found trained raters' Facebook personality ratings correlated with job performance; a larger one (Van Iddekinge et al., 2016) found no link. Neither validates this vendor's signals.",
    },
  ];

  const humanDecisions = [
    {
      owner: DECISION_OWNERS[0].role,
      decision: "Whether 'culture fit' should be scored at all for campus hires, and whether the offer-stage conversation is an acceptable substitute for prediction.",
    },
    {
      owner: DECISION_OWNERS[1].role,
      decision: "Whether any collection of candidates' social media is lawful under the DPDP Act, including the open question on the competing-offers signal.",
    },
    {
      owner: "Both, jointly",
      decision: "The final decision on the proposal, recorded below with names, date and reasons.",
    },
  ];

  const candidateNotice =
    `${COMPANY.name}: how we check applications\n\n` +
    "If you give us links to your LinkedIn or GitHub profile, a member of our recruitment team may look at them to " +
    "confirm the projects and skills you describe. We will not look at your other social media, and we will not use " +
    "posts that other people have published about you.\n\n" +
    "Not having these profiles will never count against you.\n\n" +
    "At offer stage we will ask you about your joining date and any plans for further study, so we can plan your " +
    "training place. Your answer will not affect an offer already made.\n\n" +
    "If anything we see raises a question, we will ask you about it before making any decision. You can ask us what " +
    "we looked at, ask us to correct it, or withdraw your consent, by writing to privacy@kestrel.example. You may " +
    "also complain to the Data Protection Board of India.";

  return {
    recommendation,
    headline:
      recommendation === "do_not_adopt"
        ? `${RECOMMENDATION_LABEL.do_not_adopt}. ${VENDOR.product} should not be used to score or shortlist campus applicants.`
        : RECOMMENDATION_LABEL[recommendation],
    rationale,
    permittedUse,
    signalTable,
    gaps,
    humanDecisions,
    candidateNotice,
  };
}
