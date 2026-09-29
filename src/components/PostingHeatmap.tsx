import { WEEKDAYS } from "@/lib/format";
import type { Post } from "@/lib/types";
import { istParts } from "@/lib/analytics";

const BUCKETS = [
  { label: "12–4a", from: 0 },
  { label: "4–8a", from: 4 },
  { label: "8–12p", from: 8 },
  { label: "12–4p", from: 12 },
  { label: "4–8p", from: 16 },
  { label: "8–12a", from: 20 },
];

/** Weekday × 4-hour block post counts (IST), single-hue sequential scale. */
export function PostingHeatmap({ posts }: { posts: Post[] }) {
  const grid = WEEKDAYS.map(() => BUCKETS.map(() => 0));
  for (const p of posts) {
    const { weekday, hour } = istParts(p.timestamp);
    grid[weekday][Math.floor(hour / 4)]++;
  }
  const max = Math.max(1, ...grid.flat());
  const step = (n: number) => (n === 0 ? 0 : Math.min(6, 1 + Math.floor((n / max) * 5.999)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr>
            <th />
            {BUCKETS.map((b) => (
              <th key={b.label} className="pb-1 font-normal text-muted">{b.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((d, i) => (
            <tr key={d}>
              <th className="pr-2 text-left font-normal text-muted">{d}</th>
              {grid[i].map((n, j) => {
                const s = step(n);
                return (
                  <td
                    key={j}
                    title={`${d} ${BUCKETS[j].label}: ${n} post${n === 1 ? "" : "s"}`}
                    className="tnum h-8 rounded text-center"
                    style={{ background: `var(--seq-${s})`, color: s >= 4 ? "var(--seq-on-hi)" : "var(--ink-2)" }}
                  >
                    {n || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Times in IST. Stronger blue = more posts.</p>
    </div>
  );
}
