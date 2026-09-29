"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClientStats } from "@/lib/analytics";
import { seriesVar } from "@/lib/colors";
import { Avatar } from "./Avatar";
import { compact, percent, shortDate, signed } from "@/lib/format";

export type TrendMode = "followers" | "indexed" | "gain";
export type TrendRange = "7" | "14" | "30" | "all";

export const TREND_RANGES: { value: TrendRange; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "14", label: "14D" },
  { value: "30", label: "30D" },
  { value: "all", label: "All" },
];

export const TREND_MODES: { value: TrendMode; label: string }[] = [
  { value: "followers", label: "Followers" },
  { value: "indexed", label: "Growth % since premiere" },
  { value: "gain", label: "Daily gain" },
];

interface Props {
  stats: ClientStats[];
  slots: Record<string, number>;
  mode: TrendMode;
  premiereDate: string;
  range?: TrendRange;
  height?: number;
}

function fmtValue(mode: TrendMode, v: number) {
  return mode === "followers" ? compact(v) : mode === "indexed" ? percent(v, 1, true) : signed(v);
}

export function TrendChart({ stats, slots, mode, premiereDate, range = "all", height = 340 }: Props) {
  const allDates = [...new Set(stats.flatMap((s) => s.series.map((p) => p.date)))].sort();
  const dates = range === "all" ? allDates : allDates.slice(-Number(range) - (mode === "gain" ? 0 : 1));
  const rows = dates.map((date) => {
    const row: Record<string, number | string | null> = { date };
    for (const s of stats) {
      const p = s.series.find((x) => x.date === date);
      if (!p) continue;
      if (mode === "followers") row[s.contestant.id] = p.followers;
      else if (mode === "gain") row[s.contestant.id] = p.gain;
      else {
        const base = [...s.series].reverse().find((x) => x.date <= premiereDate) ?? s.series[0];
        row[s.contestant.id] = base?.followers ? ((p.followers - base.followers) / base.followers) * 100 : null;
      }
    }
    return row;
  });
  const names = new Map(stats.map((s) => [s.contestant.id, s.contestant.name]));
  const directLabels = stats.length <= 4 && mode !== "gain";

  if (!stats.length) {
    return <div className="grid place-items-center text-sm text-muted" style={{ height }}>Pick contestants to plot.</div>;
  }

  const tooltip = (
    <Tooltip
      cursor={mode === "gain" ? { fill: "var(--surface-2)" } : { stroke: "var(--axis)" }}
      content={({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const items = [...payload].filter((p) => p.value != null).sort((a, b) => Number(b.value) - Number(a.value));
        return (
          <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
            <div className="mb-1 font-medium">{shortDate(String(label))}</div>
            {items.map((p) => (
              <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {names.get(String(p.dataKey))}
                </span>
                <span className="tnum font-medium">{fmtValue(mode, Number(p.value))}</span>
              </div>
            ))}
          </div>
        );
      }}
    />
  );

  const common = {
    xAxis: <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} tickLine={false} />,
    yAxis: (
      <YAxis
        width={56}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v: number) => (mode === "indexed" ? `${Math.round(v)}%` : compact(v))}
        domain={mode === "followers" ? ["auto", "auto"] : undefined}
      />
    ),
    grid: <CartesianGrid vertical={false} />,
    premiere: <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />,
    evictions: stats
      .filter((s) => s.contestant.evictedOn)
      .map((s) => (
        <ReferenceLine key={"ev-" + s.contestant.id} x={s.contestant.evictedOn!} stroke={seriesVar(slots[s.contestant.id])} strokeDasharray="2 3" />
      )),
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
        {stats.map((s) => (
          <span key={s.contestant.id} className="flex items-center gap-2">
            <span className="h-[3px] w-4 rounded-full" style={{ background: seriesVar(slots[s.contestant.id]) }} />
            <Avatar name={s.contestant.name} photo={s.photo} size={20} evicted={s.contestant.status === "evicted"} />
            {s.contestant.name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {mode === "gain" ? (
          <BarChart data={rows} barCategoryGap="20%" barGap={2}>
            {common.grid}
            {common.xAxis}
            {common.yAxis}
            <ReferenceLine y={0} stroke="var(--axis)" />
            {common.premiere}
            {tooltip}
            {stats.map((s) => (
              <Bar key={s.contestant.id} dataKey={s.contestant.id} fill={seriesVar(slots[s.contestant.id])} radius={[3, 3, 0, 0]} maxBarSize={18} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={rows} margin={{ right: directLabels ? 96 : 12, top: 8 }}>
            {common.grid}
            {common.xAxis}
            {common.yAxis}
            {mode === "indexed" && <ReferenceLine y={0} stroke="var(--axis)" />}
            {common.premiere}
            {common.evictions}
            {tooltip}
            {stats.map((s) => (
              <Line
                key={s.contestant.id}
                dataKey={s.contestant.id}
                stroke={seriesVar(slots[s.contestant.id])}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
                label={
                  directLabels
                    ? (props: { x?: number | string; y?: number | string; index?: number }) =>
                        props.index === rows.length - 1 ? (
                          <text key="lbl" x={Number(props.x) + 6} y={Number(props.y)} dy={4} fontSize={12} fill="var(--ink-2)">
                            {s.contestant.name.split(" ")[0]}
                          </text>
                        ) : (
                          <g key={"n" + props.index} />
                        )
                    : undefined
                }
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
