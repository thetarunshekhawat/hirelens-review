"use client";

import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LIBRARY, type LibraryEntry } from "@/lib/library/entries";
import { searchLibrary } from "@/lib/library/search";

const GROUPS: Array<{ authority: LibraryEntry["authority"]; title: string; note: string }> = [
  { authority: "binding", title: "Indian law", note: "Governs Kestrel." },
  { authority: "reference", title: "Reference standards", note: "Useful benchmarks from other jurisdictions. Not binding in India." },
  { authority: "evidence", title: "Research, precedent and industry data", note: "What has been found and what has happened." },
];

function Entry({ e }: { e: LibraryEntry }) {
  return (
    <li className="hl-card hl-card--pad">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hl-chip hl-chip--neutral">{e.kind}</span>
        <span className="text-[12px] text-subtle">{e.jurisdiction}</span>
      </div>
      <a
        href={e.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-start gap-1 text-[15px] font-semibold leading-snug hover:underline"
      >
        {e.title}
        <ExternalLink className="mt-1 size-3.5 shrink-0 text-subtle" />
      </a>
      <div className="mt-0.5 text-[12px] text-subtle">{e.citation}</div>
      <p className="mt-2 text-[13.5px] leading-relaxed">{e.summary}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-ink/85">
        {e.keyPoints.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      {e.caveat && (
        <p className="mt-3 rounded-md bg-restrict-soft px-3 py-2 text-[12.5px] text-restrict">
          <strong>Caveat.</strong> {e.caveat}
        </p>
      )}
    </li>
  );
}

export function EvidenceBrowser() {
  const [q, setQ] = useState("");
  const hits = useMemo(() => (q.trim().length > 1 ? searchLibrary(q, 12).map((h) => h.entry) : null), [q]);

  return (
    <div>
      <label className="hl-card mb-6 flex items-center gap-2 px-3 py-2">
        <Search className="size-4 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the library, e.g. tagged photos, four-fifths, section 7"
          className="w-full bg-transparent py-1 text-[14px] outline-none"
          aria-label="Search the evidence library"
        />
      </label>

      {hits ? (
        <>
          <p className="mb-3 text-[13px] text-subtle">
            {hits.length} result{hits.length === 1 ? "" : "s"}, using the same search the agent uses.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {hits.map((e) => (
              <Entry key={e.id} e={e} />
            ))}
          </ul>
        </>
      ) : (
        <div className="space-y-10">
          {GROUPS.map((g) => (
            <section key={g.authority}>
              <h2 className="hl-h2">{g.title}</h2>
              <p className="mb-4 text-[13px] text-subtle">{g.note}</p>
              <ul className="grid gap-4 md:grid-cols-2">
                {LIBRARY.filter((e) => e.authority === g.authority).map((e) => (
                  <Entry key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
