import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AskButton } from "@/components/agent/ask-button";
import { BackLink, Callout, OutcomeChip, StatusChip } from "@/components/review/ui";
import { CANDIDATES } from "@/lib/case/candidates";
import { SIGNALS } from "@/lib/case/signals";
import { LIBRARY_BY_ID } from "@/lib/library/entries";
import { CHECKS, reviewSignalById } from "@/lib/review/engine";

export function generateStaticParams() {
  return SIGNALS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = reviewSignalById(id);
  return { title: r ? `${r.signal.id} ${r.signal.name}` : "Signal" };
}

export default async function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = reviewSignalById(id);
  if (!r) notFound();
  const s = r.signal;
  const triggeredBy = CANDIDATES.flatMap((c) =>
    c.posts.filter((p) => p.triggered.includes(s.id)).map((p) => ({ c, p }))
  );

  return (
    <div className="max-w-4xl">
      <BackLink href="/signals">All signals</BackLink>
      <div className="hl-eyebrow mb-2">Signal {s.id}</div>
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="hl-h1 flex-1">{s.name}</h1>
        <OutcomeChip outcome={r.outcome} />
      </div>
      <p className="hl-lede mt-3">
        <span className="text-subtle">The vendor says: </span>“{s.vendorClaim}”
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
        <span className="hl-chip hl-chip--outline">
          Moves the score by up to {s.direction > 0 ? "+" : "−"}
          {s.weight} points
        </span>
        <span className="hl-chip hl-chip--outline">Feeds: {s.feeds.replace("_", " ")}</span>
        <AskButton question={`Explain the review of ${s.id} (${s.name}) in plain language, citing the evidence.`}>
          Ask the agent about this signal
        </AskButton>
      </div>

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">The six questions</h2>
        <ol className="space-y-2">
          {r.checks.map((c) => {
            const q = CHECKS.find((x) => x.id === c.check)!;
            return (
              <li key={c.check} className="hl-card grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <div className="text-[13px] font-semibold">
                    {q.number}. {q.question}
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink/85">{c.reason}</p>
                </div>
                <StatusChip status={c.status} />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow mb-1">Rule applied</div>
          <div className="hl-num text-[13px] text-subtle">{r.rule.id}</div>
          <p className="mt-1 text-[14px]">{r.rule.text}</p>
        </div>
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow mb-2">{r.outcome === "remove" ? "Conditions" : "Conditions for any use"}</div>
          {r.conditions.length === 0 ? (
            <p className="text-[14px] text-subtle">None. A removed signal is not used under any condition.</p>
          ) : (
            <ul className="list-disc space-y-1.5 pl-4 text-[13.5px]">
              {r.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {s.facts.legalQuestion && (
        <div className="mt-4">
          <Callout tone="human" title="Open legal question: handed to people">
            {s.facts.legalQuestion}
          </Callout>
        </div>
      )}

      <section className="mt-8">
        <h2 className="hl-h2 mb-3">Evidence</h2>
        <ul className="space-y-2">
          {s.evidence.map((eid) => {
            const e = LIBRARY_BY_ID[eid];
            if (!e) return null;
            return (
              <li key={eid} className="hl-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium hover:underline">
                    {e.title}
                  </a>
                  <span className={`hl-chip ${e.authority === "binding" ? "hl-chip--brand" : "hl-chip--neutral"}`}>
                    {e.authority === "binding" ? "Indian law" : e.authority === "reference" ? "Reference only" : "Evidence"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-subtle">{e.summary}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {triggeredBy.length > 0 && (
        <section className="mt-8">
          <h2 className="hl-h2 mb-3">Where it fired in the sample</h2>
          <ul className="space-y-2">
            {triggeredBy.map(({ c, p }) => (
              <li key={p.id} className="hl-card px-4 py-3 text-[13.5px]">
                <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
                <span className="text-subtle">
                  {" "}
                  · {p.platform} · {p.language}
                  {p.publishedBy === "tagged" ? " · posted by someone else" : ""}
                </span>
                <p className="mt-1">“{p.text}”</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
