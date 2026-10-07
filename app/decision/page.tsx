import Link from "next/link";
import type { Metadata } from "next";
import { AskButton } from "@/components/agent/ask-button";
import { SignOff } from "@/components/review/sign-off";
import { PageHeader } from "@/components/review/ui";
import { PROPOSAL } from "@/lib/case/dossier";
import { buildDecisionSheet, RECOMMENDATION_LABEL } from "@/lib/review/decision";

export const metadata: Metadata = { title: "Decision sheet" };

const AREA_ORDER = ["Vendor evidence", "Conflicting evidence", "Legal question", "Modelling assumption"] as const;
const AREA_LABEL: Record<(typeof AREA_ORDER)[number], string> = {
  "Vendor evidence": "Missing",
  "Conflicting evidence": "Conflicting",
  "Legal question": "Unclear or outside the agent's authority",
  "Modelling assumption": "Limits of this review",
};

export default function DecisionPage() {
  const d = buildDecisionSheet();

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Decision sheet" title={PROPOSAL.title}>
        <div className="mt-4 flex flex-wrap gap-2">
          <AskButton question="Summarise this decision sheet for the two decision owners in under 150 words.">
            Ask the agent for a summary
          </AskButton>
        </div>
      </PageHeader>

      <section className="hl-panel-brand px-5 py-5 sm:px-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">Recommendation</div>
        <div className="mt-1 font-serif text-2xl">{RECOMMENDATION_LABEL[d.recommendation]}</div>
        <p className="mt-2 max-w-3xl text-[15px] opacity-90">{d.headline}</p>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Why</h2>
        <ul className="hl-card hl-card--pad list-disc space-y-2 pl-8 text-[14px] leading-relaxed">
          {d.rationale.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">What Kestrel can do instead</h2>
        <p className="mb-3 text-[13.5px] text-subtle">
          The review does not leave Kestrel without an answer to its problem. These uses pass the six questions.
        </p>
        <ol className="hl-card hl-card--pad list-decimal space-y-2 pl-8 text-[14px] leading-relaxed">
          {d.permittedUse.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Signal outcomes</h2>
        <div className="hl-card hl-scroll-x">
          <table className="hl-table">
            <tbody>
              {d.signalTable.map((s) => (
                <tr key={s.id}>
                  <td className="hl-num w-12 text-subtle">{s.id}</td>
                  <td>
                    <Link href={`/signals/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap font-medium">{s.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Gaps and limits</h2>
        <div className="grid gap-4">
          {AREA_ORDER.map((area) => {
            const items = d.gaps.filter((g) => g.area === area);
            if (items.length === 0) return null;
            return (
              <div key={area} className="hl-card hl-card--pad">
                <div className="hl-eyebrow mb-2">{AREA_LABEL[area]}</div>
                <ul className="list-disc space-y-1.5 pl-4 text-[13.5px] leading-relaxed">
                  {items.map((g) => (
                    <li key={g.text}>{g.text}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Decisions reserved for people</h2>
        <ul className="grid gap-3">
          {d.humanDecisions.map((h) => (
            <li key={h.owner} className="rounded-lg border border-human/25 bg-human-soft px-4 py-3 text-[14px]">
              <div className="font-semibold text-human">{h.owner}</div>
              <div className="mt-0.5">{h.decision}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-1">Draft notice to candidates</h2>
        <p className="mb-3 text-[13.5px] text-subtle">
          What candidates would be told if Kestrel adopts only the permitted uses. Written to the DPDP standard: the
          data, the purpose, and how to withdraw or complain.
        </p>
        <pre className="hl-card hl-card--pad whitespace-pre-wrap font-sans text-[14px] leading-relaxed">{d.candidateNotice}</pre>
      </section>

      <section className="mt-8">
        <h2 className="hl-h2 mb-1">Sign-off</h2>
        <p className="mb-3 text-[13.5px] text-subtle">
          The agent&rsquo;s recommendation is not the decision. A decision owner records it here.
        </p>
        <div className="hl-card hl-card--pad">
          <SignOff />
        </div>
      </section>
    </div>
  );
}
