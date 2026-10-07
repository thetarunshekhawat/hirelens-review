import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AgentRun } from "@/components/agent/agent-run";
import { Callout, Stat } from "@/components/review/ui";
import { COMPANY, DECISION_OWNERS, PROBLEM, PROPOSAL, VENDOR, VENDOR_DOCUMENTS } from "@/lib/case/dossier";
import { SIGNALS } from "@/lib/case/signals";
import { reviewAllCandidates } from "@/lib/review/candidates";
import { buildDecisionSheet, RECOMMENDATION_LABEL } from "@/lib/review/decision";
import { outcomeCounts, removedWeightShare } from "@/lib/review/engine";
import { runFairnessTest } from "@/lib/review/fairness";
import { REVIEWED_CONFIG, VENDOR_CONFIG } from "@/lib/review/scoring";

const LAYERS = [
  {
    name: "Quality controls",
    what: "Automated tests on every rule and number, a documented test log, and a named human sign-off on the decision sheet.",
  },
  {
    name: "Reliable execution",
    what: "Scores, outcomes, selection rates and the recommendation come from fixed rules in code. The agent calls them; it never invents them.",
  },
  {
    name: "Enterprise context",
    what: "The case file, the vendor's documents, and an approved library led by Indian law: the DPDP Act and Rules, the Code on Wages, and Puttaswamy.",
  },
  {
    name: "Domain method",
    what: "Six questions every signal must answer, seven outcome rules, three decision rules, and explicit points where a person must decide.",
  },
  {
    name: "General model capability",
    what: "The agent plans the review, reads the evidence, explains it in plain language, and drafts the memo.",
  },
];

export default function OverviewPage() {
  const counts = outcomeCounts();
  const removedShare = removedWeightShare();
  const vendorFair = runFairnessTest(VENDOR_CONFIG);
  const reviewedFair = runFairnessTest(REVIEWED_CONFIG);
  const candidates = reviewAllCandidates();
  const flipped = candidates.filter((c) => c.vendor.shortlisted !== c.reviewed.shortlisted).length;
  const missingDocs = VENDOR_DOCUMENTS.filter((d) => d.status !== "received").length;
  const decision = buildDecisionSheet();

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* The question */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <div className="hl-eyebrow mb-2">Governance review · Information appropriateness and consent</div>
          <h1 className="hl-h1">Should {COMPANY.shortName} screen campus applicants using their social media?</h1>
          <p className="hl-lede mt-3">
            {PROBLEM.statement} The proposal is to buy <strong>{VENDOR.product}</strong>, which{" "}
            {VENDOR.pitch.charAt(0).toLowerCase() + VENDOR.pitch.slice(1)} HireLens Review is the agent that examines
            whether that information is suitable, representative and properly used for this purpose, and tells the
            decision owners what it found.
          </p>
        </div>
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow mb-2">Decision owners</div>
          <ul className="space-y-3 text-[13.5px]">
            {DECISION_OWNERS.map((o) => (
              <li key={o.role}>
                <div className="font-semibold">{o.role}</div>
                <div className="text-subtle">{o.owns}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-3 text-[12.5px] text-subtle">
            Proposal: {PROPOSAL.intendedUse} Volume: {PROPOSAL.volume}.
          </div>
        </div>
      </section>

      {/* The agent */}
      <AgentRun />

      {/* Headline result */}
      <section className="hl-panel-brand px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">Review result</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
            {RECOMMENDATION_LABEL[decision.recommendation]}
          </span>
        </div>
        <p className="mt-3 max-w-3xl font-serif text-lg leading-snug sm:text-xl">{decision.headline}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/decision" className="hl-btn hl-btn--sm bg-white text-brand hover:bg-white/90">
            Open the decision sheet <ArrowRight className="size-3.5" />
          </Link>
          <Link href="/method" className="hl-btn hl-btn--sm border border-white/30 text-white hover:bg-white/10">
            How it was decided
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat value={`${counts.remove} of ${SIGNALS.length}`} label={`signals removed, carrying ${Math.round(removedShare * 100)}% of the tool's scoring weight`} tone="remove" />
        <Stat value={`${vendorFair.flaggedAttributes.length} → ${reviewedFair.flaggedAttributes.length}`} label="groups below the 0.80 selection-rate line, before and after the review" />
        <Stat value={`${flipped} of ${candidates.length}`} label="sample candidates whose shortlist outcome the tool would have changed" tone="human" />
        <Stat value={`${missingDocs} of ${VENDOR_DOCUMENTS.length}`} label="vendor documents missing or incomplete, including any proof the tool works" />
      </section>

      {/* How the agent is built */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="hl-eyebrow mb-1">How the agent is built</div>
            <h2 className="hl-h2">Five layers, from the model up</h2>
          </div>
          <Link href="/method" className="hl-link text-[13px]">
            Method and limits in full
          </Link>
        </div>
        <ol className="grid gap-2">
          {LAYERS.map((l, i) => (
            <li
              key={l.name}
              className="hl-card grid gap-1 px-4 py-3 sm:grid-cols-[32px_200px_1fr] sm:gap-4"
            >
              <div className="hl-num hidden text-[13px] text-subtle sm:block">{LAYERS.length - i}</div>
              <div className="text-[13.5px] font-semibold text-brand">{l.name}</div>
              <div className="text-[13.5px] text-ink/85">{l.what}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* Workspace */}
      <section>
        <div className="hl-eyebrow mb-1">The agent&rsquo;s workspace</div>
        <h2 className="hl-h2 mb-4">Check the agent&rsquo;s work</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/signals", t: "Signals", d: "All thirteen signals through the six questions, with the rule that decided each." },
            { href: "/candidates", t: "Candidates", d: "Nine sample cases: wrong person, tagged posts, misread languages, absence penalties." },
            { href: "/fairness", t: "Fairness test", d: "Selection rates by group across 1,000 synthetic applicants. Switch signals on and off." },
            { href: "/evidence", t: "Evidence", d: "Indian law first, then reference standards, research and precedent." },
            { href: "/decision", t: "Decision sheet", d: "The recommendation, the gaps, the human decisions, and the sign-off." },
            { href: "/method", t: "Method and limits", d: "What the agent may and may not do, and what this review cannot show." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="hl-card hl-card--pad group block transition-colors hover:border-brand/40">
              <div className="flex items-center justify-between">
                <div className="hl-h3">{c.t}</div>
                <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-1 text-[13px] leading-snug text-subtle">{c.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <Callout title="This is a recommendation, not a decision">
        The agent reviews, explains and recommends. The proposal is approved or rejected only by the{" "}
        {DECISION_OWNERS.map((o) => o.role).join(" and the ")}, recorded on the decision sheet.
      </Callout>
    </div>
  );
}
