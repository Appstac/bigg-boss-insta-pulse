"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { Segmented } from "./ui";

export interface BoardRow {
  id: string;
  name: string;
  photo: string | null;
  evicted: boolean;
  value: number;
  display: string;
  context: string;
}

export interface BoardData {
  id: string;
  chip: string;
  title: string;
  desc: string;
  empty: string;
  rows: BoardRow[];
}

// Decorative medal tones for the podium (identity of rank, not data encoding).
const MEDALS = [
  { ring: "#f5b301", label: "Gold" },
  { ring: "#a8adb5", label: "Silver" },
  { ring: "#c07a3c", label: "Bronze" },
];

function Medal({ place }: { place: number }) {
  const m = MEDALS[place - 1];
  return (
    <span
      className="tnum absolute -bottom-2 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-[var(--surface)]"
      style={{ background: m.ring }}
      aria-label={`${m.label}, rank ${place}`}
    >
      {place}
    </span>
  );
}

function PodiumSpot({ row, place }: { row: BoardRow; place: number }) {
  const first = place === 1;
  return (
    <Link href={`/contestants/${row.id}`} className={`group flex flex-col items-center text-center ${first ? "" : "pt-6"}`}>
      <span className="relative">
        <span className="block rounded-full p-[3px]" style={{ background: MEDALS[place - 1].ring }}>
          <span className="block rounded-full bg-surface p-[2px]">
            <Avatar name={row.name} photo={row.photo} size={first ? 84 : 64} evicted={row.evicted} />
          </span>
        </span>
        <Medal place={place} />
      </span>
      <span className="mt-4 line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight group-hover:underline">{row.name}</span>
      <span className={`tnum mt-1 font-bold tracking-tight ${first ? "text-xl" : "text-lg"}`}>{row.display}</span>
      <span className="mt-0.5 line-clamp-1 text-xs text-muted">{row.evicted ? "Evicted" : row.context}</span>
      <span
        className={`mt-3 w-full rounded-t-xl bg-surface-2 ${first ? "h-10" : place === 2 ? "h-7" : "h-4"}`}
        aria-hidden
      />
    </Link>
  );
}

export function LeaderboardView({ boards }: { boards: BoardData[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [scope, setScope] = useState<"all" | "house">("all");
  const boardId = boards.some((b) => b.id === params.get("board")) ? params.get("board")! : boards[0].id;
  const board = boards.find((b) => b.id === boardId)!;

  const choose = (id: string) => {
    const q = new URLSearchParams(params);
    q.set("board", id);
    router.replace(`${pathname}?${q}`, { scroll: false });
  };

  const rows = board.rows.filter((r) => scope === "all" || !r.evicted);
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  const rest = podium.length ? rows.slice(3) : rows;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Category chips */}
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-2 pb-1">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => choose(b.id)}
              aria-pressed={b.id === boardId}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                b.id === boardId ? "border-transparent bg-ink text-page" : "border-line bg-surface text-ink-2 hover:text-ink"
              }`}
            >
              {b.chip}
            </button>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{board.title}</h2>
            <p className="text-sm text-muted">{board.desc}</p>
          </div>
          <Segmented
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "All" },
              { value: "house", label: "In house" },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <p className="px-5 pb-8 text-sm text-muted">{board.empty}</p>
        ) : (
          <>
            {podium.length > 0 && (
              <div className="grid grid-cols-3 items-end gap-2 border-b border-line px-3 sm:gap-6 sm:px-10">
                <PodiumSpot row={podium[1]} place={2} />
                <PodiumSpot row={podium[0]} place={1} />
                <PodiumSpot row={podium[2]} place={3} />
              </div>
            )}

            <ol className="divide-y divide-[var(--border)]">
              {rest.map((r, i) => {
                const rank = (podium.length ? 4 : 1) + i;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/contestants/${r.id}`}
                      className="grid grid-cols-[1.75rem_2.5rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5"
                    >
                      <span className="tnum text-right text-sm font-semibold text-muted">{rank}</span>
                      <Avatar name={r.name} photo={r.photo} size={40} evicted={r.evicted} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{r.name}</span>
                          {r.evicted && (
                            <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Evicted
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <span
                              className="block h-1 rounded-full"
                              style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.value < 0 ? "var(--neg-3)" : "var(--series-1)" }}
                            />
                          </span>
                          <span className="hidden w-28 shrink-0 truncate text-right text-[11px] text-muted sm:block">{r.context}</span>
                        </span>
                      </span>
                      <span className="tnum text-right text-sm font-semibold">{r.display}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}
