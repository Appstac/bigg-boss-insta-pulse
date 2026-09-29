/**
 * Roster sync: reads the contestants tab on biggbosspulse.com (season.json → sourceUrl) and
 * updates data/contestants.json:
 *   - contestants shown as eliminated are marked evicted (evictedOn from their exit week)
 *   - new names (wildcards) are added; if the page lists an Instagram URL it is used,
 *     otherwise the contestant is added with an empty handle and shows up as "needs handle"
 *     on the /admin page
 * It never removes contestants and never overwrites a handle that is already set.
 *
 *   node scripts/sync-roster.ts            (writes changes)
 *   node scripts/sync-roster.ts --dry-run  (prints what would change)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Contestant, Season } from "../src/lib/types";

const DATA = path.join(process.cwd(), "data");
const read = <T,>(f: string, fb: T): T => {
  const p = path.join(DATA, f);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fb;
};
const DRY = process.argv.includes("--dry-run");

interface SourceRecord {
  seasonId: string;
  status: string;
  entryType?: string;
  entryWeek?: number;
  eliminatedWeek?: number;
  name: string;
  slug: string;
  nativeName?: string;
  profession?: string;
  instagramUrl?: string;
}

/** Returns the JSON object text starting at index i (brace matching that respects strings). */
function objectAt(s: string, i: number): string | null {
  let depth = 0;
  let inStr = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return s.slice(i, j + 1);
  }
  return null;
}

export function parseRoster(html: string): SourceRecord[] {
  // The page embeds its data as escaped JSON inside script tags.
  const text = html.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  // Field order varies between records (wildcards list personId first), so match on _id and
  // check the parsed object instead.
  const start = /\{"_id":"[0-9a-f]{24}","(?:showId|personId|seasonId)"/g;
  const bySlug = new Map<string, SourceRecord>();
  for (let m; (m = start.exec(text)); ) {
    const raw = objectAt(text, m.index);
    if (!raw) continue;
    try {
      const o = JSON.parse(raw) as SourceRecord;
      if (o.seasonId && o.name && o.slug && o.status && !bySlug.has(o.slug)) bySlug.set(o.slug, o);
    } catch {
      // skip malformed fragments
    }
  }
  // Keep only the season that most records belong to (the page may mention other seasons).
  const counts = new Map<string, number>();
  for (const r of bySlug.values()) counts.set(r.seasonId, (counts.get(r.seasonId) ?? 0) + 1);
  const season = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return [...bySlug.values()].filter((r) => r.seasonId === season);
}

export function handleFromUrl(url: string | undefined): string {
  const m = (url ?? "").match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return m && !["p", "reel", "stories", "explore"].includes(m[1].toLowerCase()) ? m[1].replace(/\.$/, "") : "";
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "");

const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

async function main() {
  const season = read<Season>("season.json", {} as Season);
  const roster = read<Contestant[]>("contestants.json", []);
  const res = await fetch(season.sourceUrl, { headers: { "user-agent": "Mozilla/5.0 (compatible; InstaPulse roster check)" } });
  if (!res.ok) throw new Error(`source page HTTP ${res.status}`);
  const records = parseRoster(await res.text());
  // Guard against a page redesign: if we suddenly find far fewer people, change nothing.
  if (records.length < Math.max(5, roster.length * 0.6)) {
    console.error(`Only ${records.length} contestants parsed (roster has ${roster.length}); page layout may have changed. No changes made.`);
    process.exit(2);
  }

  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const changes: string[] = [];
  for (const r of records) {
    const existing =
      roster.find((c) => c.sourceSlug === r.slug) ??
      roster.find((c) => norm(c.name) === norm(r.name)) ??
      roster.find((c) => c.id === r.slug);
    const evicted = /elim|evict/i.test(r.status);
    const evictedOn = r.eliminatedWeek ? addDays(season.premiereDate, 7 * r.eliminatedWeek) : today;

    if (!existing) {
      const id = r.slug.replace(/[^a-z0-9-]/g, "");
      roster.push({
        id,
        name: r.name,
        teluguName: r.nativeName ?? "",
        profession: r.profession ?? "Contestant",
        status: evicted ? "evicted" : "active",
        instagram: handleFromUrl(r.instagramUrl),
        evictedOn: evicted ? evictedOn : null,
        sourceSlug: r.slug,
        entryType: r.entryType === "wildcard" ? "wildcard" : "original",
        addedOn: today,
      });
      changes.push(`+ added ${r.name}${r.entryType === "wildcard" ? " (wildcard)" : ""}${handleFromUrl(r.instagramUrl) ? ` @${handleFromUrl(r.instagramUrl)}` : " (needs Instagram handle)"}`);
      continue;
    }
    if (!existing.sourceSlug) existing.sourceSlug = r.slug;
    if (!existing.entryType && r.entryType) {
      existing.entryType = r.entryType === "wildcard" ? "wildcard" : "original";
      if (existing.entryType === "wildcard") changes.push(`· ${existing.name} marked as wildcard (week ${r.entryWeek})`);
    }
    if (evicted && existing.status !== "evicted") {
      existing.status = "evicted";
      existing.evictedOn = evictedOn;
      changes.push(`× evicted ${existing.name} (${evictedOn})`);
    } else if (evicted && !existing.evictedOn) {
      existing.evictedOn = evictedOn;
      changes.push(`· eviction date for ${existing.name}: ${evictedOn}`);
    } else if (!evicted && existing.status === "evicted" && !existing.manual) {
      // Re-entry (Bigg Boss sometimes brings evicted contestants back).
      existing.status = "active";
      changes.push(`↺ back in the house: ${existing.name}`);
    }
    if (!existing.instagram && handleFromUrl(r.instagramUrl)) {
      existing.instagram = handleFromUrl(r.instagramUrl);
      changes.push(`@ handle for ${existing.name}: @${existing.instagram}`);
    }
  }

  console.log(`Parsed ${records.length} contestants from the source page.`);
  if (!changes.length) return console.log("Roster up to date.");
  console.log(changes.join("\n"));
  if (DRY) return console.log("(dry run, nothing written)");
  writeFileSync(path.join(DATA, "contestants.json"), JSON.stringify(roster, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
