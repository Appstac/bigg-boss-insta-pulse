"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ClientStats } from "@/lib/analytics";
import { assignSlots, MAX_SERIES, seriesVar } from "@/lib/colors";
import { compact, decimal, full, percent, shortDate, signed } from "@/lib/format";
import { ContestantPicker } from "./ContestantPicker";
import { TREND_RANGES, trendModes, TrendChart, type TrendMode, type TrendRange } from "./TrendChart";
import { Avatar } from "./Avatar";
import { RankHistory, WeeklyBars } from "./Charts";
import { Sparkline } from "./Sparkline";
import { Delta, Section, Segmented } from "./ui";

interface Metric {
  label: string;
  hint?: string;
  get: (s: ClientStats) => number | null;
  show: (s: ClientStats) => React.ReactNode;
  /** Format for the 2-way gap column. */
  gap?: (d: number) => string;
  higherIsBetter?: boolean;
}

const METRICS: { group: string; rows: Metric[] }[] = [
  {
    group: "Followers",
    rows: [
      { label: "Current followers", get: (s) => s.followers, show: (s) => full(s.followers), gap: (d) => signed(d), higherIsBetter: true },
      { label: "Rank (by followers)", get: (s) => s.rank, show: (s) => `#${s.rank}`, higherIsBetter: false },
      { label: "Gained today", get: (s) => s.gain1d, show: (s) => <Delta value={s.gain1d} />, gap: (d) => signed(d), higherIsBetter: true },
      { label: "Gained last 7 days", get: (s) => s.gain7d, show: (s) => <Delta value={s.gain7d} />, gap: (d) => signed(d), higherIsBetter: true },
      { label: "Gained since premiere", get: (s) => s.gainSeason, show: (s) => <Delta value={s.gainSeason} />, gap: (d) => signed(d), higherIsBetter: true },
      { label: "Growth % since premiere", get: (s) => s.pctSeason, show: (s) => <Delta value={s.pctSeason} kind="percent" />, gap: (d) => pts(d, 1), higherIsBetter: true },
      { label: "Growth % last 7 days", get: (s) => s.pct7d, show: (s) => <Delta value={s.pct7d} kind="percent" />, gap: (d) => pts(d, 1), higherIsBetter: true },
      { label: "Avg daily gain (7d)", get: (s) => s.avgDailyGain7d, show: (s) => compact(s.avgDailyGain7d), gap: (d) => signed(d), higherIsBetter: true },
      { label: "Momentum", hint: "Last 7 days' gain vs the 7 days before", get: (s) => s.momentum, show: (s) => <Delta value={s.momentum} kind="percent" />, higherIsBetter: true },
      { label: "Share of new followers", get: (s) => s.shareOfHouseGain, show: (s) => percent(s.shareOfHouseGain), higherIsBetter: true },
      { label: "Best day", get: (s) => s.bestDay?.gain ?? null, show: (s) => (s.bestDay ? <><Delta value={s.bestDay.gain} /> <span className="text-muted">{shortDate(s.bestDay.date)}</span></> : "—"), higherIsBetter: true },
      { label: "Days with growth", get: (s) => s.positiveDaysPct, show: (s) => percent(s.positiveDaysPct, 0), higherIsBetter: true },
    ],
  },
  {
    group: "Posting",
    rows: [
      { label: "Posts since premiere", get: (s) => s.postsSeason, show: (s) => full(s.postsSeason), gap: (d) => signed(d, full), higherIsBetter: true },
      { label: "Posts per day", get: (s) => s.postsPerDay, show: (s) => decimal(s.postsPerDay), gap: (d) => (Math.abs(d) < 0.05 ? "≈ same" : signed(d, (n) => n.toFixed(1))), higherIsBetter: true },
      { label: "Posts last 7 days", get: (s) => s.postsLast7d, show: (s) => full(s.postsLast7d), gap: (d) => signed(d, full), higherIsBetter: true },
      { label: "Reels / videos share", get: (s) => s.reelsShare, show: (s) => percent(s.reelsShare, 0) },
      { label: "Total posts on profile", get: (s) => s.postsTotal, show: (s) => full(s.postsTotal) },
    ],
  },
  {
    group: "Engagement",
    rows: [
      { label: "Engagement rate", hint: "Median (likes + comments) ÷ followers per post", get: (s) => s.engagementRate, show: (s) => percent(s.engagementRate, 2), gap: (d) => pts(d, 2), higherIsBetter: true },
      { label: "Avg likes / post", get: (s) => s.avgLikes, show: (s) => compact(s.avgLikes), gap: (d) => signed(d), higherIsBetter: true },
      { label: "Median likes / post", get: (s) => s.medianLikes, show: (s) => compact(s.medianLikes), gap: (d) => signed(d), higherIsBetter: true },
      { label: "Avg comments / post", get: (s) => s.avgComments, show: (s) => compact(s.avgComments == null ? null : Math.round(s.avgComments)), gap: (d) => signed(Math.round(d)), higherIsBetter: true },
      { label: "Avg interactions / post", get: (s) => s.avgInteractions, show: (s) => compact(s.avgInteractions), gap: (d) => signed(d), higherIsBetter: true },
      { label: "Top post", get: (s) => s.topPost?.interactions ?? null, show: (s) => (s.topPost ? <>{compact(s.topPost.interactions)} <span className="text-muted">{s.topPost.type === "REEL" ? "reel" : "post"}</span></> : "—"), higherIsBetter: true },
    ],
  },
];

