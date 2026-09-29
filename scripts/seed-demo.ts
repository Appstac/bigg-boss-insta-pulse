/**
 * Generates realistic-looking DEMO data so the dashboard can be built and
 * reviewed before the Instagram API is connected. The UI shows a banner while
 * data/meta.json says source = "demo". Running `npm run collect` with real
 * credentials wipes this and starts real tracking.
 *
 *   npm run seed:demo
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Contestant, MediaType, Post, Season, Snapshot } from "../src/lib/types";

const DATA = path.join(process.cwd(), "data");
const read = <T,>(f: string): T => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
const write = (f: string, v: unknown) => writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 1) + "\n");

const season = read<Season>("season.json");
const contestants = read<Contestant[]>("contestants.json");

function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const todayIST = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const start = addDays(season.premiereDate, -7); // one pre-season week as baseline
const days: string[] = [];
for (let d = start; d <= todayIST; d = addDays(d, 1)) days.push(d);

// Simulation-only eviction days for evicted contestants (Sundays after premiere).
const evicted = contestants.filter((c) => c.status === "evicted");
const simEviction = new Map(evicted.map((c, i) => [c.id, c.evictedOn ?? addDays(season.premiereDate, 7 * (evicted.length - i))]));

const snapshots: Snapshot[] = [];
const posts: Post[] = [];

for (const c of contestants) {
  const r = rng(c.id);
  const logMin = Math.log(15_000), logMax = Math.log(2_500_000);
  let followers = Math.round(Math.exp(logMin + r() * (logMax - logMin)));
  let following = Math.round(200 + r() * 1500);
  let postCount = Math.round(80 + r() * 1400);
  const popularity = 0.4 + r() * 1.8; // how much the show boosts them
  const er = 0.01 + r() * 0.07; // base engagement rate
  const evictDay = simEviction.get(c.id);

  for (const date of days) {
    const inSeason = date >= season.premiereDate && (!evictDay || date <= evictDay);
    const weekday = new Date(date + "T00:00:00Z").getUTCDay();
    let rate: number;
    if (date < season.premiereDate) rate = 0.0005 + r() * 0.001;
    else if (inSeason) {
      const weekend = weekday === 0 || weekday === 6 ? 1.8 : 1;
      const launch = date === season.premiereDate || date === addDays(season.premiereDate, 1) ? 4 : 1;
      const event = r() < 0.08 ? 2 + r() * 3 : 1; // viral task / fight
      rate = (0.002 + r() * 0.006) * popularity * weekend * launch * event;
      if (evictDay === date) rate *= 2.5;
    } else {
      rate = -0.0004 + r() * 0.0012; // post-eviction plateau, occasional unfollows
    }
    followers = Math.max(1000, Math.round(followers * (1 + rate)));
    if (r() < 0.1) following += Math.round(r() * 4);

    // Posts: team-managed accounts post more during the season.
    const expected = date < season.premiereDate ? 0.4 : inSeason ? 1.4 * (0.6 + r()) : 0.8;
    const n = Math.floor(expected) + (r() < expected % 1 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      postCount++;
      const hour = [9, 11, 13, 17, 18, 19, 20, 21, 22, 23][Math.floor(r() * 10)];
      const minute = Math.floor(r() * 60);
      const ts = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
      const kind = r();
      const type: MediaType = kind < 0.55 ? "REEL" : kind < 0.8 ? "CAROUSEL_ALBUM" : "IMAGE";
      const boost = type === "REEL" ? 1.4 : 1;
      const noise = Math.exp((r() - 0.5) * 1.6);
      const likes = Math.round(followers * er * boost * noise);
      posts.push({
        postId: `${c.id}-${date}-${k}`,
        id: c.id,
        timestamp: ts.toISOString(),
        type,
        likes: r() < 0.04 ? null : likes,
        comments: Math.round(likes * (0.01 + r() * 0.04)),
        permalink: "",
        caption: "Demo post",
      });
    }
    snapshots.push({ date, id: c.id, followers, following, posts: postCount });
  }
}

write("snapshots.json", snapshots);
write("posts.json", posts);
write("meta.json", { source: "demo", lastUpdated: new Date().toISOString() });
console.log(`Demo data: ${contestants.length} contestants, ${days.length} days, ${posts.length} posts.`);
