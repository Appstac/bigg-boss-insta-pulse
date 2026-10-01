import Link from "next/link";
import type { ContestantStats } from "@/lib/analytics";
import { shortDate, signed } from "@/lib/format";
import { Avatar } from "./Avatar";

/**
 * Contestant × day grid of daily follower change. One shared scale for everyone: fixed bands,
 * blue for gains and red for losses, with stronger colour meaning a bigger change (same reading in
 * light and dark mode). Every value is shown with its sign.
 */
const GAIN_BANDS = [
  { min: 1, label: "+1–99", strength: 18 },
  { min: 100, label: "+100–499", strength: 35 },
  { min: 500, label: "+500–999", strength: 55 },
  { min: 1_000, label: "+1K–5K", strength: 75 },
  { min: 5_000, label: "+5K+", strength: 95 },
];
const LOSS_BANDS = [
  { min: 1, label: "−1–99", strength: 30 },
  { min: 100, label: "−100–499", strength: 55 },
  { min: 500, label: "−500+", strength: 85 },
];

function band<T extends { min: number }>(bands: T[], v: number): T {
  return [...bands].reverse().find((b) => v >= b.min) ?? bands[0];
}

const tint = (color: string, strength: number) => `color-mix(in srgb, ${color} ${strength}%, transparent)`;

function cellStyle(gain: number | null) {
  if (gain == null) return { background: "transparent", color: "var(--muted)" };
  if (gain === 0) return { background: "var(--surface-2)", color: "var(--muted)" };
  const b = gain > 0 ? band(GAIN_BANDS, gain) : band(LOSS_BANDS, -gain);
  const color = gain > 0 ? "var(--series-1)" : "var(--neg-3)";
  return { background: tint(color, b.strength), color: b.strength >= 55 ? "#fff" : "var(--ink)" };
}

export function GainHeatmap({ stats, dates, premiereDate, days = 21 }: { stats: ContestantStats[]; dates: string[]; premiereDate: string; days?: number }) {
  // Skip days nobody has a change for (e.g. the first day of tracking).
  const cols = dates.slice(-days).filter((d) => stats.some((s) => s.series.find((p) => p.date === d)?.gain != null));
  if (!cols.length) return <p className="text-sm text-muted">Daily changes appear after the second day of tracking.</p>;
  const rows = [...stats].sort((a, b) => (b.gain7d ?? b.gainSeason ?? 0) - (a.gain7d ?? a.gainSeason ?? 0));

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface" />
              {cols.map((d) => (
                <th key={d} className={`min-w-16 pb-1 font-normal ${d === premiereDate ? "text-ink" : "text-muted"}`}>
                  {shortDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.contestant.id}>
                <th className="sticky left-0 z-10 bg-surface pr-3 text-left font-normal">
                  <Link href={`/contestants/${s.contestant.id}`} className="flex items-center gap-2 whitespace-nowrap hover:underline">
                    <Avatar name={s.contestant.name} photo={s.photo} size={22} evicted={s.contestant.status === "evicted"} />
                    <span className="max-w-36 truncate text-ink">{s.contestant.name}</span>
                  </Link>
                </th>
                {cols.map((d) => {
                  const g = s.series.find((p) => p.date === d)?.gain ?? null;
                  return (
                    <td
                      key={d}
                      className="tnum h-7 rounded-md px-2 text-center font-medium"
                      style={cellStyle(g)}
                      title={`${s.contestant.name} · ${shortDate(d)}: ${g == null ? "no data" : `${signed(g)} followers`}`}
                    >
                      {g == null ? "" : g === 0 ? "0" : signed(g)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        {[...LOSS_BANDS].reverse().map((b) => (
          <span key={b.label} className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-sm" style={{ background: tint("var(--neg-3)", b.strength) }} />
            {b.label}
          </span>
        ))}
        {GAIN_BANDS.map((b) => (
          <span key={b.label} className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-sm" style={{ background: tint("var(--series-1)", b.strength) }} />
            {b.label}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">Followers gained (blue) or lost (red) each day. Stronger colour = bigger change, on the same scale for everyone.</p>
    </div>
  );
}
