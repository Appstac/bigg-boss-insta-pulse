import type { Metadata } from "next";
import { Suspense } from "react";
import { computeAnalytics, type ContestantStats } from "@/lib/analytics";
import { loadDataset } from "@/lib/data";
import { compact, decimal, percent, signed } from "@/lib/format";
import { LeaderboardView, type BoardData } from "@/components/LeaderboardView";

export const metadata: Metadata = { title: "Leaderboards · BB Telugu 10" };

interface Board {
  id: string;
  chip: string;
  title: string;
  desc: string;
  get: (s: ContestantStats) => number | null;
  fmt: (n: number) => string;
  /** Secondary line under each name. */
  context: (s: ContestantStats) => string;
  asc?: boolean;
  /** Shown when nobody has a value yet. */
  empty: string;
}

const followersCtx = (s: ContestantStats) => `${compact(s.followers)} followers`;

function boards(growthSince: string): Board[] {
  const since = growthSince[0].toUpperCase() + growthSince.slice(1);
  return [
    { id: "followers", chip: "Followers", title: "Most followers", desc: "Current Instagram follower count", get: (s) => s.followers, fmt: compact, context: (s) => (s.gain1d != null ? `${signed(s.gain1d)} today` : `@${s.contestant.instagram}`), empty: "" },
    { id: "today", chip: "Today", title: "Biggest gain today", desc: "Change since yesterday's snapshot", get: (s) => s.gain1d, fmt: (n) => signed(n), context: followersCtx, empty: "Fills in after the second day of tracking." },
    { id: "live", chip: "Last 24 h", title: "Biggest gain in 24 hours", desc: "Rolling 24 hours from the 30-minute updates", get: (s) => s.gain24h, fmt: (n) => signed(n), context: (s) => (s.gain1h != null ? `${signed(s.gain1h)} in the last hour` : followersCtx(s)), empty: "Fills in once 24 hours of 30-minute updates exist." },
    { id: "week", chip: "This week", title: "Biggest gain this week", desc: "Last 7 days", get: (s) => s.gain7d, fmt: (n) => signed(n), context: followersCtx, empty: "Fills in after 7 days of tracking." },
    { id: "season", chip: "Season", title: "Biggest gain overall", desc: since, get: (s) => s.gainSeason, fmt: (n) => signed(n), context: followersCtx, empty: "Fills in after the second day of tracking." },
    { id: "growth", chip: "Growth %", title: "Fastest growing", desc: `Growth % ${growthSince}; fairer to smaller accounts`, get: (s) => s.pctSeason, fmt: (n) => percent(n, 1, true), context: followersCtx, empty: "Fills in after the second day of tracking." },
    { id: "momentum", chip: "Momentum", title: "Hottest momentum", desc: "This week's gain vs last week's", get: (s) => s.momentum, fmt: (n) => percent(n, 0, true), context: (s) => `${signed(s.gain7d)} this week`, empty: "Fills in after 14 days of tracking." },
    { id: "engagement", chip: "Engagement", title: "Highest engagement rate", desc: "Median (likes + comments) ÷ followers per post", get: (s) => s.engagementRate, fmt: (n) => percent(n, 2), context: (s) => `${compact(s.avgLikes)} avg likes`, empty: "No posts yet." },
    { id: "likes", chip: "Likes", title: "Most likes per post", desc: "Average likes per post this season", get: (s) => s.avgLikes, fmt: compact, context: (s) => `${s.postsSeason} posts`, empty: "No posts yet." },
    { id: "posting", chip: "Posting", title: "Most active poster", desc: "Posts per day since premiere", get: (s) => s.postsPerDay, fmt: (n) => `${decimal(n)}/day`, context: (s) => `${s.postsLast7d} this week`, empty: "No posts yet." },
    { id: "bestday", chip: "Best day", title: "Biggest single day", desc: "Best one-day follower gain", get: (s) => s.bestDay?.gain ?? null, fmt: (n) => signed(n), context: (s) => (s.bestDay ? new Date(s.bestDay.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : ""), empty: "Fills in after the second day of tracking." },
    { id: "consistent", chip: "Consistency", title: "Most consistent", desc: "Share of days with follower growth", get: (s) => s.positiveDaysPct, fmt: (n) => percent(n, 0), context: (s) => `${s.daysTracked} days tracked`, empty: "Fills in after the second day of tracking." },
    { id: "unfollows", chip: "Unfollows", title: "Largest unfollow day", desc: "Worst one-day change (most negative first)", get: (s) => s.worstDay?.gain ?? null, fmt: (n) => signed(n), context: followersCtx, asc: true, empty: "Fills in after the second day of tracking." },
  ];
}

export default async function Leaderboards() {
  const a = computeAnalytics(await loadDataset());
  const data: BoardData[] = boards(a.growthSince).map((b) => ({
    id: b.id,
    chip: b.chip,
    title: b.title,
    desc: b.desc,
    empty: b.empty,
    rows: a.stats
      .filter((s) => b.get(s) != null)
      .sort((x, y) => (b.asc ? b.get(x)! - b.get(y)! : b.get(y)! - b.get(x)!))
      .map((s) => ({
        id: s.contestant.id,
        name: s.contestant.name,
        photo: s.photo,
        evicted: s.contestant.status === "evicted",
        value: b.get(s)!,
        display: b.fmt(b.get(s)!),
        context: b.context(s),
      })),
  }));

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Rankings</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Leaderboards</h1>
        <p className="mt-1 text-sm text-muted">Pick a category to rank every contestant.</p>
      </div>
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <LeaderboardView boards={data} />
      </Suspense>
    </div>
  );
}
