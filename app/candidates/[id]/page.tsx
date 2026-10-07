import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AskButton } from "@/components/agent/ask-button";
import { BackLink, Callout, OutcomeChip } from "@/components/review/ui";
import { CANDIDATES } from "@/lib/case/candidates";
import { reviewCandidateById } from "@/lib/review/candidates";

export function generateStaticParams() {
  return CANDIDATES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = reviewCandidateById(id);
  return { title: r ? r.candidate.name : "Candidate" };
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

const IDENTITY_TONE = { verified: "keep", unverified: "restrict", mismatch: "remove", no_profile: "neutral" } as const;
const IDENTITY_LABEL = {
  verified: "Linked by the candidate",
  unverified: "Not confirmed",
  mismatch: "Wrong person",
  no_profile: "No profile",
} as const;

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = reviewCandidateById(id);
  if (!r) notFound();
  const c = r.candidate;
  const maxAbs = Math.max(10, ...r.breakdown.map((b) => Math.abs(b.points)));

  return (
    <div className="max-w-5xl">
      <BackLink href="/candidates">All candidates</BackLink>
      <div className="hl-eyebrow mb-2">Candidate case review · fictional</div>
      <h1 className="hl-h1">{c.name}</h1>
      <p className="mt-1 text-[14px] text-subtle">
        {c.degree}, {c.college} (tier {c.collegeTier}) · {c.city}, {c.state} · Class of {c.graduationYear}
      </p>
      <p className="hl-lede mt-4 max-w-3xl">{c.headline}</p>
      <div className="mt-3">
        <AskButton question={`Walk me through ${c.name}'s case: what the tool did, what the review found, and who must decide what next.`}>
          Ask the agent about this case
        </AskButton>
      </div>

      {/* Scores */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow">Aptitude test</div>
          <div className="hl-num mt-1 text-3xl">{c.aptitude}</div>
          <div className="text-[12.5px] text-subtle">Kestrel&rsquo;s own assessment</div>
        </div>
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow">Vendor score</div>
          <div className="hl-num mt-1 text-3xl">{r.vendor.score}</div>
          <div className="text-[12.5px] text-subtle">
            Line: <span className="hl-num">{r.vendor.cutoff}</span> ·{" "}
            <span className={r.vendor.shortlisted ? "text-keep" : "text-remove"}>
              {r.vendor.shortlisted ? "shortlisted" : "below the line"}
            </span>
          </div>
        </div>
        <div className="hl-card hl-card--pad">
          <div className="hl-eyebrow">After the review</div>
          <div className="hl-num mt-1 text-3xl">{r.reviewed.score}</div>
          <div className="text-[12.5px] text-subtle">
            Line: <span className="hl-num">{r.reviewed.cutoff}</span> ·{" "}
            <span className={r.reviewed.shortlisted ? "text-keep" : "text-remove"}>
              {r.reviewed.shortlisted ? "shortlisted" : "below the line"}
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          {/* Breakdown */}
          <section className="hl-card hl-card--pad">
            <h2 className="hl-h3 mb-3">How the vendor tool moved the score</h2>
            {r.breakdown.length === 0 ? (
              <p className="text-[13.5px] text-subtle">No signal moved this candidate&rsquo;s score.</p>
            ) : (
              <ul className="space-y-2.5">
                {r.breakdown.map((b) => (
                  <li key={b.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                    <Link href={`/signals/${b.id}`} className="hover:underline">
                      <span className="hl-num mr-1.5 text-subtle">{b.id}</span>
                      {b.name}
                    </Link>
                    <span className={`hl-num ${b.points < 0 ? "text-remove" : "text-keep"}`}>
                      {b.points > 0 ? "+" : ""}
                      {b.points}
                    </span>
                    <div className="col-span-2 h-1.5 rounded bg-muted">
                      <div
                        className={`h-1.5 rounded ${b.points < 0 ? "bg-remove" : "bg-keep"}`}
                        style={{ width: `${(Math.abs(b.points) / maxAbs) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Findings */}
          <section className="hl-card hl-card--pad">
            <h2 className="hl-h3 mb-3">What the review found</h2>
            <p className="mb-4 text-[14px] leading-relaxed">{c.reviewNote}</p>
            <ul className="space-y-2">
              {r.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                  {f.outcome ? (
                    <span className="mt-0.5 shrink-0">
                      <OutcomeChip outcome={f.outcome} short />
                    </span>
                  ) : (
                    <span className="hl-chip hl-chip--fail mt-0.5 shrink-0">Finding</span>
                  )}
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            {r.followUps.length > 0 && (
              <div className="mt-4">
                <Callout tone="human" title="Needs a person">
                  <ul className="list-disc space-y-1 pl-4">
                    {r.followUps.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </Callout>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Identity */}
          <section className="hl-card hl-card--pad">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="hl-h3">Is it the right person?</h2>
              <span className={`hl-chip hl-chip--${IDENTITY_TONE[r.identity.status]}`}>{IDENTITY_LABEL[r.identity.status]}</span>
            </div>
            {c.matchedProfile ? (
              <table className="hl-table text-[12.5px]">
                <thead>
                  <tr>
                    <th></th>
                    <th>Application</th>
                    <th>Matched profile</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["City", c.city, c.matchedProfile.city],
                      ["College", c.college, c.matchedProfile.college],
                      ["Graduation", c.graduationYear, c.matchedProfile.graduationYear],
                    ] as const
                  ).map(([k, a, b]) => (
                    <tr key={k}>
                      <td className="text-subtle">{k}</td>
                      <td>{a}</td>
                      <td className={String(a) === String(b) ? "" : "font-semibold text-remove"}>{b ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <p className="mt-2 text-[12.5px] text-subtle">{r.identity.detail}</p>
          </section>

          {/* Application */}
          <section className="hl-card hl-card--pad text-[13px]">
            <h2 className="hl-h3 mb-2">From the application</h2>
            <p>{c.application.notes}</p>
            <p className="mt-2 text-subtle">
              Links supplied: {c.application.statedLinks.length ? c.application.statedLinks.join(", ") : "none"}
            </p>
            <p className="mt-1 text-subtle">Social media presence: {c.presence}</p>
          </section>

          {/* Posts */}
          <section className="hl-card hl-card--pad">
            <h2 className="hl-h3 mb-3">Posts the tool read</h2>
            {c.posts.length === 0 ? (
              <p className="text-[13px] text-subtle">None. The candidate has no public social media.</p>
            ) : (
              <ul className="space-y-3">
                {c.posts.map((p) => (
                  <li key={p.id} className="rounded-md border border-line bg-canvas/60 px-3 py-2.5 text-[13px]">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-subtle">
                      <span>{p.platform}</span>·<span>{fmtTime(p.postedAt)}</span>·<span>{p.language}</span>
                      {p.publishedBy === "tagged" && <span className="hl-chip hl-chip--human">Posted by someone else</span>}
                    </div>
                    <p>“{p.text}”</p>
                    {p.original && <p className="mt-1 text-[12px] italic text-subtle">Original: {p.original}</p>}
                    {p.triggered.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.triggered.map((t) => (
                          <Link key={t} href={`/signals/${t}`} className="hl-chip hl-chip--outline hover:border-brand/40">
                            Triggered {t}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
