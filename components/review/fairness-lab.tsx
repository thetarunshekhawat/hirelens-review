"use client";

import { useMemo, useState } from "react";
import { SIGNALS } from "@/lib/case/signals";
import { reviewAllSignals, OUTCOME_LABEL } from "@/lib/review/engine";
import { runFairnessTest, IMPACT_RATIO_THRESHOLD, MIN_GROUP_SIZE } from "@/lib/review/fairness";
import { REVIEWED_CONFIG, VENDOR_CONFIG } from "@/lib/review/scoring";

const OUTCOME_BY_ID = Object.fromEntries(reviewAllSignals().map((r) => [r.signal.id, r.outcome]));
const SHORT = { remove: "Remove", restrict: "Restrict", human: "Human", keep: "Keep" } as const;

type Preset = "vendor" | "reviewed" | "custom";

export function FairnessLab() {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(VENDOR_CONFIG));
  const [preset, setPreset] = useState<Preset>("vendor");
  const result = useMemo(() => runFairnessTest(enabled), [enabled]);

  function apply(p: Exclude<Preset, "custom">) {
    setPreset(p);
    setEnabled(new Set(p === "vendor" ? VENDOR_CONFIG : REVIEWED_CONFIG));
  }
  function toggle(id: string) {
    setPreset("custom");
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Controls */}
      <aside className="hl-card hl-card--pad h-fit lg:sticky lg:top-24">
        <div className="hl-eyebrow mb-2">Configuration</div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => apply("vendor")}
            className={`hl-btn hl-btn--sm ${preset === "vendor" ? "hl-btn--primary" : "hl-btn--ghost"}`}
          >
            Vendor (all on)
          </button>
          <button
            type="button"
            onClick={() => apply("reviewed")}
            className={`hl-btn hl-btn--sm ${preset === "reviewed" ? "hl-btn--primary" : "hl-btn--ghost"}`}
          >
            After review
          </button>
        </div>
        <div className="hl-eyebrow mb-2">Signals in the score</div>
        <ul className="space-y-1">
          {SIGNALS.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-[12.5px] hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--hl-brand)]"
                  checked={enabled.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span className="flex-1 leading-snug">
                  <span className="hl-num mr-1 text-subtle">{s.id}</span>
                  {s.name}
                </span>
                <span className={`hl-chip hl-chip--${OUTCOME_BY_ID[s.id]} !px-1.5 !text-[10px]`} title={OUTCOME_LABEL[OUTCOME_BY_ID[s.id]]}>
                  {SHORT[OUTCOME_BY_ID[s.id]]}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] leading-snug text-subtle">
          The label beside each signal is the review&rsquo;s outcome. &ldquo;After review&rdquo; leaves no signal in the automated
          score, so ranking falls back to Kestrel&rsquo;s aptitude test.
        </p>
      </aside>

      {/* Results */}
      <div className="space-y-4">
        <div className="hl-card hl-card--pad flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <div className="hl-eyebrow">Shortlisted</div>
            <div className="hl-num text-xl">
              {result.shortlisted} / {result.poolSize}
            </div>
          </div>
          <div>
            <div className="hl-eyebrow">Shortlist line</div>
            <div className="hl-num text-xl">{result.cutoff}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="hl-eyebrow">Groups below {IMPACT_RATIO_THRESHOLD.toFixed(2)}</div>
            <div className={`text-[14px] font-medium ${result.flaggedAttributes.length ? "text-remove" : "text-keep"}`}>
              {result.flaggedAttributes.length ? result.flaggedAttributes.join(", ") : "None"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {result.attributes.map((a) => (
            <section key={a.attribute} className="hl-card hl-card--pad">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="hl-h3">{a.label}</h3>
                <span className={`hl-chip ${a.flagged ? "hl-chip--fail" : "hl-chip--pass"}`}>
                  Lowest ratio <span className="hl-num">{a.worstRatio.toFixed(2)}</span>
                </span>
              </div>
              <ul className="space-y-2.5">
                {a.groups.map((g) => (
                  <li key={g.group} className="text-[12.5px]">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span>
                        {g.group} <span className="text-subtle">(n={g.n})</span>
                      </span>
                      <span className="hl-num">
                        {Math.round(g.rate * 100)}% · {g.tooSmall ? "too small" : g.ratio.toFixed(2)}
                      </span>
                    </div>
                    <div className="relative h-2 rounded bg-muted">
                      <div
                        className={`h-2 rounded ${g.tooSmall ? "bg-subtle/40" : g.flagged ? "bg-remove" : "bg-brand"}`}
                        style={{ width: `${g.rate * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-[12px] text-subtle">
          Bars show the share of each group shortlisted. The ratio divides a group&rsquo;s rate by the best group&rsquo;s rate on
          the same attribute. Groups under {MIN_GROUP_SIZE} people are shown but not judged.
        </p>
      </div>
    </div>
  );
}
