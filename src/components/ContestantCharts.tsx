"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/analytics";
import { compact, full, percent, shortDate } from "@/lib/format";

export function FollowerArea({ series, premiereDate, evictedOn }: { series: SeriesPoint[]; premiereDate: string; evictedOn: string | null }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={series} margin={{ top: 8, right: 12 }}>
        <defs>
          <linearGradient id="fa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} tickLine={false} />
        <YAxis width={56} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => compact(v)} />
        <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />
        {evictedOn && (
          <ReferenceLine x={evictedOn} stroke="var(--down)" strokeDasharray="4 4" label={{ value: "Evicted", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }} />
        )}
        <Tooltip
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                <div className="font-medium">{shortDate(String(label))}</div>
                <div className="tnum text-ink-2">{full(Number(payload[0].value))} followers</div>
              </div>
            ) : null
          }
        />
        <Area dataKey="followers" stroke="var(--series-1)" strokeWidth={2} fill="url(#fa)" dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface PostPoint {
  date: string;
  label: string;
  interactions: number;
  er: number | null;
  type: string;
}

export function PostEngagementBars({ posts }: { posts: PostPoint[] }) {
  if (!posts.length) return <p className="text-sm text-muted">No posts since premiere.</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={posts} barCategoryGap="12%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tick={false} tickLine={false} />
        <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PostPoint;
            return (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                <div className="font-medium">{shortDate(p.date)} · {p.type.replace("_", " ").toLowerCase()}</div>
                <div className="tnum text-ink-2">{full(p.interactions)} likes + comments</div>
                <div className="tnum text-ink-2">{percent(p.er, 2)} engagement rate</div>
              </div>
            );
          }}
        />
        <Bar dataKey="interactions" fill="var(--series-1)" radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
