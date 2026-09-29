"use client";

import { useState } from "react";
import type { ClientStats } from "@/lib/analytics";
import { assignSlots, MAX_SERIES } from "@/lib/colors";
import { ContestantPicker } from "./ContestantPicker";
import { TREND_MODES, TREND_RANGES, TrendChart, type TrendMode, type TrendRange } from "./TrendChart";
import { Segmented } from "./ui";

export function TrendPanel({ stats, initial, premiereDate }: { stats: ClientStats[]; initial: string[]; premiereDate: string }) {
  const [selected, setSelected] = useState(initial);
  const [slots, setSlots] = useState(() => assignSlots(initial, {}));
  const [mode, setMode] = useState<TrendMode>("followers");
  const [range, setRange] = useState<TrendRange>("all");

  const change = (ids: string[]) => {
    setSelected(ids);
    setSlots((prev) => assignSlots(ids, prev));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ContestantPicker
            options={stats.map((s) => ({ ...s.contestant, photo: s.photo }))}
            selected={selected}
            slots={slots}
            max={MAX_SERIES}
            onChange={change}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented value={mode} options={TREND_MODES} onChange={setMode} />
          <Segmented value={range} options={TREND_RANGES} onChange={setRange} />
        </div>
      </div>
      <TrendChart
        stats={selected.map((id) => stats.find((s) => s.contestant.id === id)!).filter(Boolean)}
        slots={slots}
        mode={mode}
        range={range}
        premiereDate={premiereDate}
      />
    </div>
  );
}
