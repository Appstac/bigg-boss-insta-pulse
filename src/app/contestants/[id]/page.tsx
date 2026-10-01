import Link from "next/link";
import { notFound } from "next/navigation";
import { computeAnalytics, istDate, mean, toClient } from "@/lib/analytics";
import { loadContestants, loadDataset } from "@/lib/data";
import { compact, decimal, full, istTime, percent, shortDate, signed, WEEKDAYS } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { AreaTrend, DailyBars, RankHistory, WeeklyBars } from "@/components/Charts";
import { PostEngagementBars } from "@/components/ContestantCharts";
import { Icon } from "@/components/Icon";
import { PostCard } from "@/components/PostCard";
import { PostingHeatmap } from "@/components/PostingHeatmap";
import { Delta, RankBadge, RankChange, Section, StatTile, StatusBadge, VsAverage } from "@/components/ui";

export function generateStaticParams() {
  return loadContestants().map((c) => ({ id: c.id }));
}

export async function generateMetadata(props: PageProps<"/contestants/[id]">) {
  const { id } = await props.params;
  const c = (await loadDataset()).contestants.find((x) => x.id === id);
  return { title: c ? `${c.name} · Instagram stats · BB Telugu 10` : "Not found" };
}

export default async function ContestantPage(props: PageProps<"/contestants/[id]">) {
  const { id } = await props.params;
  const ds = await loadDataset();
  const a = computeAnalytics(ds);
  const idx = a.stats.findIndex((x) => x.contestant.id === id);
  if (idx < 0) notFound();
  const s = a.stats[idx];
  const c = s.contestant;
  const total = a.stats.length;
  const bio = ds.profiles[c.id]?.biography;
  const byRank = [...a.stats].sort((x, y) => x.rank - y.rank);
  const pos = byRank.findIndex((x) => x.contestant.id === id);
  const prev = byRank[(pos - 1 + total) % total];
  const next = byRank[(pos + 1) % total];

  const rankOf = (get: (x: typeof s) => number | null) => {
    const sorted = [...a.stats].sort((x, y) => (get(y) ?? -Infinity) - (get(x) ?? -Infinity));
    return sorted.findIndex((x) => x.contestant.id === id) + 1;
  };
  const houseMax = (get: (x: typeof s) => number | null) => Math.max(...a.stats.map((x) => get(x) ?? 0));
  const houseAvg = (get: (x: typeof s) => number | null) => mean(a.stats.map(get).filter((v): v is number => v != null));

  const busiestDay = s.weekdayCounts.indexOf(Math.max(...s.weekdayCounts));
  const busiestHour = s.hourCounts.indexOf(Math.max(...s.hourCounts));
  const topPosts = [...s.seasonPosts].filter((p) => p.likes != null).sort((x, y) => y.interactions - x.interactions).slice(0, 8);
  const postPoints = s.seasonPosts.map((p) => ({ date: istDate(p.timestamp), label: p.postId, interactions: p.interactions, er: p.er, type: p.type }));
  const markers = c.evictedOn ? [{ date: c.evictedOn, label: "Evicted" }] : [];
  const reelLift = s.reelAvg != null && s.staticAvg ? ((s.reelAvg - s.staticAvg) / s.staticAvg) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/contestants" className="text-muted hover:text-ink">← All contestants</Link>
        <div className="flex gap-2">
          <Link href={`/contestants/${prev.contestant.id}`} className="flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-ink-2 hover:bg-surface-2">
            ← <Avatar name={prev.contestant.name} photo={prev.photo} size={18} /> <span className="hidden sm:inline">{prev.contestant.name.split(" ")[0]}</span>
          </Link>
          <Link href={`/contestants/${next.contestant.id}`} className="flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-ink-2 hover:bg-surface-2">
            <span className="hidden sm:inline">{next.contestant.name.split(" ")[0]}</span> <Avatar name={next.contestant.name} photo={next.photo} size={18} /> →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="card relative overflow-hidden">
        <div className="brand-bg h-28 opacity-90 sm:h-36" />
        <div className="px-5 pb-5 sm:px-8 sm:pb-7">
          <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-fit rounded-3xl bg-surface p-1.5 shadow-lg">
                <Avatar name={c.name} photo={s.photo} size={120} rounded="xl" evicted={c.status === "evicted"} />
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{c.name}</h1>
                  <RankBadge rank={s.rank} />
                </div>
                <p className="text-ink-2">{c.teluguName} · {c.profession}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={c.status} />
                  {c.instagram && (
                    <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-ink-2 hover:text-ink">
                      <Icon name="ig" size={13} /> @{c.instagram}
                    </a>
                  )}
                </div>
                {bio && <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-muted">{bio}</p>}
              </div>
            </div>
            <div className="flex items-end gap-6 sm:text-right">
              <div>
                <div className="text-xs font-medium text-muted">Followers</div>
                <div className="tnum text-4xl font-bold tracking-tight">{compact(s.followers)}</div>
                <div className="mt-1 flex items-center gap-2 sm:justify-end">
                  <Delta value={s.gain1d} pill />
                  <span className="text-xs text-muted">today</span>
                </div>
              </div>
              <Link href={`/compare?ids=${c.id}`} className="hidden rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-page sm:block">
                Compare
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Icon name="rank" />} label="Rank by followers" value={`#${s.rank}`} sub={<>of {total} · 7d <RankChange value={s.rankChange7d} /></>} />
        <StatTile icon={<Icon name="trend" />} label="Last 7 days" value={<Delta value={s.gain7d} />} sub={s.gain7d == null ? "Fills in after 7 days of tracking" : <><Delta value={s.pct7d} kind="percent" /> · #{rankOf((x) => x.gain7d)} in house</>} />
        <StatTile icon={<Icon name="star" />} label={a.growthSince[0].toUpperCase() + a.growthSince.slice(1)} value={<Delta value={s.gainSeason} />} sub={s.gainSeason == null ? "Fills in after the second day" : <><Delta value={s.pctSeason} kind="percent" /> · #{rankOf((x) => x.gainSeason)} in house</>} />
        <StatTile icon={<Icon name="bolt" />} label="Momentum" value={<Delta value={s.momentum} kind="percent" />} sub={s.momentum == null ? "Appears after 14 days of tracking" : "This week vs last week"} />
        <StatTile icon={<Icon name="calendar" />} label="Projected in 7 days" value={compact(s.projected7d)} sub={s.projected7d == null ? "Needs 7 days of data" : `At ${compact(s.avgDailyGain7d)}/day recent pace`} />
        <StatTile icon={<Icon name="heart" />} label="Engagement rate" value={percent(s.engagementRate, 2)} sub={`#${rankOf((x) => x.engagementRate)} of ${total} · per post`} />
        <StatTile icon={<Icon name="heart" />} label="Avg likes / post" value={compact(s.avgLikes)} sub={`Median ${compact(s.medianLikes)} · ${compact(s.avgComments == null ? null : Math.round(s.avgComments))} comments`} />
        <StatTile icon={<Icon name="image" />} label="Posts since premiere" value={full(s.postsSeason)} sub={`${decimal(s.postsPerDay)}/day · ${s.postsLast7d} this week`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Follower trend" desc="One snapshot per day (IST)" className="lg:col-span-2">
          <AreaTrend data={s.series.map((p) => ({ date: p.date, value: p.followers }))} label="Followers" premiereDate={ds.season.premiereDate} markers={markers} />
        </Section>
        <Section title="Compared with the house" desc="Bar = this contestant · tick = house average">
          <div className="space-y-5">
            <VsAverage label={`Growth ${a.growthSince}`} value={s.pctSeason} avg={houseAvg((x) => x.pctSeason)} max={houseMax((x) => x.pctSeason)} fmt={(n) => percent(n, 1)} />
            {s.gain7d != null && <VsAverage label="Gain last 7 days" value={s.gain7d} avg={houseAvg((x) => x.gain7d)} max={houseMax((x) => x.gain7d)} fmt={compact} />}
            <VsAverage label="Engagement rate" value={s.engagementRate} avg={houseAvg((x) => x.engagementRate)} max={houseMax((x) => x.engagementRate)} fmt={(n) => percent(n, 2)} />
            <VsAverage label="Avg likes / post" value={s.avgLikes} avg={houseAvg((x) => x.avgLikes)} max={houseMax((x) => x.avgLikes)} fmt={compact} />
            <VsAverage label="Posts per day" value={s.postsPerDay} avg={houseAvg((x) => x.postsPerDay)} max={houseMax((x) => x.postsPerDay)} fmt={(n) => decimal(n)} />
            <VsAverage label="Share of new followers" value={s.shareOfHouseGain} avg={100 / total} max={houseMax((x) => x.shareOfHouseGain)} fmt={(n) => percent(n, 1)} />
          </div>
        </Section>
      </div>

      {s.intraday.length >= 2 && (
        <Section title="Last 48 hours" desc={
            <>
              Every ~30 minutes ·{" "}
              {s.gain24h != null ? (
                <><Delta value={s.gain24h} /> in 24 h</>
              ) : (
                <><Delta value={s.liveGain} /> since {istTime(s.intraday[0].t)} IST</>
              )}
              {s.gain1h != null && <> · <Delta value={s.gain1h} /> in the last hour</>}
            </>
          }>
          <AreaTrend data={s.intraday.map((p) => ({ date: p.t, value: p.followers }))} label="Followers" xFormat="time" withRange={false} height={220} />
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Daily follower gain">
          <DailyBars data={s.series.map((p) => ({ date: p.date, value: p.gain }))} label="Followers gained" premiereDate={ds.season.premiereDate} />
        </Section>
        <Section title="Rank history" desc={`Position among all ${total} contestants by followers`}>
          <RankHistory stats={[toClient(s)]} slots={{ [c.id]: 0 }} total={total} height={240} />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Weekly gains" desc="Followers gained in each show week" className="lg:col-span-2">
          <WeeklyBars stats={[toClient(s)]} slots={{ [c.id]: 0 }} weekLabels={a.weekLabels} height={240} hideEmpty />
        </Section>
        <Section title="Highlights">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Best day", s.bestDay ? <><Delta value={s.bestDay.gain} /> · {shortDate(s.bestDay.date)}</> : "—"],
              ["Worst day", s.worstDay && s.series.filter((p) => p.gain != null).length > 1 ? <><Delta value={s.worstDay.gain} /> · {shortDate(s.worstDay.date)}</> : "—"],
              ["Days with growth", percent(s.positiveDaysPct, 0)],
              ["Gained per post", s.gainPerPost == null ? "—" : full(s.gainPerPost)],
              ["Reels share", percent(s.reelsShare, 0)],
              ["Reels vs photos", reelLift == null ? "—" : <Delta value={reelLift} kind="percent" />],
              ["Usual posting day", s.seasonPosts.length ? WEEKDAYS[busiestDay] : "—"],
              ["Usual posting hour", s.seasonPosts.length ? `${busiestHour}:00 IST` : "—"],
              ["Following", full(s.following)],
              ["Total posts on profile", full(s.postsTotal)],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                <dt className="text-muted">{k}</dt>
                <dd className="tnum text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Likes + comments per post" desc="Every post since premiere, oldest to newest">
          <PostEngagementBars posts={postPoints} />
        </Section>
        <Section title="Reels vs photos & carousels" desc="Average likes + comments per post">
          {s.reelAvg == null && s.staticAvg == null ? (
            <p className="text-sm text-muted">No posts since premiere.</p>
          ) : (
            <div className="space-y-5 pt-2">
              {[
                ["Reels & videos", s.reelAvg],
                ["Photos & carousels", s.staticAvg],
              ].map(([label, v]) => (
                <div key={String(label)}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-ink-2">{label}</span>
                    <span className="tnum font-semibold">{compact(v as number | null)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-surface-2">
                    <div className="h-3 rounded-full" style={{ width: `${((v as number | null) ?? 0) / Math.max(s.reelAvg ?? 0, s.staticAvg ?? 0, 1) * 100}%`, background: "var(--series-1)" }} />
                  </div>
                </div>
              ))}
              {reelLift != null && (
                <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
                  Reels get <strong className="text-ink">{percent(Math.abs(reelLift), 0)} {reelLift >= 0 ? "more" : "less"}</strong> interaction than static posts for {c.name.split(" ")[0]}.
                </p>
              )}
            </div>
          )}
        </Section>
      </div>

      <Section title="When they post" desc="Posts since premiere by weekday and time of day (IST)">
        <PostingHeatmap posts={s.seasonPosts} />
      </Section>

      <Section title="Top posts this season" desc="Ranked by likes + comments. Opens on Instagram.">
        {topPosts.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {topPosts.map((p, i) => (
              <PostCard key={p.postId} post={p} rank={i + 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No posts since premiere.</p>
        )}
      </Section>

      <div className="flex justify-center">
        <Link href={`/compare?ids=${c.id},${(s.rank === 1 ? byRank[1] : byRank[0]).contestant.id}`} className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-page">
          Compare {c.name.split(" ")[0]} with {(s.rank === 1 ? byRank[1] : byRank[0]).contestant.name.split(" ")[0]} →
        </Link>
      </div>
      <p className="text-center text-xs text-muted">Gained {signed(s.gainSeason)} {a.growthSince} · tracked for {s.daysTracked} {s.daysTracked === 1 ? "day" : "days"}</p>
    </div>
  );
}
