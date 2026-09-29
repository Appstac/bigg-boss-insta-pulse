"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, shortDate, signed } from "@/lib/format";

/** Single-series bar chart of a daily value. */
export function HouseGainChart({
  data,
  premiereDate,
  height = 240,
  color = "var(--series-1)",
  label = "Followers gained",
}: {
  data: { date: string; gain: number | null }[];
  premiereDate?: string;
  height?: number;
  color?: string;
  label?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="18%">
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} tickLine={false} />
        <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        {premiereDate && (
          <ReferenceLine x={premiereDate} stroke="var(--axis)" strokeDasharray="4 4" label={{ value: "Premiere", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />
        )}
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label: l }) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                <div className="font-medium">{shortDate(String(l))}</div>
                <div className="text-ink-2">
                  {label}: <span className="tnum font-medium text-ink">{signed(Number(payload[0].value))}</span>
                </div>
              </div>
            ) : null
          }
        />
        <Bar dataKey="gain" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
