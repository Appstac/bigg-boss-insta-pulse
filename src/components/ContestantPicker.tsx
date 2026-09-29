"use client";

import { useMemo, useRef, useState } from "react";
import { seriesVar } from "@/lib/colors";
import { Avatar } from "./Avatar";

export interface PickerOption {
  id: string;
  name: string;
  teluguName: string;
  status: "active" | "evicted";
  photo: string | null;
}

export function ContestantPicker({
  options,
  selected,
  slots,
  max,
  onChange,
}: {
  options: PickerOption[];
  selected: string[];
  slots: Record<string, number>;
  max: number;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const full = selected.length >= max;
  const matches = options.filter(
    (o) => !selected.includes(o.id) && (o.name + " " + o.teluguName).toLowerCase().includes(query.toLowerCase()),
  );

  const add = (id: string) => {
    if (full) return;
    onChange([...selected, id]);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
        {selected.map((id) => (
          <span key={id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-1.5 pr-1 text-sm font-medium">
            <Avatar name={byId.get(id)?.name ?? id} photo={byId.get(id)?.photo ?? null} size={22} ring={seriesVar(slots[id] ?? 0)} />
            {byId.get(id)?.name ?? id}
            <button
              onClick={() => onChange(selected.filter((s) => s !== id))}
              className="rounded-full px-1.5 text-muted hover:bg-surface hover:text-ink"
              aria-label={`Remove ${byId.get(id)?.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          disabled={full}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) add(matches[0].id);
            if (e.key === "Backspace" && !query && selected.length) onChange(selected.slice(0, -1));
          }}
          placeholder={full ? `Max ${max} selected` : "Add contestant…"}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
        />
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-muted hover:text-ink">
            Clear
          </button>
        )}
      </div>
      {open && !full && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg sm:w-96">
          {matches.map((o) => (
            <li key={o.id}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(o.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar name={o.name} photo={o.photo} size={28} evicted={o.status === "evicted"} />
                  <span>
                    {o.name} <span className="text-muted">{o.teluguName}</span>
                  </span>
                </span>
                {o.status === "evicted" && <span className="text-xs text-muted">Evicted</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
