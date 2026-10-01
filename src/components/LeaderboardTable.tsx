"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientStats } from "@/lib/analytics";
import { compact, decimal, percent } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Sparkline } from "./Sparkline";
import { Delta, Segmented } from "./ui";

type Key =
  | "followers"
  | "gain1d"
  | "gain7d"
  | "gainSeason"
  | "pctSeason"
  | "momentum"
  | "postsPerDay"
  | "engagementRate"
  | "avgLikes";

const COLUMNS: { key: Key; label: string; title: string; render: (s: ClientStats) => React.ReactNode }[] = [
  { key: "followers", label: "Followers", title: "Current followers", render: (s) => compact(s.followers) },
  { key: "gain1d", label: "Today", title: "Change since previous day", render: (s) => <Delta value={s.gain1d} /> },
  { key: "gain7d", label: "7 days", title: "Change over last 7 days", render: (s) => <Delta value={s.gain7d} /> },
  { key: "gainSeason", label: "Season", title: "Change since premiere", render: (s) => <Delta value={s.gainSeason} /> },
  { key: "pctSeason", label: "Season %", title: "Growth % since premiere", render: (s) => <Delta value={s.pctSeason} kind="percent" /> },
  { key: "momentum", label: "Momentum", title: "Last 7 days' gain vs the 7 days before", render: (s) => <Delta value={s.momentum} kind="percent" /> },
  { key: "postsPerDay", label: "Posts/day", title: "Posts per day since premiere", render: (s) => decimal(s.postsPerDay) },
  { key: "engagementRate", label: "Eng. rate", title: "Median (likes + comments) ÷ followers per post, this season", render: (s) => percent(s.engagementRate, 2) },
  { key: "avgLikes", label: "Avg likes", title: "Average likes per post this season", render: (s) => compact(s.avgLikes) },
];

type Filter = "all" | "active" | "evicted";

export function LeaderboardTable({ stats, growthLabel = "since premiere" }: { stats: ClientStats[]; growthLabel?: string }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "followers", dir: -1 });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return stats
      .filter((s) => filter === "all" || s.contestant.status === filter)
      .filter((s) => !q || (s.contestant.name + s.contestant.teluguName).toLowerCase().includes(q))
      .sort((a, b) => {
        // Missing values (e.g. 7-day figures in the first week) always go last, whichever direction.
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null || bv == null) return av == null && bv == null ? b.followers - a.followers : av == null ? 1 : -1;
        return (Number(av) - Number(bv)) * sort.dir;
      });
  }, [stats, sort, filter, query]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 6 ? [...p, id] : p));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${stats.length}` },
            { value: "active", label: `In house ${stats.filter((s) => s.contestant.status === "active").length}` },
            { value: "evicted", label: `Evicted ${stats.filter((s) => s.contestant.status === "evicted").length}` },
          ]}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">{picked.length ? `${picked.length} selected` : "Tick rows to compare"}</span>
          <Link
            href={picked.length ? `/compare?ids=${picked.join(",")}` : "/compare"}
            aria-disabled={picked.length < 2}
            className={`rounded-lg px-3 py-1.5 font-medium ${picked.length >= 2 ? "bg-accent text-accent-ink" : "pointer-events-none bg-surface-2 text-muted"}`}
          >
            Compare
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-8 py-2" />
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-4">Contestant</th>
              <th className="py-2 pr-2">14 days</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="py-2 pl-3 text-right" title={c.key === "gainSeason" || c.key === "pctSeason" ? c.title.replace("since premiere", growthLabel) : c.title}>
                  <button
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : -1 }))}
                    className={`uppercase hover:text-ink ${sort.key === c.key ? "text-ink" : ""}`}
                  >
                    {c.label}
                    {sort.key === c.key && <span aria-hidden>{sort.dir === -1 ? " ↓" : " ↑"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.contestant.id} className={`border-b border-line last:border-0 hover:bg-surface-2 ${picked.includes(s.contestant.id) ? "bg-highlight" : ""}`}>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={picked.includes(s.contestant.id)}
                    onChange={() => toggle(s.contestant.id)}
                    aria-label={`Select ${s.contestant.name} for comparison`}
                    className="accent-[var(--accent)]"
                  />
                </td>
                <td className="tnum py-2 pr-2 text-muted">{i + 1}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.contestant.name} photo={s.photo} size={34} evicted={s.contestant.status === "evicted"} />
                    <div className="min-w-0">
                      <Link href={`/contestants/${s.contestant.id}`} className="font-medium hover:underline">
                        {s.contestant.name}
                      </Link>
                      <div className="text-xs text-muted">
                        {s.contestant.status === "evicted" ? "Evicted · " : ""}
                        {s.contestant.instagram ? "@" + s.contestant.instagram : s.contestant.profession}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-2"><Sparkline values={s.sparkline} width={80} height={26} /></td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="tnum py-2 pl-3 text-right">
                    {c.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
