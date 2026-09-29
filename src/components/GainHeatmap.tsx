import Link from "next/link";
import type { ContestantStats } from "@/lib/analytics";
import { compact, shortDate, signed } from "@/lib/format";
import { Avatar } from "./Avatar";

/**
 * Contestant × day grid of daily follower change. Diverging scale:
 * blue steps for gains (scaled per row, so small and large accounts are both
 * readable), red for losses, neutral for ~0.
 */
export function GainHeatmap({ stats, dates, premiereDate, days = 21 }: { stats: ContestantStats[]; dates: string[]; premiereDate: string; days?: number }) {
  const cols = dates.slice(-days);
  const rows = [...stats].sort((a, b) => (b.gain7d ?? 0) - (a.gain7d ?? 0));

  const cell = (gain: number | null, rowMax: number) => {
    if (gain == null) return { bg: "transparent", fg: "var(--muted)" };
    if (gain < 0) {
      const r = Math.min(1, Math.abs(gain) / (rowMax || 1));
      return { bg: `var(--neg-${r > 0.5 ? 3 : r > 0.15 ? 2 : 1})`, fg: r > 0.5 ? "#fff" : "var(--ink)" };
    }
    const s = gain === 0 ? 0 : Math.min(6, 1 + Math.floor((gain / (rowMax || 1)) * 5.999));
    return { bg: `var(--seq-${s})`, fg: s >= 4 ? "var(--seq-on-hi)" : "var(--ink-2)" };
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-separate border-spacing-[3px] text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface" />
            {cols.map((d) => (
              <th key={d} className={`min-w-9 pb-1 font-normal ${d === premiereDate ? "text-ink" : "text-muted"}`}>
                <div>{shortDate(d).split(" ")[0]}</div>
                <div className="text-[10px]">{shortDate(d).split(" ")[1]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const rowGains = cols.map((d) => s.series.find((p) => p.date === d)?.gain ?? null);
            const rowMax = Math.max(...rowGains.map((g) => Math.abs(g ?? 0)));
            return (
              <tr key={s.contestant.id}>
                <th className="sticky left-0 z-10 bg-surface pr-2 text-left font-normal">
                  <Link href={`/contestants/${s.contestant.id}`} className="flex items-center gap-2 whitespace-nowrap hover:underline">
                    <Avatar name={s.contestant.name} photo={s.photo} size={22} evicted={s.contestant.status === "evicted"} />
                    <span className="max-w-32 truncate text-xs text-ink">{s.contestant.name}</span>
                  </Link>
                </th>
                {rowGains.map((g, i) => {
                  const c = cell(g, rowMax);
                  return (
                    <td
                      key={cols[i]}
                      className="tnum h-7 rounded-md text-center"
                      style={{ background: c.bg, color: c.fg }}
                      title={`${s.contestant.name} · ${shortDate(cols[i])}: ${g == null ? "no data" : signed(g) + " followers"}`}
                    >
                      {g == null ? "" : g === 0 ? "0" : compact(Math.abs(g)).replace(/\.\d/, "")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          Loss
          {[3, 2, 1].map((n) => <span key={n} className="h-3 w-4 rounded-sm" style={{ background: `var(--neg-${n})` }} />)}
        </span>
        <span className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className="h-3 w-4 rounded-sm" style={{ background: `var(--seq-${n})` }} />)}
          Gain
        </span>
        <span>Shading is relative to each contestant&apos;s own biggest day, so small and large accounts are both readable.</span>
      </div>
    </div>
  );
}
