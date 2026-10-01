"use client";

import { useEffect, useState } from "react";

const STALE_MS = 60 * 60_000;

/** Banner shown when the latest collection is over an hour old (collection paused or failing). */
export function StaleNotice({ iso }: { iso: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!iso || now == null || now - Date.parse(iso) < STALE_MS) return null;
  return (
    <div className="border-b border-line bg-surface-2 px-4 py-2 text-center text-xs text-ink-2 sm:text-sm">
      <strong className="text-ink">Live updates are paused.</strong> Numbers below are from the last successful update; they will refresh automatically once
      collection resumes.
    </div>
  );
}