/** Percentage-point difference. */
const pts = (d: number, digits: number) => (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d).toFixed(digits) + " pts";

const MULTI_COLS: Record<number, string> = {
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

const RADAR: { label: string; get: (s: ClientStats) => number | null }[] = [
  { label: "Followers", get: (s) => s.followers },
  { label: "Gain", get: (s) => s.gainSeason },
  { label: "Growth %", get: (s) => s.pctSeason },
  { label: "7-day gain", get: (s) => s.gain7d },
  { label: "Engagement", get: (s) => s.engagementRate },
  { label: "Posts/day", get: (s) => s.postsPerDay },
];

export function CompareView({
  stats,
  initial,
  premiereDate,
  weekLabels,
  growthLabel = "since premiere",
}: {
  stats: ClientStats[];
  initial: string[];
  premiereDate: string;
  weekLabels: string[];
  growthLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState(initial);
  const [slots, setSlots] = useState(() => assignSlots(initial, {}));
  const [mode, setMode] = useState<TrendMode>("indexed");
  const [range, setRange] = useState<TrendRange>("all");

  const change = (ids: string[]) => {
    setSelected(ids);
    setSlots((prev) => assignSlots(ids, prev));
    router.replace(ids.length ? `${pathname}?ids=${ids.join(",")}` : pathname, { scroll: false });
  };

  const chosen = selected.map((id) => stats.find((s) => s.contestant.id === id)!).filter(Boolean);
  const two = chosen.length === 2;

  // How many rows of the table each contestant leads.
  const wins = new Map(chosen.map((s) => [s.contestant.id, 0]));
  let contested = 0;
  for (const g of METRICS) for (const m of g.rows) {
    if (m.higherIsBetter == null) continue;
    const vals = chosen.map((s) => m.get(s));
    const valid = vals.filter((v): v is number => v != null);
    if (valid.length < 2 || new Set(valid).size === 1) continue;
    const best = m.higherIsBetter ? Math.max(...valid) : Math.min(...valid);
    contested++;
    chosen.forEach((s, i) => vals[i] === best && wins.set(s.contestant.id, wins.get(s.contestant.id)! + 1));
  }
  const topWins = Math.max(0, ...wins.values());

  // Skip axes nobody selected has data for yet (e.g. 7-day gain in the first week).
  const radarData = RADAR.filter((m) => chosen.some((s) => m.get(s) != null)).map((m) => {
    const vals = chosen.map((s) => m.get(s) ?? 0);
    const max = Math.max(...vals.map((v) => Math.max(0, v)), 1e-9);
    const row: Record<string, string | number> = { metric: m.label };
    chosen.forEach((s, i) => (row[s.contestant.id] = Math.round((Math.max(0, vals[i]) / max) * 100)));
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <p className="mb-2 text-sm text-ink-2">Choose 2 to {MAX_SERIES} contestants</p>
        <ContestantPicker options={stats.map((s) => ({ ...s.contestant, photo: s.photo }))} selected={selected} slots={slots} max={MAX_SERIES} onChange={change} />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="text-muted">Quick picks:</span>
          {[
            ["Top 3 by followers", [...stats].sort((a, b) => b.followers - a.followers).slice(0, 3)],
            [
              stats.some((s) => s.gain7d != null) ? "Top 3 gainers this week" : "Top 3 gainers",
              [...stats].sort((a, b) => (b.gain7d ?? b.gainSeason ?? 0) - (a.gain7d ?? a.gainSeason ?? 0)).slice(0, 3),
            ],
            ["Most engaging 3", [...stats].sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0)).slice(0, 3)],
            ["Evicted", stats.filter((s) => s.contestant.status === "evicted").slice(0, MAX_SERIES)],
          ].map(([label, list]) => (
            <button
              key={label as string}
              onClick={() => change((list as ClientStats[]).map((s) => s.contestant.id))}
              className="rounded-full border border-line px-2.5 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      {chosen.length < 2 ? (
        <div className="card grid place-items-center p-12 text-center text-sm text-muted">
          Add at least two contestants to see the comparison table and charts.
        </div>
      ) : (
        <>
          <div className={`grid gap-2 sm:gap-3 ${two ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : MULTI_COLS[chosen.length] ?? "grid-cols-2 md:grid-cols-3"}`}>
            {chosen.map((s, i) => (
              <FragmentWithVs key={s.contestant.id} vs={two && i === 1}>
                <Link href={`/contestants/${s.contestant.id}`} className="card relative flex min-w-0 flex-col items-center overflow-hidden p-3 text-center transition-transform hover:-translate-y-0.5 sm:p-5">
                  <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: seriesVar(slots[s.contestant.id]) }} />
                  <Avatar name={s.contestant.name} photo={s.photo} size={two ? 80 : 64} rounded="xl" evicted={s.contestant.status === "evicted"} ring={seriesVar(slots[s.contestant.id])} />
                  <div className="mt-3 font-semibold leading-tight">{s.contestant.name}</div>
                  <div className="text-xs text-muted">{s.contestant.status === "evicted" ? "Evicted" : "In house"} · Rank #{s.rank}</div>
                  <div className="tnum mt-3 text-2xl font-bold tracking-tight">{compact(s.followers)}</div>
                  <Delta value={s.gain1d} pill className="mt-1" />
                  <Sparkline values={s.sparkline} width={100} height={30} className="mt-3 max-w-full" />
                  {/* The overall leader gets a highlighted pill here (in the flow, so it never covers the photo). */}
                  {wins.get(s.contestant.id) === topWins && topWins > 0 ? (
                    <div className="mt-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-up-bg px-2.5 py-1 text-xs font-semibold text-up">
                      <span aria-hidden>🏆</span> Leads {wins.get(s.contestant.id)} of {contested}<span className="hidden sm:inline"> metrics</span>
                    </div>
                  ) : (
                    <div className="mt-3 whitespace-nowrap px-2.5 py-1 text-xs text-muted">
                      Leads <strong className="text-ink">{wins.get(s.contestant.id)}</strong> of {contested}<span className="hidden sm:inline"> metrics</span>
                    </div>
                  )}
                </Link>
              </FragmentWithVs>
            ))}
          </div>

          <Section title="Comparison table" desc="★ marks the leader in each row.">
            <div className="overflow-x-auto">
              <table className={`w-full text-xs sm:text-sm ${chosen.length > 3 ? "min-w-[560px]" : ""}`}>
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-2 text-left text-xs font-medium uppercase tracking-wide text-muted sm:pr-4">Metric</th>
                    {chosen.map((s) => (
                      <th key={s.contestant.id} className="py-2 pl-2 text-right font-medium sm:pl-3">
                        <Link href={`/contestants/${s.contestant.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                          <Avatar name={s.contestant.name} photo={s.photo} size={26} ring={seriesVar(slots[s.contestant.id])} />
                          <span className="sm:hidden">{s.contestant.name.split(" ")[0]}</span>
                          <span className="hidden sm:inline">{s.contestant.name}</span>
                        </Link>
                        <div className="text-xs font-normal text-muted">{s.contestant.status === "evicted" ? "Evicted" : "In house"}</div>
                      </th>
                    ))}
                    {two && <th className="hidden py-2 pl-2 sm:table-cell sm:pl-3 text-right text-xs font-medium uppercase tracking-wide text-muted">Gap</th>}
                  </tr>
                </thead>
                {METRICS.map((g) => (
                  <tbody key={g.group}>
                    <tr>
                      <td colSpan={chosen.length + 2} className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-2">{g.group}</td>
                    </tr>
                    {g.rows.filter((m) => chosen.some((s) => m.get(s) != null)).map((m) => {
                      const vals = chosen.map((s) => m.get(s));
                      const valid = vals.filter((v): v is number => v != null);
                      const best =
                        m.higherIsBetter == null || valid.length < 2 || new Set(valid).size === 1
                          ? null
                          : m.higherIsBetter ? Math.max(...valid) : Math.min(...valid);
                      return (
                        <tr key={m.label} className="border-b border-line last:border-0 hover:bg-surface-2">
                          <td className="py-2 pr-2 text-ink-2 sm:pr-4" title={m.hint}>
                            {m.label.startsWith("Posts") ? m.label : m.label.replace("since premiere", growthLabel)}
                          </td>
                          {chosen.map((s, i) => {
                            const lead = best != null && vals[i] === best;
                            return (
                              <td key={s.contestant.id} className={`tnum whitespace-nowrap py-2 pl-2 text-right sm:pl-3 ${lead ? "bg-highlight font-semibold" : ""}`}>
                                {lead && <span className="mr-1 text-accent" aria-label="leader">★</span>}
                                {m.show(s)}
                              </td>
                            );
                          })}
                          {two && (
                            <td className="tnum hidden whitespace-nowrap py-2 pl-2 text-right text-ink-2 sm:table-cell sm:pl-3">
                              {m.gap && vals[0] != null && vals[1] != null ? m.gap(vals[0] - vals[1]) : ""}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">
              {two && <span className="hidden sm:inline">Gap = {chosen[0].contestant.name} minus {chosen[1].contestant.name}. </span>}
              {chosen.every((c) => c.gain7d == null) && "7-day figures and momentum are hidden until 7 days of tracking exist."}
            </p>
          </Section>

          <Section
            title="Follower trend"
            action={
              <div className="flex max-w-full flex-wrap gap-2">
                <Segmented value={mode} options={trendModes(growthLabel)} onChange={setMode} />
                <Segmented value={range} options={TREND_RANGES} onChange={setRange} />
              </div>
            }
          >
            <TrendChart stats={chosen} slots={slots} mode={mode} range={range} premiereDate={premiereDate} />
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Rank history" desc={`Position among all ${stats.length} by followers`}>
              <RankHistory stats={chosen} slots={slots} total={stats.length} />
            </Section>
            <Section title="Weekly gains" desc="Followers gained per show week">
              <WeeklyBars stats={chosen} slots={slots} weekLabels={weekLabels} />
            </Section>
          </div>

          <Section title="Profile shape" desc="Each axis scaled so the best of the selected contestants = 100.">
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                        <div className="mb-1 font-medium">{label}</div>
                        {payload.map((p) => (
                          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-ink-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                              {chosen.find((s) => s.contestant.id === p.dataKey)?.contestant.name}
                            </span>
                            <span className="tnum">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  }
                />
                {chosen.map((s) => (
                  <Radar
                    key={s.contestant.id}
                    dataKey={s.contestant.id}
                    stroke={seriesVar(slots[s.contestant.id])}
                    fill={seriesVar(slots[s.contestant.id])}
                    fillOpacity={0.08}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </Section>
        </>
      )}
    </div>
  );
}

function FragmentWithVs({ vs, children }: { vs: boolean; children: React.ReactNode }) {
  return (
    <>
      {vs && (
        <div className="grid place-items-center">
          <span className="brand-bg grid h-12 w-12 place-items-center rounded-full text-sm font-black text-white shadow-lg">VS</span>
        </div>
      )}
      {children}
    </>
  );
}
