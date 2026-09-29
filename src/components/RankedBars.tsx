import Link from "next/link";
import type { ContestantStats } from "@/lib/analytics";
import { Avatar } from "./Avatar";

/** Ranked horizontal bars with contestant photos. Single measure, single hue. */
export function RankedBars({
  stats,
  get,
  fmt,
  sub,
  limit,
  color = "var(--series-1)",
  empty = "Not enough data yet.",
}: {
  stats: ContestantStats[];
  get: (s: ContestantStats) => number | null;
  fmt: (n: number) => string;
  sub?: (s: ContestantStats) => React.ReactNode;
  limit?: number;
  color?: string;
  /** Shown instead of an empty list. */
  empty?: string;
}) {
  const rows = stats
    .filter((s) => get(s) != null)
    .sort((a, b) => get(b)! - get(a)!)
    .slice(0, limit);
  const max = Math.max(...rows.map((s) => Math.abs(get(s)!)), 1e-9);
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="space-y-2.5">
      {rows.map((s, i) => {
        const v = get(s)!;
        return (
          <li key={s.contestant.id}>
            <Link href={`/contestants/${s.contestant.id}`} className="group flex items-center gap-3">
              <span className="tnum w-5 text-right text-xs text-muted">{i + 1}</span>
              <Avatar name={s.contestant.name} photo={s.photo} size={30} evicted={s.contestant.status === "evicted"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium group-hover:underline">{s.contestant.name}</span>
                  <span className="tnum shrink-0 font-semibold">{fmt(v)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                    <div className="h-1.5 rounded-full" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: v < 0 ? "var(--neg-3)" : color }} />
                  </div>
                  {sub && <span className="shrink-0 text-[11px] text-muted">{sub(s)}</span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
