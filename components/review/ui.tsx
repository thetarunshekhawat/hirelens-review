import Link from "next/link";
import type { CheckStatus, Outcome } from "@/lib/case/types";
import { OUTCOME_LABEL } from "@/lib/review/engine";

export function OutcomeChip({ outcome, short = false }: { outcome: Outcome; short?: boolean }) {
  const label = short
    ? { keep: "Keep", restrict: "Restrict", remove: "Remove", human: "Human decision" }[outcome]
    : OUTCOME_LABEL[outcome];
  return <span className={`hl-chip hl-chip--${outcome}`}>{label}</span>;
}

const STATUS_LABEL: Record<CheckStatus, string> = { pass: "Pass", concern: "Concern", fail: "Fail" };

export function StatusChip({ status }: { status: CheckStatus }) {
  return <span className={`hl-chip hl-chip--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function StatusDot({ status, label }: { status: CheckStatus; label: string }) {
  return (
    <span className={`hl-dot hl-dot--${status}`} role="img" aria-label={`${label}: ${STATUS_LABEL[status]}`} title={`${label}: ${STATUS_LABEL[status]}`} />
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="hl-eyebrow mb-2">{eyebrow}</div>
      <h1 className="hl-h1 max-w-3xl">{title}</h1>
      {lede && <p className="hl-lede mt-3 max-w-3xl">{lede}</p>}
      {children}
    </div>
  );
}

export function Stat({ value, label, tone = "neutral" }: { value: string; label: string; tone?: "neutral" | "remove" | "keep" | "human" }) {
  const color = { neutral: "text-ink", remove: "text-remove", keep: "text-keep", human: "text-human" }[tone];
  return (
    <div className="hl-card hl-card--pad">
      <div className={`hl-num text-2xl font-medium sm:text-3xl ${color}`}>{value}</div>
      <div className="mt-1 text-[13px] leading-snug text-subtle">{label}</div>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-[13px] text-subtle hover:text-ink">
      ← {children}
    </Link>
  );
}

export function Callout({ tone = "brand", title, children }: { tone?: "brand" | "human" | "restrict"; title: string; children: React.ReactNode }) {
  const styles = {
    brand: "border-brand/25 bg-brand-soft",
    human: "border-human/25 bg-human-soft",
    restrict: "border-restrict/25 bg-restrict-soft",
  }[tone];
  return (
    <div className={`rounded-lg border px-4 py-3 text-[13.5px] leading-relaxed ${styles}`}>
      <div className="mb-1 font-semibold">{title}</div>
      <div className="text-ink/85">{children}</div>
    </div>
  );
}
