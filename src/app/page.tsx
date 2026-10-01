import Link from "next/link";
import { computeAnalytics, toClient } from "@/lib/analytics";
import { loadDataset } from "@/lib/data";
import { compact, decimal, full, percent, signed } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { DailyBars, AreaTrend, GrowthEngagementScatter } from "@/components/Charts";
import { ContestantGrid } from "@/components/ContestantGrid";
import { GainHeatmap } from "@/components/GainHeatmap";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RankedBars } from "@/components/RankedBars";
import { Sparkline } from "@/components/Sparkline";
import { TrendPanel } from "@/components/TrendPanel";
import { Delta, Section, SectionHeading, StatTile } from "@/components/ui";
import { WeeklyTable } from "@/components/WeeklyTable";
import { Icon } from "@/components/Icon";
import { istTime } from "@/lib/format";

const SUBNAV = [
  ["overview", "Overview"],
  ["contestants", "Contestants"],
  ["trends", "Trends"],
  ["growth", "Growth"],
  ["engagement", "Engagement"],
  ["activity", "Activity"],
  ["table", "Full table"],
];

export default async function Dashboard() {
  const ds = await loadDataset();
  const a = computeAnalytics(ds);
  const { stats, house } = a;
  const client = stats.map(toClient);
  const active = stats.filter((s) => s.contestant.status === "active");
  const movers = [...stats].filter((s) => s.gain1d != null).sort((x, y) => y.gain1d! - x.gain1d!).slice(0, 5);
  const climbers = [...stats].filter((s) => (s.rankChange7d ?? 0) > 0).sort((x, y) => y.rankChange7d! - x.rankChange7d!).slice(0, 3);
  const defaultTrend = [...stats].sort((x, y) => (y.gainSeason ?? 0) - (x.gainSeason ?? 0)).slice(0, 5).map((s) => s.contestant.id);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section id="overview" className="hero-bg card relative overflow-hidden p-5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-up-bg px-2.5 py-1 text-up">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--up)]" /> Season live
              </span>
              {a.seasonDay && <span className="rounded-full border border-line px-2.5 py-1">Day {a.seasonDay}</span>}
              <span className="rounded-full border border-line px-2.5 py-1">Star Maa · JioHotstar</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Bigg Boss Telugu 10
              <span className="brand-text block">Instagram Pulse</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-2 sm:text-base">
              Live follower counts, growth, posting and engagement for all {ds.contestants.length} contestants. {active.length} in the house, {ds.contestants.length - active.length} evicted.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/compare" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-page">Compare contestants</Link>
              <Link href="/leaderboards" className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold hover:bg-surface-2">Leaderboards</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 lg:max-w-sm lg:justify-end">
            {[...stats].sort((x, y) => x.rank - y.rank).map((s) => (
              <Link key={s.contestant.id} href={`/contestants/${s.contestant.id}`} title={`${s.contestant.name} · ${compact(s.followers)}`} className="transition-transform hover:-translate-y-0.5">
                <Avatar name={s.contestant.name} photo={s.photo} size={44} evicted={s.contestant.status === "evicted"} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Icon name="users" />}
          label="Combined followers"
          value={compact(house.totalFollowers)}
          sub={<>Today <Delta value={house.gain1d} /></>}
          aside={<Sparkline values={house.dailyTotal.slice(-14).map((d) => d.followers)} width={88} height={34} />}
        />
        <StatTile icon={<Icon name="trend" />} label="Gained this week" value={<Delta value={house.gain7d} />} sub={house.avgGain7d == null ? "Fills in after 7 days of tracking" : `Avg ${compact(house.avgGain7d)} per contestant`} />
        <StatTile icon={<Icon name="star" />} label={`Gained ${a.growthSince}`} value={<Delta value={house.gainSeason} />} sub={`Avg growth ${percent(house.avgPctSeason, 1)}`} />
        <StatTile icon={<Icon name="heart" />} label="Likes + comments" value={compact(house.totalInteractions)} sub={`${full(house.postsSeason)} posts · typical engagement ${percent(house.avgEngagement, 1)}`} />
      </div>

      {/* Live: 30-minute data from the last 24 hours */}
      <Section
        title="Live · last 24 hours"
        desc={a.latestRun ? `Refreshed about every 30 minutes · latest run ${istTime(a.latestRun)} IST` : "Refreshed about every 30 minutes"}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-up-bg px-2.5 py-1 text-xs font-medium text-up">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--up)]" /> Live
          </span>
        }
      >
        {house.intradayTotal.length >= 2 ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="mb-1 text-sm text-ink-2">
                Combined followers ·{" "}
                {house.gain24h != null ? (
                  <><Delta value={house.gain24h} /> in 24 h</>
                ) : (
                  <><Delta value={house.liveGain} /> since {house.liveSince ? istTime(house.liveSince) : ""} IST</>
                )}
              </div>
              <AreaTrend data={house.intradayTotal.map((p) => ({ date: p.t, value: p.followers }))} label="Combined followers" format="compact" xFormat="time" withRange={false} height={240} />
            </div>
            <div className="lg:col-span-2">
              <div className="mb-3 text-sm text-ink-2">
                Biggest gains {house.gain24h != null ? "in the last 24 h" : `since ${house.liveSince ? istTime(house.liveSince) : ""} IST`} · last hour on the right
              </div>
              <RankedBars stats={stats} get={(s) => s.gain24h ?? s.liveGain} fmt={(n) => signed(n)} sub={(s) => (s.gain1h == null ? "" : `${signed(s.gain1h)} 1h`)} limit={8} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Live tracking has started. The 24-hour chart fills in as 30-minute updates arrive.</p>
        )}
      </Section>

      {/* Sticky section nav */}
      <nav className="z-20 sm:sticky sm:top-[64px] -mx-4 overflow-x-auto border-b border-line bg-page/85 px-4 py-2 backdrop-blur-xl no-scrollbar">
        <div className="flex gap-1">
          {SUBNAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Movers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Today's top movers" desc="Biggest follower gains since yesterday" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {movers.map((s, i) => (
              <Link key={s.contestant.id} href={`/contestants/${s.contestant.id}`} className="group relative flex flex-col items-center rounded-2xl border border-line bg-surface-2/50 p-3 text-center transition-colors hover:bg-surface-2">
                <span className="absolute left-2 top-2 tnum text-xs font-bold text-muted">{i + 1}</span>
                <Avatar name={s.contestant.name} photo={s.photo} size={64} evicted={s.contestant.status === "evicted"} />
                <div className="mt-2 line-clamp-1 text-sm font-semibold">{s.contestant.name}</div>
                <Delta value={s.gain1d} pill className="mt-1.5" />
                <div className="tnum mt-1 text-[11px] text-muted">{percent(s.pct1d, 2, true)}</div>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Rank climbers" desc="Most places gained in 7 days">
          {climbers.length ? (
            <ul className="space-y-3">
              {climbers.map((s) => (
                <li key={s.contestant.id}>
                  <Link href={`/contestants/${s.contestant.id}`} className="flex items-center gap-3 hover:underline">
                    <Avatar name={s.contestant.name} photo={s.photo} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s.contestant.name}</div>
                      <div className="text-xs text-muted">Now #{s.rank} · {compact(s.followers)}</div>
                    </div>
                    <span className="rounded-full bg-up-bg px-2 py-0.5 text-xs font-bold text-up">▲ {s.rankChange7d}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              {stats.every((s) => s.rankChange7d == null) ? "Rank changes appear after 7 days of tracking." : "No rank changes in the last week."}
            </p>
          )}
        </Section>
      </div>

      <SectionHeading id="contestants" eyebrow="All contestants" title="The house at a glance" desc="Tap a card for the full profile, or press + on several cards to compare them." />
      <ContestantGrid stats={client} growthLabel={a.growthSince} />

      <SectionHeading id="trends" eyebrow="Trends" title="Follower trend" desc={`Pick up to 6 contestants and switch between follower count, % growth ${a.growthSince} and daily gain.`} />
      <section className="card p-4 sm:p-5">
        <TrendPanel growthLabel={a.growthSince} stats={client} initial={defaultTrend} premiereDate={ds.season.premiereDate} />
      </section>

      <SectionHeading id="growth" eyebrow="Growth" title="Who is growing, and when" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Combined followers" desc="All contestants added together">
          <AreaTrend data={house.dailyTotal.map((d) => ({ date: d.date, value: d.followers }))} label="Combined followers" format="compact" premiereDate={ds.season.premiereDate} height={260} />
        </Section>
        <Section title="House daily gain" desc="Followers gained across all contestants each day">
          <div className="pt-[44px]">
            <DailyBars data={house.dailyGain.map((d) => ({ date: d.date, value: d.gain }))} label="Followers gained" premiereDate={ds.season.premiereDate} height={260} />
          </div>
        </Section>
      </div>
      <Section title="Daily follower change" desc="Followers gained or lost by each contestant per day (last 3 weeks), biggest gainers first.">
        <GainHeatmap stats={stats} dates={a.dates} premiereDate={ds.season.premiereDate} />
      </Section>
      <div className="grid gap-4 lg:grid-cols-5">
        <Section title="Weekly gains" desc="★ marks each week's top gainer" className="lg:col-span-3">
          <WeeklyTable stats={stats} weekLabels={a.weekLabels} premiereDate={ds.season.premiereDate} trackingStart={a.dates[0] ?? null} growthSince={a.growthSince} />
        </Section>
        <Section title="Share of new followers" desc={`Each contestant's slice of all followers gained ${a.growthSince}`} className="lg:col-span-2">
          <RankedBars stats={stats} get={(s) => s.shareOfHouseGain} fmt={(n) => percent(n, 1)} sub={(s) => signed(s.gainSeason)} limit={10} />
        </Section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Fastest growing" desc={`% growth ${a.growthSince}: fairer to smaller accounts`}>
          <RankedBars stats={stats} get={(s) => s.pctSeason} fmt={(n) => percent(n, 1, true)} sub={(s) => compact(s.followers)} limit={8} />
        </Section>
        <Section title="Momentum" desc="This week's gain vs last week's">
          <RankedBars stats={stats} get={(s) => s.momentum} fmt={(n) => percent(n, 0, true)} sub={(s) => signed(s.gain7d)} limit={8} empty="Momentum compares this week with last week, so it appears after 14 days of tracking." />
        </Section>
      </div>

      <SectionHeading id="engagement" eyebrow="Engagement" title="Who converts attention into interaction" desc="Engagement rate = median (likes + comments) ÷ followers per post since premiere. Median, so one viral collab reel doesn't distort it." />
      <Section title="Growth vs engagement" desc="Every contestant on one map">
        <GrowthEngagementScatter growthLabel={a.growthSince} stats={client} avgX={house.avgPctSeason} avgY={house.avgEngagement} />
      </Section>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Engagement rate">
          <RankedBars stats={stats} get={(s) => s.engagementRate} fmt={(n) => percent(n, 2)} limit={8} />
        </Section>
        <Section title="Avg likes per post">
          <RankedBars stats={stats} get={(s) => s.avgLikes} fmt={compact} limit={8} />
        </Section>
        <Section title="Followers gained per post" desc={`Followers gained ${a.growthSince} ÷ posts in that time`}>
          <RankedBars stats={stats} get={(s) => s.gainPerPost} fmt={(n) => full(n)} sub={(s) => `${s.postsSeason} posts`} limit={8} />
        </Section>
      </div>

      <SectionHeading id="activity" eyebrow="Activity" title="Posting activity" desc="Most contestant accounts are run by their teams while they are inside the house." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Posts per day across the house" className="lg:col-span-2">
          <DailyBars data={house.dailyPosts.map((d) => ({ date: d.date, value: d.posts }))} label="Posts" format="count" height={260} />
        </Section>
        <Section title="Most active" desc="Posts per day since premiere">
          <RankedBars stats={stats} get={(s) => s.postsPerDay} fmt={(n) => `${decimal(n)}/day`} sub={(s) => `${s.postsLast7d} this week`} limit={7} />
        </Section>
      </div>

      <div id="table">
        <Section title="Full data table" desc="Tap a column heading to sort. Tick rows, then press Compare.">
          <LeaderboardTable stats={client} growthLabel={a.growthSince} />
        </Section>
      </div>
    </div>
  );
}
