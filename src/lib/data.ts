import "server-only";
import { cache } from "react";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { hasWriteAccess, latestDataSha, readDataFile, repo, writeDataFile } from "./github";
import type { Contestant, Dataset, IntradayPoint, Meta, Post, Profile, Season, Snapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Live data (snapshots, posts, photos) is committed every ~15 minutes to the repo's `data` branch.
 * On Vercel the site reads it from there with a short cache, so new numbers show up without a
 * redeploy. Locally (or if DATA_BASE_URL is set to "local") it reads ./data and ./public/avatars.
 */
const DATA_BASE_URL =
  process.env.DATA_BASE_URL ?? (process.env.VERCEL && repo() ? `https://raw.githubusercontent.com/${repo()}/data` : "local");
const REMOTE = DATA_BASE_URL !== "local";

/** Seconds between checks for a new data-branch commit (the collector publishes every ~15 min). */
export const DATA_REVALIDATE = 60;
/** Cache tag on every live-data fetch; admin edits expire it so changes show immediately. */
export const LIVE_TAG = "live-data";

function readLocal<T>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

/** One sha lookup per render, shared by every file read; the lookup itself is cached for 60 s. */
const currentDataSha = cache(async (): Promise<string | null> => {
  try {
    return await latestDataSha({ next: { revalidate: DATA_REVALIDATE, tags: [LIVE_TAG] } });
  } catch {
    return null;
  }
});

async function readLive<T>(file: string, fallback: T): Promise<T> {
  if (!REMOTE) return readLocal(file, fallback);
  try {
    const next = { revalidate: DATA_REVALIDATE, tags: [LIVE_TAG] };
    // With a token, read through the GitHub API (fresh, works for private repos); otherwise the
    // public raw URL (its CDN can lag a few minutes).
    if (hasWriteAccess()) {
      // Files are read at a specific commit: that content never changes, so it is cached for good
      // and only re-downloaded when the collector (or /admin) publishes a new commit.
      const sha = await currentDataSha();
      const text = sha
        ? await readDataFile(file, { cache: "force-cache", next: { tags: [LIVE_TAG] } }, sha)
        : await readDataFile(file, { next });
      return text == null ? readLocal(file, fallback) : (JSON.parse(text) as T);
    }
    const res = await fetch(`${DATA_BASE_URL}/${file}`, { next });
    if (!res.ok) return readLocal(file, fallback);
    return (await res.json()) as T;
  } catch {
    // Data branch unreachable: fall back to the copy bundled at build time.
    return readLocal(file, fallback);
  }
}

/** A hand-picked image in public/contestants/ always wins over the Instagram profile photo. */
function handPicked(id: string): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const rel = `contestants/${id}.${ext}`;
    const abs = path.join(PUBLIC_DIR, rel);
    if (existsSync(abs)) return `/${rel}?v=${Math.floor(statSync(abs).mtimeMs / 1000)}`;
  }
  return null;
}

function instagramPhoto(id: string, meta: Meta): string | null {
  if (REMOTE) {
    const fetchedAt = meta.photos?.[id];
    return fetchedAt ? `${DATA_BASE_URL}/avatars/${id}.jpg?v=${Date.parse(fetchedAt)}` : null;
  }
  const abs = path.join(PUBLIC_DIR, "avatars", `${id}.jpg`);
  return existsSync(abs) ? `/avatars/${id}.jpg?v=${Math.floor(statSync(abs).mtimeMs / 1000)}` : null;
}

async function readPosts(contestants: Contestant[]): Promise<Post[]> {
  if (!REMOTE && !existsSync(path.join(DATA_DIR, "posts"))) return readLocal<Post[]>("posts.json", []);
  const perContestant = await Promise.all(contestants.map((c) => readLive<Post[]>(`posts/${c.id}.json`, [])));
  return perContestant.flat();
}

export async function loadDataset(): Promise<Dataset> {
  // The roster is live data (roster sync + /admin edit it); season settings are code-level config.
  const contestants = await readLive<Contestant[]>("contestants.json", readLocal<Contestant[]>("contestants.json", []));
  const season = readLocal<Season>("season.json", {} as Season);
  const [meta, profiles, snapshots, intraday, posts] = await Promise.all([
    readLive<Meta>("meta.json", { source: "demo", lastUpdated: null }),
    readLive<Record<string, Profile>>("profiles.json", {}),
    readLive<Snapshot[]>("snapshots.json", []),
    readLive<IntradayPoint[]>("intraday.json", []),
    readPosts(contestants),
  ]);
  const photos: Record<string, string> = {};
  for (const c of contestants) {
    const p = handPicked(c.id) ?? instagramPhoto(c.id, meta);
    if (p) photos[c.id] = p;
  }
  return { season, contestants, profiles, photos, snapshots, intraday, posts, meta };
}

/** Config-only access for places that just need the contestant list (e.g. generateStaticParams). */
export function loadContestants(): Contestant[] {
  return readLocal<Contestant[]>("contestants.json", []);
}

/** Roster for the admin page, read uncached so edits are visible straight away. */
export async function readRoster(): Promise<Contestant[]> {
  if (hasWriteAccess()) {
    const text = await readDataFile("contestants.json", { cache: "no-store" });
    if (text) return JSON.parse(text) as Contestant[];
  }
  return readLocal<Contestant[]>("contestants.json", []);
}

/** Saves the roster to the data branch (production) or ./data (local development). */
export async function writeRoster(roster: Contestant[], message: string): Promise<"github" | "local"> {
  const json = JSON.stringify(roster, null, 2) + "\n";
  if (hasWriteAccess()) {
    await writeDataFile("contestants.json", json, message);
    return "github";
  }
  if (process.env.VERCEL) throw new Error("GITHUB_TOKEN is not configured, so changes cannot be saved on the live site.");
  writeFileSync(path.join(DATA_DIR, "contestants.json"), json);
  return "local";
}
