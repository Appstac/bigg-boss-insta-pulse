/**
 * Daily collector: pulls public profile + recent-post metrics for every
 * contestant through the Instagram Graph API "Business Discovery" endpoint and
 * upserts today's snapshot into data/*.json.
 *
 * Requires (env or .env.local):
 *   IG_USER_ID        - YOUR Instagram Business/Creator account id
 *   IG_ACCESS_TOKEN   - long-lived token with instagram_basic + pages_show_list
 *   GRAPH_API_VERSION - optional, defaults to v26.0
 *
 * Only Business/Creator target accounts are visible to Business Discovery.
 * Reach/impressions of other accounts are not available from any official API.
 *
 *   npm run collect
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Contestant, IntradayPoint, MediaType, Meta, Post, Profile, Season, Snapshot } from "../src/lib/types";

const DATA = path.join(process.cwd(), "data");
const read = <T,>(f: string, fb: T): T => {
  const p = path.join(DATA, f);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fb;
};
const write = (f: string, v: unknown) => writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 1) + "\n");

function loadEnvFile() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
const VERSION = process.env.GRAPH_API_VERSION ?? "v26.0";
if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error("Missing IG_USER_ID / IG_ACCESS_TOKEN. See README.md → 'Connect Instagram'.");
  process.exit(1);
}

interface BDMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
}
interface BDResponse {
  business_discovery?: {
    followers_count: number;
    follows_count: number;
    media_count: number;
    name?: string;
    biography?: string;
    website?: string;
    profile_picture_url?: string;
    media?: { data: BDMedia[]; paging?: { cursors?: { after?: string } } };
  };
  error?: { message: string };
}

const MEDIA_FIELDS = "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink,media_url,thumbnail_url";
const MAX_PAGES = 8;

/** Profile + first page of media, or (with `after`) just the next page of media. */
async function discover(username: string, after?: string): Promise<BDResponse> {
  const fields = after
    ? `business_discovery.username(${username}){media.after(${after}).limit(50){${MEDIA_FIELDS}}}`
    : `business_discovery.username(${username}){followers_count,follows_count,media_count,name,biography,website,profile_picture_url,` +
      `media.limit(50){${MEDIA_FIELDS}}}`;
  const url = new URL(`https://graph.facebook.com/${VERSION}/${IG_USER_ID}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", IG_ACCESS_TOKEN!);
  const res = await fetch(url);
  return (await res.json()) as BDResponse;
}

/** Instagram CDN URLs expire, so the profile photo is saved locally each run. */
async function savePhoto(id: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo HTTP ${res.status}`);
  const dir = path.join(process.cwd(), "public", "avatars");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${id}.jpg`), Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const contestants = read<Contestant[]>("contestants.json", []);
  const meta = read<Meta>("meta.json", { source: "demo", lastUpdated: null });
  const wipeDemo = meta.source === "demo";
  let snapshots = wipeDemo ? [] : read<Snapshot[]>("snapshots.json", []);
  // Posts live in data/posts/<id>.json (one file per contestant keeps each under the 2 MB fetch-cache limit).
  const postsDir = path.join(DATA, "posts");
  const storedPosts = wipeDemo
    ? []
    : existsSync(postsDir)
      ? readdirSync(postsDir).flatMap((f) => read<Post[]>(`posts/${f}`, []))
      : read<Post[]>("posts.json", []);
  const posts = new Map(storedPosts.map((p) => [p.postId, p]));
  const profiles = read<Record<string, Profile>>("profiles.json", {});
  const intraday = (wipeDemo ? [] : read<IntradayPoint[]>("intraday.json", [])).filter(
    (p) => Date.now() - Date.parse(p.t) < 48 * 3600_000,
  );
  const photos: Record<string, string> = { ...(meta.photos ?? {}) };
  const runAt = new Date().toISOString().slice(0, 16) + ":00.000Z";
  const premiere = read<Season>("season.json", {} as Season).premiereDate ?? "1970-01-01";
  if (wipeDemo) console.log("Replacing demo data with real Instagram data.");

  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  let ok = 0;
  const failures: string[] = [];

  for (const c of contestants) {
    if (!c.instagram) {
      failures.push(`${c.name}: no instagram handle in data/contestants.json`);
      continue;
    }
    try {
      const r = await discover(c.instagram);
      const bd = r.business_discovery;
      if (!bd) throw new Error(r.error?.message ?? "not a Business/Creator account?");
      snapshots = snapshots.filter((s) => !(s.id === c.id && s.date === today));
      snapshots.push({ date: today, id: c.id, followers: bd.followers_count, following: bd.follows_count, posts: bd.media_count });
      intraday.push({ t: runAt, id: c.id, followers: bd.followers_count });
      // Page back through posts until we reach the premiere, or (once a contestant is backfilled)
      // until we hit posts we already have.
      const backfilled = [...posts.values()].some((p) => p.id === c.id && p.timestamp.slice(0, 10) < premiere);
      const media = [...(bd.media?.data ?? [])];
      let cursor = bd.media?.paging?.cursors?.after;
      let page = media;
      for (let n = 1; n < MAX_PAGES && cursor; n++) {
        const oldest = page.at(-1)?.timestamp.slice(0, 10) ?? "";
        if (!page.length || oldest < premiere || (backfilled && page.some((m) => posts.has(m.id)))) break;
        const next = (await discover(c.instagram, cursor)).business_discovery?.media;
        page = next?.data ?? [];
        media.push(...page);
        cursor = next?.paging?.cursors?.after;
      }
      for (const m of media) {
        const type: MediaType = m.media_product_type === "REELS" ? "REEL" : m.media_type;
        posts.set(m.id, {
          postId: m.id,
          id: c.id,
          timestamp: m.timestamp,
          type,
          likes: m.like_count ?? null, // null when the owner hides like counts
          comments: m.comments_count ?? 0,
          permalink: m.permalink ?? "",
          caption: (m.caption ?? "").slice(0, 280),
          image: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url,
        });
      }
      profiles[c.id] = { fullName: bd.name ?? "", biography: bd.biography ?? "", website: bd.website ?? "" };
      // Profile photos change rarely; refresh once a day rather than every run.
      const photoFile = path.join(process.cwd(), "public", "avatars", `${c.id}.jpg`);
      const stale = !photos[c.id] || Date.now() - Date.parse(photos[c.id]) > 24 * 3600_000 || !existsSync(photoFile);
      if (bd.profile_picture_url && stale) {
        await savePhoto(c.id, bd.profile_picture_url)
          .then(() => (photos[c.id] = new Date().toISOString()))
          .catch((e) => console.warn(`  photo for ${c.name} not saved: ${e.message}`));
      }
      ok++;
      console.log(`✓ ${c.name} (@${c.instagram}): ${bd.followers_count.toLocaleString("en-IN")} followers, ${media.length} posts read`);
    } catch (e) {
      failures.push(`${c.name} (@${c.instagram}): ${(e as Error).message}`);
    }
  }

  snapshots.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (ok > 0) {
    write("snapshots.json", snapshots);
    write("profiles.json", profiles);
    write("intraday.json", intraday.sort((a, b) => a.t.localeCompare(b.t) || a.id.localeCompare(b.id)));
    mkdirSync(postsDir, { recursive: true });
    const all = [...posts.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const c of contestants) write(`posts/${c.id}.json`, all.filter((p) => p.id === c.id));
    rmSync(path.join(DATA, "posts.json"), { force: true });
    write("meta.json", { source: "instagram", lastUpdated: new Date().toISOString(), photos } satisfies Meta);
  }
  console.log(`\n${ok}/${contestants.length} contestants updated for ${today}.`);
  if (failures.length) console.log("Skipped:\n  " + failures.join("\n  "));
  if (ok === 0) process.exit(1);
}

main();
