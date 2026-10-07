import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/review/ui";
import { reviewAllCandidates, shortlistCutoffs } from "@/lib/review/candidates";

export const metadata: Metadata = { title: "Candidates" };

function Verdict({ shortlisted }: { shortlisted: boolean }) {
  return shortlisted ? (
    <span className="hl-chip hl-chip--keep">Shortlisted</span>
  ) : (
    <span className="hl-chip hl-chip--remove">Below the line</span>
  );
}

export default function CandidatesPage() {
  const reviews = reviewAllCandidates();
  const cut = shortlistCutoffs();

  return (
    <div>
      <PageHeader
        eyebrow="Agent workspace · Candidate case reviews"
        title="Nine sample candidates from the vendor's reports"
        lede={
          <>
            Each case shows a different way a social-media signal can mislead. Scores are compared with the same
            1,000-applicant pool: the vendor&rsquo;s shortlist line is <span className="hl-num">{cut.vendor}</span>, and
            after the review it is <span className="hl-num">{cut.reviewed}</span> (aptitude test only). All candidates
            are fictional.
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => {
          const c = r.candidate;
          return (
            <Link
              key={c.id}
              href={`/candidates/${c.id}`}
              className="hl-card hl-card--pad group flex flex-col transition-colors hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="hl-h3">{c.name}</div>
                  <div className="text-[12.5px] text-subtle">
                    {c.degree.replace("Computer Science", "CSE")} · Tier {c.collegeTier} · {c.city}
                  </div>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-3 flex-1 text-[13.5px] leading-snug">{c.headline}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[12px]">
                <div>
                  <div className="text-subtle">Vendor tool</div>
                  <div className="hl-num my-0.5 text-lg">{r.vendor.score}</div>
                  <Verdict shortlisted={r.vendor.shortlisted} />
                </div>
                <div>
                  <div className="text-subtle">After review</div>
                  <div className="hl-num my-0.5 text-lg">{r.reviewed.score}</div>
                  <Verdict shortlisted={r.reviewed.shortlisted} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
