import Link from "next/link";
import type { Metadata } from "next";
import { OutcomeChip, PageHeader, StatusDot } from "@/components/review/ui";
import { CHECKS, outcomeCounts, reviewAllSignals } from "@/lib/review/engine";

export const metadata: Metadata = { title: "Signals" };

const FEEDS = { reliability: "Reliability", culture_fit: "Culture fit", professionalism: "Professionalism" } as const;

export default function SignalsPage() {
  const reviews = reviewAllSignals();
  const counts = outcomeCounts(reviews);

  return (
    <div>
      <PageHeader
        eyebrow="Agent workspace · Signal review"
        title="Thirteen signals, six questions each"
        lede="Every signal the vendor tool reads is asked the same six questions. Fixed rules turn the answers into an outcome, so the same facts always give the same result, and anyone who disagrees can point to the fact or rule they dispute."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <OutcomeChip outcome="remove" short /> <span className="hl-num text-[13px]">{counts.remove}</span>
          <OutcomeChip outcome="restrict" short /> <span className="hl-num text-[13px]">{counts.restrict}</span>
          <OutcomeChip outcome="human" short /> <span className="hl-num text-[13px]">{counts.human}</span>
          <OutcomeChip outcome="keep" short /> <span className="hl-num text-[13px]">{counts.keep}</span>
        </div>
      </PageHeader>

      <div className="hl-card hl-scroll-x">
        <table className="hl-table hl-table--hover min-w-[860px]">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Vendor weight</th>
              {CHECKS.map((c) => (
                <th key={c.id} className="text-center" title={c.question}>
                  {c.number}. {c.short}
                </th>
              ))}
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.signal.id}>
                <td>
                  <Link href={`/signals/${r.signal.id}`} className="font-medium hover:underline">
                    <span className="hl-num mr-2 text-subtle">{r.signal.id}</span>
                    {r.signal.name}
                  </Link>
                  <div className="text-[12px] text-subtle">{FEEDS[r.signal.feeds]}</div>
                </td>
                <td className="hl-num whitespace-nowrap">
                  {r.signal.direction > 0 ? "+" : "−"}
                  {r.signal.weight}
                </td>
                {r.checks.map((c) => (
                  <td key={c.check} className="text-center">
                    <StatusDot status={c.status} label={CHECKS.find((q) => q.id === c.check)!.question} />
                  </td>
                ))}
                <td>
                  <OutcomeChip outcome={r.outcome} short />
                  <div className="hl-num mt-1 text-[11px] text-subtle">{r.rule.id}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12.5px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="hl-dot hl-dot--pass" /> Pass
        </span>
        <span className="flex items-center gap-1.5">
          <span className="hl-dot hl-dot--concern" /> Concern
        </span>
        <span className="flex items-center gap-1.5">
          <span className="hl-dot hl-dot--fail" /> Fail
        </span>
        <span>
          Rules R1–R7 are listed on{" "}
          <Link href="/method" className="hl-link">
            Method and limits
          </Link>
          .
        </span>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {CHECKS.map((c) => (
          <div key={c.id} className="hl-card px-4 py-3">
            <div className="hl-eyebrow">Question {c.number}</div>
            <div className="mt-0.5 text-[14px] font-medium">{c.question}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
