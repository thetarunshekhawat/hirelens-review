"use client";

/**
 * The human sign-off. The agent's recommendation is never the decision; this
 * is where a person records one. Kept in this browser only — the prototype has
 * no accounts — and printable with the rest of the sheet.
 */
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "hirelens:sign-off:v1";

type Record_ = { name: string; role: string; date: string; decision: string; reasons: string };
const EMPTY: Record_ = { name: "", role: "Data Protection Officer", date: "", decision: "", reasons: "" };

export function SignOff() {
  const [rec, setRec] = useState<Record_>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRec({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* no stored record */
    }
  }, []);

  function update<K extends keyof Record_>(k: K, v: Record_[K]) {
    setSaved(false);
    setRec((r) => ({ ...r, [k]: v }));
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(rec));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const field = "w-full rounded-md border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-brand";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-[12.5px] text-subtle">
        Name
        <input className={field} value={rec.name} onChange={(e) => update("name", e.target.value)} />
      </label>
      <label className="text-[12.5px] text-subtle">
        Role
        <select className={field} value={rec.role} onChange={(e) => update("role", e.target.value)}>
          <option>Data Protection Officer</option>
          <option>Head of Talent Acquisition</option>
          <option>Both decision owners</option>
        </select>
      </label>
      <label className="text-[12.5px] text-subtle">
        Decision
        <select className={field} value={rec.decision} onChange={(e) => update("decision", e.target.value)}>
          <option value="">Not yet decided</option>
          <option>Accept the recommendation: do not adopt</option>
          <option>Approve a pilot of the permitted uses only</option>
          <option>Adopt with conditions (record why the review is overridden)</option>
          <option>Adopt as proposed (record why the review is overridden)</option>
          <option>Defer pending legal opinion</option>
        </select>
      </label>
      <label className="text-[12.5px] text-subtle">
        Date
        <input type="date" className={field} value={rec.date} onChange={(e) => update("date", e.target.value)} />
      </label>
      <label className="text-[12.5px] text-subtle sm:col-span-2">
        Reasons (required if the recommendation is not followed)
        <textarea rows={3} className={field} value={rec.reasons} onChange={(e) => update("reasons", e.target.value)} />
      </label>
      <div className="hl-no-print flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="button" className="hl-btn hl-btn--primary hl-btn--sm" onClick={save}>
          Record decision
        </button>
        <button type="button" className="hl-btn hl-btn--ghost hl-btn--sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print the sheet
        </button>
        {saved && <span className="text-[12.5px] text-keep">Recorded in this browser.</span>}
      </div>
    </div>
  );
}
