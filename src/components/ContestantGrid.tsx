"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientStats } from "@/lib/analytics";
import { compact, percent } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Sparkline } from "./Sparkline";
import { Delta, RankBadge, RankChange, Segmented } from "./ui";

type SortKey = "followers" | "gain1d" | "gain7d" | "gainSeason" | "pctSeason" | "engagementRate";
type Filter = "all" | "active" | "evicted";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "followers", label: "Followers" },
  { value: "gain1d", label: "Today" },
  { value: "gain7d", label: "This week" },
  { value: "pctSeason", label: "Growth %" },
  { value: "engagementRate", label: "Engagement" },
];

export function ContestantGrid({ stats, growthLabel = "since premiere" }: { stats: ClientStats[]; growthLabel?: string }) {
  const [sort, setSort] = useState<SortKey>("followers");
  // Until 7 days of data exist, "This week" ranks by gain since tracking began instead of an
  // all-empty column (which would leave the roster order and label it a ranking).
  const weekReady = stats.some((s) => s.gain7d != null);
  const key: SortKey = sort === "gain7d" && !weekReady ? "gainSeason" : sort;
  const sorts = SORTS.map((o) => (o.value === "gain7d" && !weekReady ? { ...o, label: "Gained" } : o));
  const rankLabel = key === "gainSeason" ? `gained ${growthLabel}` : SORTS.find((x) => x.value === key)?.label.toLowerCase();
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      stats
        .filter((s) => filter === "all" || s.contestant.status === filter)
        .sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity)),
    [stats, key, filter],
  );

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 6 ? [...p, id] : p));

  const metric = (s: ClientStats) => {
    switch (sort) {
      case "gain1d":
        return { label: "Today", node: <Delta value={s.gain1d} /> };
      case "gain7d":
        return weekReady
          ? { label: "7 days", node: <Delta value={s.gain7d} /> }
          : { label: growthLabel[0].toUpperCase() + growthLabel.slice(1), node: <Delta value={s.gainSeason} /> };
      case "pctSeason":
        return { label: "Growth", node: <Delta value={s.pctSeason} kind="percent" /> };
      case "engagementRate":
        return { label: "Engagement", node: <span>{percent(s.engagementRate, 2)}</span> };
      default:
        return { label: "Today", node: <Delta value={s.gain1d} /> };
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented value={sort} options={sorts} onChange={setSort} size="sm" />
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { value: "all", label: `All ${stats.length}` },
            { value: "active", label: `In house ${stats.filter((s) => s.contestant.status === "active").length}` },
            { value: "evicted", label: `Evicted ${stats.filter((s) => s.contestant.status === "evicted").length}` },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((s, i) => {
          const m = metric(s);
          const isPicked = picked.includes(s.contestant.id);
          const evicted = s.contestant.status === "evicted";
          return (
            <div
              key={s.contestant.id}
              className={`group relative rounded-2xl border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                isPicked ? "border-accent ring-2 ring-accent/30" : "border-line"
              }`}
            >
              <Link href={`/contestants/${s.contestant.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Open ${s.contestant.name}`} />
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar name={s.contestant.name} photo={s.photo} size={56} evicted={evicted} rounded="xl" />
                  <span className="absolute -bottom-1.5 -right-1.5">
                    <RankBadge rank={s.rank} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {/* The photo badge is the follower rank; show the list position only when sorted by something else. */}
                    {key !== "followers" && s[key] != null && <span className="tnum text-xs text-muted">#{i + 1} by {rankLabel}</span>}
                    {evicted && <span className="rounded bg-surface-2 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Evicted</span>}
                  </div>
                  <div className="truncate font-semibold leading-tight">{s.contestant.name}</div>
                  <div className="truncate text-xs text-muted">
                    {s.contestant.instagram ? "@" + s.contestant.instagram : s.contestant.profession}
                  </div>
                </div>
                <button
                  onClick={() => toggle(s.contestant.id)}
                  className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border text-sm transition-colors ${
                    isPicked ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-line-strong hover:text-ink"
                  }`}
                  aria-pressed={isPicked}
                  aria-label={isPicked ? `Remove ${s.contestant.name} from comparison` : `Add ${s.contestant.name} to comparison`}
                  title={isPicked ? "Remove from compare" : "Add to compare"}
                >
                  {isPicked ? "✓" : "+"}
                </button>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="tnum text-2xl font-semibold tracking-tight">{compact(s.followers)}</div>
                  <div className="text-xs text-muted">followers</div>
                </div>
                <Sparkline values={s.sparkline} width={104} height={36} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                <div>
                  <div className="text-muted">{m.label}</div>
                  <div className="font-semibold">{m.node}</div>
                </div>
                <div>
                  {s.rankChange7d != null ? (
                    <>
                      <div className="text-muted">Rank 7d</div>
                      <div className="font-semibold"><RankChange value={s.rankChange7d} /></div>
                    </>
                  ) : (
                    <>
                      <div className="text-muted">24 h</div>
                      <div className="font-semibold"><Delta value={s.gain24h ?? s.liveGain} /></div>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-muted">Eng. rate</div>
                  <div className="tnum font-semibold">{percent(s.engagementRate, 1)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(640px,calc(100%-32px))] items-center gap-3 rounded-2xl border border-line bg-surface/95 p-2.5 pl-4 shadow-2xl backdrop-blur">
          <div className="flex -space-x-2">
            {picked.map((id) => {
              const s = stats.find((x) => x.contestant.id === id)!;
              return <Avatar key={id} name={s.contestant.name} photo={s.photo} size={32} className="ring-2 ring-[var(--surface)]" />;
            })}
          </div>
          <span className="text-sm text-ink-2">{picked.length < 2 ? "Pick one more" : `${picked.length} selected`}</span>
          <button onClick={() => setPicked([])} className="ml-auto text-sm text-muted hover:text-ink">Clear</button>
          <Link
            href={`/compare?ids=${picked.join(",")}`}
            aria-disabled={picked.length < 2}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${picked.length >= 2 ? "bg-accent text-accent-ink" : "pointer-events-none bg-surface-2 text-muted"}`}
          >
            Compare →
          </Link>
        </div>
      )}
    </div>
  );
}
