import Link from "next/link";
import type { ContestantStats } from "@/lib/analytics";
import { addDays } from "@/lib/analytics";
import { shortDate, signed } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Followers gained per show week, shaded per column so each week's winner stands out. */
export function WeeklyTable({
  stats,
  weekLabels,
  premiereDate,
  trackingStart,
  growthSince,
}: {
  stats: ContestantStats[];
  weekLabels: string[];
  premiereDate: string;
  trackingStart: string | null;
  growthSince: string;
}) {
  // Only weeks that have data (tracking may have started mid-season).
  const weeks = weekLabels.map((label, w) => ({ label, w })).filter(({ w }) => stats.some((s) => s.weeklyGain[w] != null));
  if (!weeks.length) return <p className="text-sm text-muted">Weekly totals appear once a second day of tracking is recorded.</p>;

  const rows = [...stats].sort((a, b) => (b.gainSeason ?? 0) - (a.gainSeason ?? 0));
  const colMax = new Map(weeks.map(({ w }) => [w, Math.max(...stats.map((s) => s.weeklyGain[w] ?? 0), 1)]));
  // Star only a real, positive top gain.
  const colBest = new Map(
    weeks.map(({ w }) => {
      const vals = stats.map((s) => s.weeklyGain[w]).filter((g): g is number => g != null);
      const top = Math.max(...vals);
      const best = top > 0 ? stats.find((s) => s.weeklyGain[w] === top)?.contestant.id : undefined;
      return [w, best];
    }),
  );
  const partial = weeks.find(({ w }) => trackingStart && trackingStart > addDays(premiereDate, 7 * w) && trackingStart <= addDays(premiereDate, 7 * w + 6));

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className={`w-full text-sm ${weeks.length > 3 ? "min-w-[520px]" : ""}`}>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-medium">Contestant</th>
              {weeks.map(({ label, w }) => (
                <th key={w} className="pb-2 text-right font-medium">
                  {label}
                  {partial?.w === w && "*"}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right font-medium">Total</th>
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
                {weeks.map(({ w }) => {
                  const g = s.weeklyGain[w];
                  const step = g == null || g <= 0 ? 0 : Math.min(6, 1 + Math.floor((g / colMax.get(w)!) * 5.999));
                  const best = colBest.get(w) === s.contestant.id;
                  return (
                    <td key={w} className="py-1 pl-1 text-right">
                      <span
                        className={`tnum inline-block min-w-16 rounded-md px-2 py-1 ${best ? "font-bold" : ""}`}
                        style={{
                          background: g != null && g < 0 ? "var(--neg-1)" : `var(--seq-${step})`,
                          color: step >= 4 ? "var(--seq-on-hi)" : "var(--ink)",
                        }}
                        title={best ? "Top gainer this week" : undefined}
                      >
                        {best && "★ "}
                        {g == null ? "—" : signed(g)}
                      </span>
                    </td>
                  );
                })}
                <td className="tnum py-1 pl-3 text-right font-semibold">{signed(s.gainSeason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Weeks run Sunday to Saturday from the {shortDate(premiereDate)} launch. Total = followers gained {growthSince}.
        {partial && trackingStart && ` *${partial.label} counts from ${shortDate(trackingStart)}, when tracking began.`}
      </p>
    </div>
  );
}
