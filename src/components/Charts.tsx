"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClientStats } from "@/lib/analytics";
import { seriesVar } from "@/lib/colors";
import { axisFormatter, compact, full, istDateTime, istTime, percent, shortDate, signed } from "@/lib/format";
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
  /** "time": `date` holds ISO timestamps (30-minute points), shown as IST clock times. */
  xFormat?: "date" | "time";
}) {
  const [range, setRange] = useState<TrendRange>("all");
  const fmt = FORMATS[format];
  const xTick = xFormat === "time" ? istTime : shortDate;
  const xTitle = xFormat === "time" ? istDateTime : shortDate;
  const sliced = range === "all" ? data : data.slice(-Number(range) - 1);
  // Time mode plots on a real clock axis, so a 6-hour gap looks like 6 hours, not one step.
  const rows = xFormat === "time" ? sliced.map((r) => ({ ...r, ts: Date.parse(r.date) })) : sliced;
  const values = rows.map((r) => r.value);
  const yTick = axisFormatter(Math.min(...values), Math.max(...values));
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
          {xFormat === "time" ? (
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ms: number) => istTime(new Date(ms).toISOString())}
              minTickGap={36}
              tickLine={false}
            />
          ) : (
            <XAxis dataKey="date" tickFormatter={xTick} minTickGap={28} tickLine={false} />
          )}
          <YAxis width={60} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={yTick} />
          {premiereDate && rows.some((r) => r.date === premiereDate) && (
            <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fontSize: 11 }} />
          )}
          {markers.filter((m) => rows.some((r) => r.date === m.date)).map((m) => (
            <ReferenceLine key={m.date + m.label} x={m.date} stroke="var(--down)" strokeDasharray="4 4" label={{ value: m.label, position: "insideTopRight", fontSize: 11 }} />
          ))}
          <Tooltip
            cursor={{ stroke: "var(--axis)" }}
            content={({ active, payload, label: l }) =>
              active && payload?.length ? (
                <Tip
                  title={xFormat === "time" ? istDateTime(new Date(Number(l)).toISOString()) : xTitle(String(l))}
                  rows={[{ label, value: fmt(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Area
            dataKey="value"
            stroke="var(--series-1)"
            strokeWidth={2.25}
            fill={`url(#${id})`}
            dot={rows.length <= 12 ? { r: 3, fill: "var(--series-1)", strokeWidth: 0 } : false} activeDot={{ r: 4.5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
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

/**
 * Engagement rate (y) vs follower growth (x). Each contestant is drawn as their photo; names are
 * only drawn where they don't collide with another name (tap a photo for the full details).
 */
export function GrowthEngagementScatter({
  stats,
  avgX,
  avgY,
  growthLabel = "since premiere",
}: {
  stats: ClientStats[];
  avgX: number | null;
  avgY: number | null;
  growthLabel?: string;
}) {
  const data = stats
    .filter((s) => s.pctSeason != null && s.engagementRate != null)
    // Bigger accounts first, so they win label space when names would collide.
    .sort((a, b) => b.followers - a.followers)
    .map((s) => ({
      id: s.contestant.id,
      x: s.pctSeason!,
      y: s.engagementRate!,
      followers: s.followers,
      photo: s.photo,
      name: s.contestant.name.split(" ")[0],
      full: s.contestant.name,
      evicted: s.contestant.status === "evicted",
    }));
  type Pt = (typeof data)[number];
  // Small growth ranges (early in tracking) need decimals so ticks don't all read "0%".
  const xs = data.map((d) => d.x);
  const xRange = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const xDigits = xRange < 0.5 ? 2 : xRange < 5 ? 1 : 0;

  const R = 13;
  // Decide which names fit before drawing: greedy collision check on label boxes, sized for a
  // phone-width plot (~300 x 360 px), so wider screens only ever show more room, not overlaps.
  const labelled = (() => {
    const W = 300;
    const H = 360;
    const ys = data.map((d) => d.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const px = (v: number) => ((v - x0) / (x1 - x0 || 1)) * W;
    const py = (v: number) => (1 - (v - y0) / (y1 - y0 || 1)) * H;
    const boxes: { a: number; b: number; c: number; d: number }[] = [];
    const ok = new Set<string>();
    for (const p of data) {
      const bx = px(p.x) + R + 3;
      const box = { a: bx, b: py(p.y) - 7, c: bx + p.name.length * 6.4 + 4, d: py(p.y) + 7 };
      if (!boxes.some((o) => box.a < o.c && box.c > o.a && box.b < o.d && box.d > o.b)) {
        boxes.push(box);
        ok.add(p.id);
      }
    }
    return ok;
  })();

  const renderDot = ({ cx = 0, cy = 0, payload }: { cx?: number; cy?: number; payload?: Pt }) => {
    if (!payload) return <g />;
    const clip = `sc-${payload.id}`;
    const free = labelled.has(payload.id);
    return (
      <g style={{ cursor: "pointer" }} opacity={payload.evicted ? 0.6 : 1}>
        <circle cx={cx} cy={cy} r={R + 5} fill="transparent" />
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
        <circle cx={cx} cy={cy} r={R} fill="var(--surface-3)" />
        {payload.photo ? (
          <image href={payload.photo} x={cx - R} y={cy - R} width={R * 2} height={R * 2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink-2)">
            {payload.name.slice(0, 2).toUpperCase()}
          </text>
        )}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--series-1)" strokeWidth={2} />
        {free && (
          <text x={cx + R + 3} y={cy + 4} fontSize={11} fill="var(--ink-2)">
            {payload.name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 56, bottom: 20, left: 0 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="x"
            name="Growth"
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(xDigits)}%`}
            tickLine={false}
            label={{ value: `Follower growth ${growthLabel} →`, position: "insideBottom", offset: -12, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Engagement"
            width={52}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tickLine={false}
            axisLine={false}
            label={{ value: "Engagement rate →", angle: -90, position: "insideLeft", offset: 12, fontSize: 12 }}
          />
          {avgX != null && <ReferenceLine x={avgX} stroke="var(--axis)" strokeDasharray="4 4" />}
          {avgY != null && <ReferenceLine y={avgY} stroke="var(--axis)" strokeDasharray="4 4" />}
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Pt;
              return (
                <Tip
                  title={p.full}
                  rows={[
                    { label: `Growth ${growthLabel}`, value: percent(p.x, 1, true) },
                    { label: "Engagement rate", value: percent(p.y, 2) },
                    { label: "Followers", value: compact(p.followers) },
                  ]}
                />
              );
            }}
          />
          <Scatter data={data} shape={(p: unknown) => renderDot(p as { cx?: number; cy?: number; payload?: Pt })} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
        <span>↗ Top right: growing fast and engaging</span>
        <span>↖ Top left: loyal fans, slower growth</span>
        <span>↘ Bottom right: growing on reach, weaker interaction</span>
        <span>Dashed lines = house averages · tap a photo for details</span>
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
export function WeeklyBars({
  stats,
  slots,
  weekLabels,
  height = 280,
  hideEmpty = true,
}: {
  stats: ClientStats[];
  slots: Record<string, number>;
  weekLabels: string[];
  height?: number;
  /** Drop weeks nobody has data for (before tracking began). */
  hideEmpty?: boolean;
}) {
  const rows = weekLabels
    .map((w, i) => {
      const r: Record<string, string | number | null> = { week: w };
      for (const s of stats) r[s.contestant.id] = s.weeklyGain[i];
      return { r, has: stats.some((s) => s.weeklyGain[i] != null) };
    })
    .filter((x) => !hideEmpty || x.has)
    .map((x) => x.r);
  if (!rows.length) return <p className="text-sm text-muted">Weekly totals appear after the second day of tracking.</p>;
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
