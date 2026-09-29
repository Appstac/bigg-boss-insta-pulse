import { shortDate } from "./format";
import type { Contestant, Dataset, Post, Snapshot } from "./types";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDate(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istParts(iso: string): { weekday: number; hour: number } {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  // 0 = Monday … 6 = Sunday
  return { weekday: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export interface SeriesPoint {
  date: string;
  followers: number;
  /** Change vs previous tracked day; null on the first day. */
  gain: number | null;
  posts: number;
  following: number;
  /** Rank by followers among all contestants on that date. */
  rank: number | null;
}

export interface PostWithStats extends Post {
  interactions: number;
  er: number | null;
}

export interface ContestantStats {
  contestant: Contestant;
  photo: string | null;
  fullName: string | null;
  daysTracked: number;
  followers: number;
  following: number;
  rank: number;
  /** Rank change vs 7 days ago (positive = climbed). */
  rankChange7d: number | null;
  gain1d: number | null;
  gain7d: number | null;
  gainSeason: number | null;
  pct1d: number | null;
  pct7d: number | null;
  pctSeason: number | null;
  avgDailyGain7d: number | null;
  /** Last 7-day gain vs the 7 days before, in %. */
  momentum: number | null;
  /** followers + 7 × avg daily gain over the last week. */
  projected7d: number | null;
  bestDay: { date: string; gain: number } | null;
  worstDay: { date: string; gain: number } | null;
  positiveDaysPct: number | null;
  shareOfHouseGain: number | null;
  /** Gain per week since premiere; index 0 = week 1. */
  weeklyGain: (number | null)[];
  postsTotal: number;
  postsSeason: number;
  postsLast7d: number;
  postsPerDay: number | null;
  /** Followers gained since premiere per post published since premiere. */
  gainPerPost: number | null;
  avgLikes: number | null;
  medianLikes: number | null;
  avgComments: number | null;
  /**
   * Median of (likes + comments) / followers per post, in %. Median, not mean: collab reels with
   * the show's official accounts can reach 10x a contestant's own following and swamp an average.
   */
  engagementRate: number | null;
  avgInteractions: number | null;
  totalInteractions: number;
  reelsShare: number | null;
  /** Mean interactions of reels vs non-reels. */
  reelAvg: number | null;
  staticAvg: number | null;
  topPost: PostWithStats | null;
  weekdayCounts: number[];
  hourCounts: number[];
  sparkline: number[];
  /** 15-minute points from the last 48 hours. */
  intraday: { t: string; followers: number }[];
  /** Change vs the point closest to 24 hours before the latest one. */
  gain24h: number | null;
  /** Change over the last ~1 hour. */
  gain1h: number | null;
  /** Change across the available 15-minute points in the last 24 h (works before a full day exists). */
  liveGain: number | null;
  series: SeriesPoint[];
  seasonPosts: PostWithStats[];
}

function valueOnOrBefore<T extends { date: string }>(series: T[], date: string): T | undefined {
  let found: T | undefined;
  for (const p of series) {
    if (p.date <= date) found = p;
    else break;
  }
  return found;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

const pct = (delta: number | null, base: number | undefined) =>
  delta == null || !base ? null : (delta / base) * 100;

export function buildSeries(snapshots: Snapshot[]): SeriesPoint[] {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((s, i) => ({
    date: s.date,
    followers: s.followers,
    posts: s.posts,
    following: s.following,
    gain: i === 0 ? null : s.followers - sorted[i - 1].followers,
    rank: null,
  }));
}

export interface HouseStats {
  totalFollowers: number;
  gain1d: number | null;
  gain7d: number | null;
  gainSeason: number | null;
  postsLast7d: number;
  postsSeason: number;
  totalInteractions: number;
  avgEngagement: number | null;
  avgPctSeason: number | null;
  avgPostsPerDay: number | null;
  avgGain7d: number | null;
  dailyGain: { date: string; gain: number }[];
  dailyTotal: { date: string; followers: number }[];
  dailyPosts: { date: string; posts: number }[];
  gain24h: number | null;
  /** Combined followers at each collector run that covered every contestant. */
  intradayTotal: { t: string; followers: number }[];
  /** Combined change across the live window, and the time it starts from. */
  liveGain: number | null;
  liveSince: string | null;
}

export interface Analytics {
  stats: ContestantStats[];
  latestDate: string | null;
  dates: string[];
  weekLabels: string[];
  seasonDay: number | null;
  /** Latest 15-minute run time, if intraday data exists. */
  latestRun: string | null;
  /**
   * "since premiere", or "since 29 Sept" when tracking began after the premiere (Instagram has no
   * follower history, so growth can only be measured from the first snapshot).
   */
  growthSince: string;
  house: HouseStats;
}

export function computeAnalytics(ds: Dataset): Analytics {
  const { contestants, snapshots, posts, season } = ds;
  const premiere = season.premiereDate;
  const dates = [...new Set(snapshots.map((s) => s.date))].sort();
  const latestDate = dates.at(-1) ?? null;

  const byId = new Map<string, Snapshot[]>();
  for (const s of snapshots) (byId.get(s.id) ?? byId.set(s.id, []).get(s.id)!).push(s);
  const postsById = new Map<string, Post[]>();
  for (const p of posts) (postsById.get(p.id) ?? postsById.set(p.id, []).get(p.id)!).push(p);

  const intradayById = new Map<string, { t: string; followers: number }[]>();
  for (const p of ds.intraday ?? []) (intradayById.get(p.id) ?? intradayById.set(p.id, []).get(p.id)!).push({ t: p.t, followers: p.followers });
  for (const pts of intradayById.values()) pts.sort((a, b) => a.t.localeCompare(b.t));
  const changeOver = (pts: { t: string; followers: number }[], hours: number) => {
    const last = pts.at(-1);
    if (!last) return null;
    const target = Date.parse(last.t) - hours * 3600_000;
    // Earliest point at or after the target, but only if it covers most of the window.
    const base = pts.find((p) => Date.parse(p.t) >= target - 10 * 60_000);
    if (!base || base === last || Date.parse(last.t) - Date.parse(base.t) < hours * 3600_000 * 0.75) return null;
    return last.followers - base.followers;
  };

  const seriesById = new Map(contestants.map((c) => [c.id, buildSeries(byId.get(c.id) ?? [])]));

  // Daily rank by followers.
  for (const date of dates) {
    const today = contestants
      .map((c) => ({ id: c.id, p: seriesById.get(c.id)!.find((x) => x.date === date) }))
      .filter((x) => x.p)
      .sort((a, b) => b.p!.followers - a.p!.followers);
    today.forEach((x, i) => (x.p!.rank = i + 1));
  }

  const weekCount = latestDate && latestDate >= premiere ? Math.floor(daysBetween(premiere, latestDate) / 7) + 1 : 0;
  const weekLabels = Array.from({ length: weekCount }, (_, i) => `Week ${i + 1}`);

  const stats: ContestantStats[] = contestants.map((c) => {
    const series = seriesById.get(c.id)!;
    const last = series.at(-1);
    const prev = series.at(-2);
    const baseline = valueOnOrBefore(series, premiere) ?? series[0];
    const d7 = last ? valueOnOrBefore(series, addDays(last.date, -7)) : undefined;
    const d14 = last ? valueOnOrBefore(series, addDays(last.date, -14)) : undefined;

    const gain1d = last && prev ? last.followers - prev.followers : null;
    const gain7d = last && d7 ? last.followers - d7.followers : null;
    const prev7d = d7 && d14 ? d7.followers - d14.followers : null;
    const gainSeason = last && baseline && baseline !== last ? last.followers - baseline.followers : null;
    const avgDailyGain7d = gain7d == null || !last || !d7 ? null : gain7d / Math.max(1, daysBetween(d7.date, last.date));

    const gains = series.filter((p) => p.gain != null) as (SeriesPoint & { gain: number })[];
    const best = gains.reduce<(typeof gains)[number] | null>((b, p) => (!b || p.gain > b.gain ? p : b), null);
    const worst = gains.reduce<(typeof gains)[number] | null>((b, p) => (!b || p.gain < b.gain ? p : b), null);

    const weeklyGain = weekLabels.map((_, w) => {
      const weekStart = addDays(premiere, 7 * w);
      const weekEnd = addDays(premiere, 7 * w + 6);
      // Baseline = last snapshot before the week; if tracking began mid-week, its first snapshot
      // (that week is then partial, flagged in the table).
      const start = valueOnOrBefore(series, addDays(weekStart, -1)) ?? series.find((p) => p.date >= weekStart && p.date <= weekEnd);
      const end = valueOnOrBefore(series, weekEnd);
      return start && end && end.date > start.date ? end.followers - start.followers : null;
    });

    const followers = last?.followers ?? 0;
    const all = (postsById.get(c.id) ?? []).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const seasonPosts: PostWithStats[] = all
      .filter((p) => istDate(p.timestamp) >= premiere)
      .map((p) => {
        const interactions = (p.likes ?? 0) + p.comments;
        return { ...p, interactions, er: followers && p.likes != null ? (interactions / followers) * 100 : null };
      });
    const since7 = latestDate ? addDays(latestDate, -6) : "";
    const postsLast7d = seasonPosts.filter((p) => istDate(p.timestamp) >= since7).length;
    // Collected posts accumulate daily and are backfilled to the premiere, so count them directly.
    const postsSeason = seasonPosts.length;
    const seasonDays = latestDate ? Math.max(1, daysBetween(premiere, latestDate) + 1) : null;

    // Posts with hidden like counts would drag averages down, so like-based metrics use visible-like posts only.
    const liked = seasonPosts.filter((p) => p.likes != null);
    const interactions = liked.map((p) => p.interactions);
    const reels = liked.filter((p) => p.type === "REEL" || p.type === "VIDEO");
    const statics = liked.filter((p) => p.type !== "REEL" && p.type !== "VIDEO");
    const top = liked.reduce<PostWithStats | null>((b, p) => (!b || p.interactions > b.interactions ? p : b), null);

    const weekdayCounts = Array(7).fill(0);
    const hourCounts = Array(24).fill(0);
    for (const p of seasonPosts) {
      const { weekday, hour } = istParts(p.timestamp);
      weekdayCounts[weekday]++;
      hourCounts[hour]++;
    }

    return {
      contestant: c,
      photo: ds.photos[c.id] ?? null,
      fullName: ds.profiles[c.id]?.fullName || null,
      daysTracked: series.length,
      followers,
      following: last?.following ?? 0,
      rank: last?.rank ?? contestants.length,
      rankChange7d: last?.rank != null && d7?.rank != null ? d7.rank - last.rank : null,
      gain1d,
      gain7d,
      gainSeason,
      pct1d: pct(gain1d, prev?.followers),
      pct7d: pct(gain7d, d7?.followers),
      pctSeason: pct(gainSeason, baseline?.followers),
      avgDailyGain7d,
      momentum: gain7d != null && prev7d != null && prev7d !== 0 ? ((gain7d - prev7d) / Math.abs(prev7d)) * 100 : null,
      projected7d: avgDailyGain7d != null ? Math.round(followers + avgDailyGain7d * 7) : null,
      bestDay: best ? { date: best.date, gain: best.gain } : null,
      worstDay: worst ? { date: worst.date, gain: worst.gain } : null,
      positiveDaysPct: gains.length ? (gains.filter((g) => g.gain > 0).length / gains.length) * 100 : null,
      shareOfHouseGain: null,
      weeklyGain,
      postsTotal: last?.posts ?? 0,
      postsSeason,
      postsLast7d,
      postsPerDay: seasonDays ? postsSeason / seasonDays : null,
      gainPerPost: (() => {
        // Same window for both sides: posts published since the follower baseline snapshot.
        const since = baseline && baseline.date > premiere ? baseline.date : premiere;
        const n = seasonPosts.filter((p) => istDate(p.timestamp) >= since).length;
        return gainSeason != null && n ? gainSeason / n : null;
      })(),
      avgLikes: mean(liked.map((p) => p.likes!)),
      medianLikes: median(liked.map((p) => p.likes!)),
      avgComments: mean(seasonPosts.map((p) => p.comments)),
      engagementRate: median(liked.map((p) => p.er!).filter((x) => x != null)),
      avgInteractions: mean(interactions),
      totalInteractions: interactions.reduce((a, b) => a + b, 0),
      reelsShare: seasonPosts.length
        ? (seasonPosts.filter((p) => p.type === "REEL" || p.type === "VIDEO").length / seasonPosts.length) * 100
        : null,
      reelAvg: mean(reels.map((p) => p.interactions)),
      staticAvg: mean(statics.map((p) => p.interactions)),
      topPost: top,
      weekdayCounts,
      hourCounts,
      sparkline: series.slice(-14).map((p) => p.followers),
      intraday: intradayById.get(c.id) ?? [],
      gain24h: changeOver(intradayById.get(c.id) ?? [], 24),
      gain1h: changeOver(intradayById.get(c.id) ?? [], 1),
      liveGain: windowChange(intradayById.get(c.id) ?? []),
      series,
      seasonPosts,
    };
  });

  const positiveSeasonGain = stats.reduce((a, s) => a + Math.max(0, s.gainSeason ?? 0), 0);
  for (const s of stats) {
    s.shareOfHouseGain =
      positiveSeasonGain && s.gainSeason != null ? (Math.max(0, s.gainSeason) / positiveSeasonGain) * 100 : null;
  }

  const sumOrNull = (xs: (number | null)[]) =>
    xs.every((x) => x == null) ? null : xs.reduce<number>((a, b) => a + (b ?? 0), 0);
  const avgOf = (xs: (number | null)[]) => mean(xs.filter((x): x is number => x != null));

  const postsByDate = new Map<string, number>();
  for (const s of stats) for (const p of s.seasonPosts) {
    const d = istDate(p.timestamp);
    postsByDate.set(d, (postsByDate.get(d) ?? 0) + 1);
  }

  return {
    stats,
    latestDate,
    dates,
    weekLabels,
    seasonDay: latestDate && latestDate >= premiere ? daysBetween(premiere, latestDate) + 1 : null,
    growthSince: !dates[0] || dates[0] <= premiere ? "since premiere" : `since ${shortDate(dates[0])}`,
    latestRun: [...(ds.intraday ?? [])].map((p) => p.t).sort().at(-1) ?? null,
    house: {
      totalFollowers: stats.reduce((a, s) => a + s.followers, 0),
      gain1d: sumOrNull(stats.map((s) => s.gain1d)),
      gain7d: sumOrNull(stats.map((s) => s.gain7d)),
      gainSeason: sumOrNull(stats.map((s) => s.gainSeason)),
      postsLast7d: stats.reduce((a, s) => a + s.postsLast7d, 0),
      postsSeason: stats.reduce((a, s) => a + s.postsSeason, 0),
      totalInteractions: stats.reduce((a, s) => a + s.totalInteractions, 0),
      avgEngagement: avgOf(stats.map((s) => s.engagementRate)),
      avgPctSeason: avgOf(stats.map((s) => s.pctSeason)),
      avgPostsPerDay: avgOf(stats.map((s) => s.postsPerDay)),
      avgGain7d: avgOf(stats.map((s) => s.gain7d)),
      dailyGain: dates.slice(1).map((date) => ({
        date,
        gain: stats.reduce((a, s) => a + (s.series.find((p) => p.date === date)?.gain ?? 0), 0),
      })),
      dailyTotal: dates.map((date) => ({
        date,
        followers: stats.reduce((a, s) => a + (s.series.find((p) => p.date === date)?.followers ?? 0), 0),
      })),
      dailyPosts: dates.filter((d) => d >= premiere).map((date) => ({ date, posts: postsByDate.get(date) ?? 0 })),
      gain24h: sumOrNull(stats.map((s) => s.gain24h)),
      ...(() => {
        const pts = last24h(intradayTotals(ds.intraday ?? [], contestants.length));
        return { liveGain: pts.length >= 2 ? pts.at(-1)!.followers - pts[0].followers : null, liveSince: pts.length >= 2 ? pts[0].t : null };
      })(),
      intradayTotal: intradayTotals(ds.intraday ?? [], contestants.length),
    },
  };
}

/** Points within 24 hours of the latest one. */
function last24h<T extends { t: string }>(pts: T[]): T[] {
  const last = pts.at(-1);
  return last ? pts.filter((p) => Date.parse(last.t) - Date.parse(p.t) <= 24 * 3600_000) : [];
}

function windowChange(pts: { t: string; followers: number }[]): number | null {
  const w = last24h(pts);
  return w.length >= 2 ? w.at(-1)!.followers - w[0].followers : null;
}

/** Sum followers per run time, keeping only runs that captured every contestant. */
function intradayTotals(points: { t: string; id: string; followers: number }[], expected: number) {
  const byT = new Map<string, { n: number; sum: number }>();
  for (const p of points) {
    const e = byT.get(p.t) ?? { n: 0, sum: 0 };
    e.n++;
    e.sum += p.followers;
    byT.set(p.t, e);
  }
  return [...byT.entries()]
    .filter(([, e]) => e.n >= expected)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, e]) => ({ t, followers: e.sum }));
}

/** Shape sent to client components (drops per-post detail). */
export type ClientStats = Omit<ContestantStats, "seasonPosts">;

export function toClient(s: ContestantStats): ClientStats {
  const rest: Partial<ContestantStats> = { ...s };
  delete rest.seasonPosts;
  return rest as ClientStats;
}
