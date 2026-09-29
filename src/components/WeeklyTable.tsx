import Link from "next/link";
import type { ContestantStats } from "@/lib/analytics";
import { compact, signed } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Followers gained per show week, shaded per column so each week's winner stands out. */
export function WeeklyTable({ stats, weekLabels }: { stats: ContestantStats[]; weekLabels: string[] }) {
  const rows = [...stats].sort((a, b) => (b.gainSeason ?? 0) - (a.gainSeason ?? 0));
  const colMax = weekLabels.map((_, w) => Math.max(...stats.map((s) => s.weeklyGain[w] ?? 0), 1));
  const colBest = weekLabels.map((_, w) => {
    const best = [...stats].sort((a, b) => (b.weeklyGain[w] ?? -Infinity) - (a.weeklyGain[w] ?? -Infinity))[0];
    return best?.contestant.id;
  });

  if (!weekLabels.length) return <p className="text-sm text-muted">Weekly totals appear once the season starts.</p>;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-medium">Contestant</th>
            {weekLabels.map((w) => (
              <th key={w} className="pb-2 text-right font-medium">{w}</th>
            ))}
            <th className="pb-2 text-right font-medium">Season</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.contestant.id} className="border-t border-line">
              <td className="py-1.5 pr-3">
                <Link href={`/contestants/${s.contestant.id}`} className="flex items-center gap-2 hover:underline">
                  <Avatar name={s.contestant.name} photo={s.photo} size={24} evicted={s.contestant.status === "evicted"} />
                  <span className="truncate">{s.contestant.name}</span>
                </Link>
              </td>
              {s.weeklyGain.map((g, w) => {
                const step = g == null || g <= 0 ? 0 : Math.min(6, 1 + Math.floor((g / colMax[w]) * 5.999));
                const best = colBest[w] === s.contestant.id;
                return (
                  <td key={w} className="py-1 pl-1 text-right">
                    <span
                      className={`tnum inline-block min-w-16 rounded-md px-2 py-1 ${best ? "font-bold" : ""}`}
                      style={{
                        background: g != null && g < 0 ? "var(--neg-1)" : `var(--seq-${step})`,
                        color: step >= 4 ? "var(--seq-on-hi)" : "var(--ink)",
                      }}
                      title={best ? `Top gainer of ${weekLabels[w]}` : undefined}
                    >
                      {best && "★ "}
                      {g == null ? "—" : signed(g)}
                    </span>
                  </td>
                );
              })}
              <td className="tnum py-1 pl-3 text-right font-semibold">{s.gainSeason == null ? "—" : compact(s.gainSeason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
