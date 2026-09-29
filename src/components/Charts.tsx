"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ClientStats } from "@/lib/analytics";
import { seriesVar } from "@/lib/colors";
import { compact, full, istDateTime, istTime, percent, shortDate, signed } from "@/lib/format";
import { Avatar } from "./Avatar";
import { TREND_RANGES, type TrendRange } from "./TrendChart";
import { Segmented } from "./ui";

export type ValueFormat = "full" | "compact" | "signed" | "count";
const FORMATS: Record<ValueFormat, (n: number) => string> = {
  full,
  compact,
  signed: (n) => signed(n),
  count: (n) => String(Math.round(n)),
};

function Tip({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-xl">
      <div className="mb-1 font-medium">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tnum font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Single-series area over time with a range switch. */
export function AreaTrend({
  data,
  label,
  format = "full",
  premiereDate,
  markers = [],
  height = 300,
  withRange = true,
  xFormat = "date",
}: {
  data: { date: string; value: number }[];
  label: string;
  format?: ValueFormat;
  premiereDate?: string;
  markers?: { date: string; label: string }[];
  height?: number;
  withRange?: boolean;
  /** "time": `date` holds ISO timestamps (15-minute points), shown as IST clock times. */
  xFormat?: "date" | "time";
}) {
  const [range, setRange] = useState<TrendRange>("all");
  const fmt = FORMATS[format];
  const xTick = xFormat === "time" ? istTime : shortDate;
  const xTitle = xFormat === "time" ? istDateTime : shortDate;
  const rows = range === "all" ? data : data.slice(-Number(range) - 1);
  const id = "at-" + label.replace(/\W/g, "");
  return (
    <div>
      {withRange && (
        <div className="mb-3 flex justify-end">
          <Segmented value={range} options={TREND_RANGES} onChange={setRange} size="sm" />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={xTick} minTickGap={28} tickLine={false} />
          <YAxis width={56} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => compact(v)} />
          {premiereDate && rows.some((r) => r.date === premiereDate) && (
            <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fontSize: 11 }} />
          )}
          {markers.filter((m) => rows.some((r) => r.date === m.date)).map((m) => (
            <ReferenceLine key={m.date + m.label} x={m.date} stroke="var(--down)" strokeDasharray="4 4" label={{ value: m.label, position: "insideTopRight", fontSize: 11 }} />
          ))}
          <Tooltip
            cursor={{ stroke: "var(--axis)" }}
            content={({ active, payload, label: l }) =>
              active && payload?.length ? <Tip title={xTitle(String(l))} rows={[{ label, value: fmt(Number(payload[0].value)) }]} /> : null
            }
          />
          <Area dataKey="value" stroke="var(--series-1)" strokeWidth={2.25} fill={`url(#${id})`} dot={false} activeDot={{ r: 4.5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series daily bars (gain or count). Negative bars use the loss color. */
export function DailyBars({
  data,
  label,
  format = "signed",
  height = 240,
  premiereDate,
}: {
  data: { date: string; value: number | null }[];
  label: string;
  format?: ValueFormat;
  height?: number;
  premiereDate?: string;
}) {
  const fmt = FORMATS[format];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="18%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28} tickLine={false} />
        <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        {premiereDate && <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fontSize: 11 }} />}
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label: l }) =>
            active && payload?.length && payload[0].value != null ? <Tip title={shortDate(String(l))} rows={[{ label, value: fmt(Number(payload[0].value)) }]} /> : null
          }
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.date} fill={(d.value ?? 0) < 0 ? "var(--neg-3)" : "var(--series-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Engagement rate (y) vs follower growth since premiere (x); bubble size = followers. */
export function GrowthEngagementScatter({ stats, avgX, avgY }: { stats: ClientStats[]; avgX: number | null; avgY: number | null }) {
  const data = stats
    .filter((s) => s.pctSeason != null && s.engagementRate != null)
    .map((s) => ({
      x: s.pctSeason!,
      y: s.engagementRate!,
      z: s.followers,
      name: s.contestant.name.split(" ")[0],
      full: s.contestant.name,
      evicted: s.contestant.status === "evicted",
    }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name="Growth" tickFormatter={(v: number) => `${Math.round(v)}%`} tickLine={false} label={{ value: "Follower growth since premiere →", position: "insideBottom", offset: -8, fontSize: 12 }} />
          <YAxis type="number" dataKey="y" name="Engagement" width={52} tickFormatter={(v: number) => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} label={{ value: "Engagement rate →", angle: -90, position: "insideLeft", offset: 12, fontSize: 12 }} />
          <ZAxis type="number" dataKey="z" range={[80, 700]} />
          {avgX != null && <ReferenceLine x={avgX} stroke="var(--axis)" strokeDasharray="4 4" />}
          {avgY != null && <ReferenceLine y={avgY} stroke="var(--axis)" strokeDasharray="4 4" />}
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <Tip
                  title={p.full}
                  rows={[
                    { label: "Growth since premiere", value: percent(p.x, 1, true) },
                    { label: "Engagement rate", value: percent(p.y, 2) },
                    { label: "Followers", value: compact(p.z) },
                  ]}
                />
              );
            }}
          />
          <Scatter data={data} fill="var(--series-1)" fillOpacity={0.55} stroke="var(--series-1)" strokeWidth={1.5} isAnimationActive={false}>
            <LabelList dataKey="name" position="top" offset={8} style={{ fill: "var(--ink-2)", fontSize: 11 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
        <span>↗ Top right: growing fast and engaging</span>
        <span>↖ Top left: loyal fans, slower growth</span>
        <span>↘ Bottom right: growing on reach, weaker interaction</span>
        <span>Dashed lines = house averages · bubble = follower count</span>
      </div>
    </div>
  );
}

/** Rank by followers over time (1 = top). */
export function RankHistory({ stats, slots, total, height = 280 }: { stats: ClientStats[]; slots: Record<string, number>; total: number; height?: number }) {
  const dates = [...new Set(stats.flatMap((s) => s.series.map((p) => p.date)))].sort();
  const rows = dates.map((date) => {
    const r: Record<string, string | number | null> = { date };
    for (const s of stats) r[s.contestant.id] = s.series.find((p) => p.date === date)?.rank ?? null;
    return r;
  });
  const names = new Map(stats.map((s) => [s.contestant.id, s.contestant.name]));
  return (
    <div>
      {stats.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          {stats.map((s) => (
            <span key={s.contestant.id} className="flex items-center gap-2">
              <span className="h-[3px] w-4 rounded-full" style={{ background: seriesVar(slots[s.contestant.id]) }} />
              <Avatar name={s.contestant.name} photo={s.photo} size={20} />
              {s.contestant.name}
            </span>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28} tickLine={false} />
          <YAxis reversed domain={[1, total]} allowDecimals={false} width={40} tickLine={false} axisLine={false} tickFormatter={(v: number) => `#${v}`} ticks={[1, 3, 6, 9, 12, 15, total].filter((t, i, a) => t <= total && a.indexOf(t) === i)} />
          <Tooltip
            cursor={{ stroke: "var(--axis)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip
                  title={shortDate(String(label))}
                  rows={[...payload].sort((a, b) => Number(a.value) - Number(b.value)).map((p) => ({ label: names.get(String(p.dataKey)) ?? "", value: `#${p.value}`, color: p.color }))}
                />
              ) : null
            }
          />
          {stats.map((s) => (
            <Line key={s.contestant.id} type="stepAfter" dataKey={s.contestant.id} stroke={seriesVar(slots[s.contestant.id] ?? 0)} strokeWidth={2.25} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grouped weekly gain bars for a few contestants. */
export function WeeklyBars({ stats, slots, weekLabels, height = 280 }: { stats: ClientStats[]; slots: Record<string, number>; weekLabels: string[]; height?: number }) {
  const rows = weekLabels.map((w, i) => {
    const r: Record<string, string | number | null> = { week: w };
    for (const s of stats) r[s.contestant.id] = s.weeklyGain[i];
    return r;
  });
  const names = new Map(stats.map((s) => [s.contestant.id, s.contestant.name]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} barCategoryGap="22%" barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} />
        <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Tip
                title={String(label)}
                rows={[...payload].sort((a, b) => Number(b.value) - Number(a.value)).map((p) => ({ label: names.get(String(p.dataKey)) ?? "", value: signed(Number(p.value)), color: p.color }))}
              />
            ) : null
          }
        />
        {stats.map((s) => (
          <Bar key={s.contestant.id} dataKey={s.contestant.id} fill={seriesVar(slots[s.contestant.id] ?? 0)} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
