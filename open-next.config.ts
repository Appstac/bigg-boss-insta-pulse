// OpenNext settings for the Cloudflare deployment (Vercel ignores this file).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

const config = defineCloudflareConfig({
  // R2 holds the cache; the regional (Cache API) layer in front avoids most R2 reads.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // Re-renders stale pages in the background (via WORKER_SELF_REFERENCE). Without a queue the
  // default is a no-op, so pages stayed on their first cached copy forever.
  queue: memoryQueue,
});

// `npm run build` starts the OpenNext build on Cloudflare, so OpenNext must call Next directly
// rather than `npm run build` again.
const openNextConfig = { ...config, buildCommand: "npx next build" };
export default openNextConfig;
