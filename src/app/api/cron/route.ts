/**
 * Heartbeat for an external scheduler (e.g. cron-job.org every 15 minutes): starts the Instagram
 * collection when the published data is stale and nothing is already running. No secret needed:
 * calling it more often can't start more than one pending run (see kickCollectorIfStale).
 */
import { kickCollectorIfStale } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await kickCollectorIfStale();
  return Response.json({ result }, { headers: { "cache-control": "no-store" } });
}
