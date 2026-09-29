import type { ReactNode } from "react";
import { signed, percent } from "@/lib/format";

export function Delta({
  value,
  kind = "number",
  pill = false,
  className = "",
}: {
  value: number | null;
  kind?: "number" | "percent";
  pill?: boolean;
  className?: string;
}) {
  if (value == null) return <span className={`text-muted ${className}`}>—</span>;
  const up = value > 0;
  const down = value < 0;
  const tone = up ? "text-up" : down ? "text-down" : "text-muted";
  const bg = pill ? (up ? "bg-up-bg" : down ? "bg-down-bg" : "bg-surface-2") : "";
  return (
    <span className={`tnum inline-flex items-center gap-0.5 ${tone} ${bg} ${pill ? "rounded-full px-2 py-0.5 text-xs font-semibold" : ""} ${className}`}>
      {(up || down) && (
        <svg width="0.7em" height="0.7em" viewBox="0 0 10 10" aria-hidden className={down ? "rotate-180" : ""}>
          <path d="M5 1 9 8H1z" fill="currentColor" />
        </svg>
      )}
      {kind === "percent" ? percent(value, 1, true) : signed(value)}
    </span>
  );
}

export function RankChange({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-muted">–</span>;
  return (
    <span className={`tnum text-xs font-semibold ${value > 0 ? "text-up" : "text-down"}`} title="Rank change vs 7 days ago">
      {value > 0 ? "▲" : "▼"}
      {Math.abs(value)}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon,
  aside,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="card flex flex-col justify-between gap-2 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon && <span className="grid h-6 w-6 place-items-center rounded-lg bg-surface-2 text-ink-2">{icon}</span>}
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="tnum text-2xl font-semibold tracking-tight sm:text-[28px]">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-ink-2">{sub}</div>}
        </div>
        {aside}
      </div>
    </div>
  );
}

export function Section({
  id,
  title,
  desc,
  children,
  action,
  className = "",
  flush = false,
}: {
  id?: string;
  title: string;
  desc?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section id={id} className={`card min-w-0 ${flush ? "" : "p-4 sm:p-5"} ${className}`}>
      <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${flush ? "px-4 pt-4 sm:px-5 sm:pt-5" : ""}`}>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionHeading({ id, eyebrow, title, desc }: { id?: string; eyebrow: string; title: string; desc?: string }) {
  return (
    <div id={id} className="pt-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "active" | "evicted" }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-up-bg px-2 py-0.5 text-xs font-medium text-up">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--up)]" aria-hidden />
      In house
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" aria-hidden />
      Evicted
    </span>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? "#f59e0b" : rank === 2 ? "#9ca3af" : rank === 3 ? "#b4690e" : null;
  return (
    <span
      className={`tnum inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold ${medal ? "text-white" : "bg-surface-2 text-ink-2"}`}
      style={medal ? { background: medal } : undefined}
      title={`Rank #${rank} by followers`}
    >
      {rank}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface-2 p-0.5 text-sm no-scrollbar" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-[10px] font-medium transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5"} ${
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Horizontal meter comparing a value to the house average. */
export function VsAverage({ label, value, avg, max, fmt }: { label: string; value: number | null; avg: number | null; max: number; fmt: (n: number | null) => string }) {
  const w = (n: number | null) => `${Math.max(0, Math.min(100, ((n ?? 0) / (max || 1)) * 100))}%`;
  const better = value != null && avg != null && value >= avg;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="tnum">
          <span className="font-semibold">{fmt(value)}</span>
          <span className="ml-1.5 text-xs text-muted">avg {fmt(avg)}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="h-2 rounded-full" style={{ width: w(value), background: better ? "var(--series-1)" : "var(--axis)" }} />
        {avg != null && <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: w(avg) }} title={`House average ${fmt(avg)}`} />}
      </div>
    </div>
  );
}
