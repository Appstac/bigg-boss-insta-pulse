"use client";

import { useEffect, useState } from "react";

function ago(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ${mins % 60} min ago` : `${Math.floor(h / 24)} d ago`;
}

/** "Updated 12 min ago", ticking every 30 s; the absolute IST time is in the tooltip. */
export function RelativeTime({ iso, absolute }: { iso: string; absolute: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <time dateTime={iso} title={`${absolute} IST`}>
      {now == null ? `${absolute} IST` : ago(iso, now)}
    </time>
  );
}
