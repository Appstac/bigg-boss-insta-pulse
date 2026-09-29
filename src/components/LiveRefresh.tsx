"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 60_000;
const RETRY_MS = 8_000;

/**
 * Keeps an open page current: checks /api/version once a minute (and when the tab regains focus)
 * and, when newer data has been published, refreshes the page content in place, keeping scroll
 * position and anything picked on the page.
 */
export function LiveRefresh({ version }: { version: string | null }) {
  const router = useRouter();
  const shown = useRef(version);
  const retries = useRef(0);

  useEffect(() => {
    shown.current = version;
    retries.current = 0;
  }, [version]);

  useEffect(() => {
    if (!version) return; // local development reads files directly
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/version?have=${shown.current ?? ""}`, { cache: "no-store" });
        const { version: latest } = (await res.json()) as { version: string | null };
        if (latest && latest !== shown.current) {
          router.refresh();
          // The first refresh can still return the previous render while the server rebuilds it.
          if (retries.current++ < 3) {
            timer = setTimeout(check, RETRY_MS);
            return;
          }
        }
      } catch {
        // offline or server busy: try again next cycle
      }
      timer = setTimeout(check, POLL_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    timer = setTimeout(check, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [version, router]);

  return null;
}
