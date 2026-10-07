/**
 * HireLens Review brand mark.
 *
 * A lens ring over three bars. The bars are the signals a hiring tool reads;
 * the lens is the review held over them. One bar carries the accent colour —
 * the signal the review singles out. `MarkThinking` animates the bars in turn,
 * so the busy state shows the product's own action: examining signals one by
 * one.
 */

type MarkProps = { size?: number; className?: string };

function Bars({ animated }: { animated: boolean }) {
  const bars = [
    { y: 12.2, w: 9.5, accent: false },
    { y: 15.6, w: 7, accent: true },
    { y: 19, w: 8.5, accent: false },
  ];
  return (
    <>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={11}
          y={b.y}
          width={b.w}
          height={2}
          rx={1}
          fill={b.accent ? "var(--hl-accent)" : "currentColor"}
          className={animated ? "hl-mark-bar" : undefined}
          style={animated ? { animationDelay: `${i * 0.25}s` } : undefined}
        />
      ))}
    </>
  );
}

export function Mark({ size = 28, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="15.5" cy="15.5" r="10.5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M23.2 23.2 L28.5 28.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <Bars animated={false} />
    </svg>
  );
}

export function MarkThinking({ size = 28, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="15.5" cy="15.5" r="10.5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M23.2 23.2 L28.5 28.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <Bars animated />
    </svg>
  );
}

export function Logo({ size = 30, withTagline = false }: { size?: number; withTagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span className="flex flex-col leading-none">
        <span className="hl-wordmark">
          HireLens <span className="hl-wordmark__light">Review</span>
        </span>
        {withTagline && (
          <span className="mt-1 text-[11px] tracking-wide opacity-70">
            Hiring-data governance review
          </span>
        )}
      </span>
    </span>
  );
}
