import type { Metadata } from "next";
import Link from "next/link";
import { computeAnalytics, type ContestantStats } from "@/lib/analytics";
import { loadDataset } from "@/lib/data";
import { compact, decimal, percent, signed } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = { title: "Leaderboards · BB Telugu 10" };

interface Board {
  title: string;
  desc: string;
  get: (s: ContestantStats) => number | null;
  fmt: (n: number) => string;
  asc?: boolean;
}

const BOARDS: Board[] = [
  { title: "Most followers", desc: "Current follower count", get: (s) => s.followers, fmt: compact },
  { title: "Biggest gain today", desc: "Change since yesterday's snapshot", get: (s) => s.gain1d, fmt: (n) => signed(n) },
  { title: "Biggest gain this week", desc: "Last 7 days", get: (s) => s.gain7d, fmt: (n) => signed(n) },
  { title: "Biggest gain this season", desc: "Since premiere", get: (s) => s.gainSeason, fmt: (n) => signed(n) },
  { title: "Fastest growing", desc: "Growth % since premiere", get: (s) => s.pctSeason, fmt: (n) => percent(n, 1, true) },
  { title: "Hottest momentum", desc: "This week's gain vs last week's", get: (s) => s.momentum, fmt: (n) => percent(n, 0, true) },
  { title: "Highest engagement rate", desc: "Median (likes + comments) ÷ followers per post", get: (s) => s.engagementRate, fmt: (n) => percent(n, 2) },
  { title: "Most likes per post", desc: "Average this season", get: (s) => s.avgLikes, fmt: compact },
  { title: "Most active poster", desc: "Posts per day since premiere", get: (s) => s.postsPerDay, fmt: (n) => decimal(n) },
  { title: "Biggest single day", desc: "Best one-day follower gain", get: (s) => s.bestDay?.gain ?? null, fmt: (n) => signed(n) },
  { title: "Most consistent", desc: "% of days with follower growth", get: (s) => s.positiveDaysPct, fmt: (n) => percent(n, 0) },
  { title: "Largest unfollow day", desc: "Worst one-day change", get: (s) => s.worstDay?.gain ?? null, fmt: (n) => signed(n), asc: true },
];

export default async function Leaderboards() {
  const a = computeAnalytics(await loadDataset());
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Rankings</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Leaderboards</h1>
        <p className="text-sm text-muted">Top 5 contestants in each category.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BOARDS.map((b) => {
          const rows = a.stats
            .filter((s) => b.get(s) != null)
            .sort((x, y) => (b.asc ? b.get(x)! - b.get(y)! : b.get(y)! - b.get(x)!))
            .slice(0, 5);
          const max = Math.max(...rows.map((s) => Math.abs(b.get(s)!)), 1e-9);
          return (
            <section key={b.title} className="card p-4">
              <h2 className="font-semibold">{b.title}</h2>
              <p className="mb-3 text-xs text-muted">{b.desc}</p>
              {rows.length ? (
                <ol className="space-y-2.5">
                  {rows.map((s, i) => {
                    const v = b.get(s)!;
                    return (
                      <li key={s.contestant.id} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <Link href={`/contestants/${s.contestant.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                            <span className="tnum w-3 text-muted">{i + 1}</span>
                            <Avatar name={s.contestant.name} photo={s.photo} size={i === 0 ? 32 : 24} evicted={s.contestant.status === "evicted"} />
                            {s.contestant.name}
                            {s.contestant.status === "evicted" && <span className="ml-1 text-xs text-muted">(evicted)</span>}
                          </Link>
                          <span className="tnum font-medium">{b.fmt(v)}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                          <div className="h-1.5 rounded-full" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: "var(--series-1)" }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-muted">Needs at least two days of data.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
