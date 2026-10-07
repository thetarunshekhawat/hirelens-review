import { TEAM } from "@/lib/team";

export function SiteFooter() {
  return (
    <footer className="hl-no-print border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 text-[13px] leading-relaxed text-subtle sm:grid-cols-[2fr_1fr] sm:px-6">
        <div>
          <p className="mb-2">
            <strong className="text-ink">HireLens Review</strong> is a governance review agent for decisions about using
            personal information in hiring. It recommends; named people decide.
          </p>
          <p>
            The company, vendor, candidates and posts in this case are fictional. Any resemblance to real organisations
            or people is coincidental. Legal points are summaries for review purposes and are not legal advice.
          </p>
        </div>
        <div>
          <div className="hl-eyebrow mb-2">Team</div>
          <ul className="space-y-0.5">
            {TEAM.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
