/**
 * Lightweight "is there newer data?" check used by LiveRefresh on every open page.
 * Returns the latest data-branch commit. When a client reports it is showing an older version,
 * the live-data cache is expired (at most once per 20 s per server instance) so its next
 * refresh renders the new numbers.
 */
import { revalidateTag } from "next/cache";
import { LIVE_TAG } from "@/lib/data";
import { hasWriteAccess, latestDataSha } from "@/lib/github";

let lastExpired = 0;

export async function GET(request: Request) {
  if (!hasWriteAccess()) return Response.json({ version: null }, { headers: { "cache-control": "no-store" } });
  let version: string | null = null;
  try {
    // Shared, briefly cached lookup so many open tabs cost one GitHub call every 30 s.
    version = await latestDataSha({ next: { revalidate: 30 } });
  } catch {
    return Response.json({ version: null }, { headers: { "cache-control": "no-store" } });
  }
  const have = new URL(request.url).searchParams.get("have");
  if (have && /^[0-9a-f]{40}$/.test(have) && have !== version && Date.now() - lastExpired > 20_000) {
    lastExpired = Date.now();
    // Next request for these pages re-renders with the new data instead of serving the old copy.
    revalidateTag(LIVE_TAG, { expire: 0 });
  }
  return Response.json({ version }, { headers: { "cache-control": "no-store" } });
}
