"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";

export const NAV = [
  { href: "/", label: "Agent review" },
  { href: "/signals", label: "Signals" },
  { href: "/candidates", label: "Candidates" },
  { href: "/fairness", label: "Fairness test" },
  { href: "/evidence", label: "Evidence" },
  { href: "/decision", label: "Decision sheet" },
  { href: "/method", label: "Method & limits" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <header className="hl-no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="HireLens Review home" className="text-brand">
          <Logo size={28} />
        </Link>
        <span className="hl-chip hl-chip--outline hidden sm:inline-flex">Case: Kestrel campus hiring, 2027</span>
        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto pb-1 md:ml-auto md:w-auto md:pb-0">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                active(n.href) ? "bg-brand text-white" : "text-ink/75 hover:bg-muted hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
