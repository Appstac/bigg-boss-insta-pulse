/**
 * Eviction check from Wikipedia's "Housemates status" table.
 *
 * Runs from the collect workflow on Sunday nights after the episode and again Monday morning
 * (see .github/workflows/collect.yml), independent of anything else. For each housemate row it
 * reads the latest stint (entered / exited / status):
 *   - evicted or walked out  → mark the contestant evicted on that day (manual, so the
 *     biggbosspulse roster sync can't flip it back) and remember Wikipedia made the change
 *   - in the house or in the Secret Room → if Wikipedia had evicted them before, undo it (re-entry)
 *   - a housemate we don't track → written to data/wiki-new-entrants.txt so the workflow can open a
 *     GitHub issue (Instagram handles have to be confirmed by a person, in /admin)
 * Ambiguous or unmatched names are reported and skipped, never guessed.
 *
 *   node scripts/sync-wikipedia.ts            (writes changes)
 *   node scripts/sync-wikipedia.ts --dry-run
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
const PAGE = "Bigg_Boss_(Telugu_TV_series)_season_10";

interface Stint {
  entered: number | null;
  exited: number | null;
  status: string;
}
interface WikiHousemate {
  name: string;
  stints: Stint[];
}

/** Strip templates, refs and cell attributes from a wikitext table cell. */
function cleanCell(raw: string): string {
  let s = raw.replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
  // Leading cell attributes:  style="..." | value   or   rowspan="3" | value
  s = s.replace(/^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|(?!\|)/i, "");
  // {{nowrap|X}}, {{Eliminated|Evicted}}, {{quit|Walked with ₹15L}} → last argument
  for (let i = 0; i < 3; i++) s = s.replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, (_, inner: string) => inner.split("|").at(-1) ?? "");
  s = s.replace(/\{\{[^{}]*\}\}/g, "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?/g, "");
  return s.replace(/\s+/g, " ").trim();
}

const dayOf = (s: string) => {
  const m = s.match(/Day\s*(\d+)/i);
  return m ? Number(m[1]) : null;
};

export function parseStatusTable(wikitext: string): WikiHousemate[] {
  const start = wikitext.search(/==\s*Housemates status\s*==/i);
  if (start < 0) throw new Error("'Housemates status' section not found");
  const tableStart = wikitext.indexOf("{|", start);
  const tableEnd = wikitext.indexOf("\n|}", tableStart);
  const rows = wikitext.slice(tableStart, tableEnd).split(/\n\|-/).slice(1);
  const out: WikiHousemate[] = [];
  for (const row of rows) {
    const cells = row
      .split("\n")
      .filter((l) => l.startsWith("|") && !l.startsWith("|-") && !l.startsWith("|}"))
      .map((l) => l.slice(1));
    if (!cells.length) continue;
    // A new housemate row has: # | name | entered | exited | status | ref (6 cells).
    // A continuation row (rowspan) has: entered | exited | status | ref.
    const isNew = cells.length >= 6 || /rowspan/i.test(cells[1] ?? "");
    const c = cells.map(cleanCell);
    if (isNew) {
      out.push({ name: c[1], stints: [{ entered: dayOf(c[2]), exited: dayOf(c[3]), status: c[4] ?? "" }] });
    } else if (out.length) {
      out.at(-1)!.stints.push({ entered: dayOf(c[0]), exited: dayOf(c[1]), status: c[2] ?? "" });
    }
  }
  return out.filter((h) => h.name);
}

// ---- name matching -------------------------------------------------------------------------
/** Lowercase letters only, doubled letters collapsed, 'h' dropped (Chaitra ~ Chaithra, Dakshi ~ Dakkshi). */
const fold = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1").replace(/h/g, "");

function tokensOf(c: Contestant): string[] {
  const words = [
    ...c.name.replace(/[()]/g, " ").split(/\s+/),
    ...c.instagram.split(/[_.]+/),
    ...(c.aliases ?? []),
  ];
  return [...new Set(words.map(fold).filter((w) => w.length >= 3))];
}

function matchContestant(wikiName: string, roster: Contestant[]): Contestant | "ambiguous" | null {
  const w = fold(wikiName);
  if (w.length < 3) return null;
  const joined = (c: Contestant) => fold(c.name.replace(/\(.*?\)/g, ""));
  const exact = roster.filter((c) => (c.aliases ?? []).some((a) => fold(a) === w) || tokensOf(c).includes(w));
  const loose = exact.length ? exact : roster.filter((c) => joined(c).startsWith(w) || tokensOf(c).some((t) => t.startsWith(w) && w.length >= 4));
  if (loose.length === 1) return loose[0];
  return loose.length > 1 ? "ambiguous" : null;
}

const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

async function main() {
  const season = read<Season>("season.json", {} as Season);
  const roster = read<Contestant[]>("contestants.json", []);
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGE)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url, { headers: { "user-agent": "InstaPulse/1.0 (https://bbpulse-six.vercel.app; weekly eviction check)" } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const body = (await res.json()) as { parse?: { wikitext: string }; error?: { info: string } };
  if (!body.parse) throw new Error(body.error?.info ?? "no wikitext");
  const housemates = parseStatusTable(body.parse.wikitext);

  // Guard against a page restructure: a sane table has most of our roster in it.
  if (housemates.length < Math.max(5, roster.length * 0.6)) {
    console.error(`Only ${housemates.length} housemates parsed (roster has ${roster.length}); table layout may have changed. No changes made.`);
    process.exit(2);
  }

  const changes: string[] = [];
  const warnings: string[] = [];
  const newEntrants: string[] = [];
  for (const h of housemates) {
    const c = matchContestant(h.name, roster);
    const last = h.stints.at(-1)!;
    const gone = /evict|walk|quit|eject|disqualif/i.test(last.status) && last.exited != null;
    if (c === "ambiguous") {
      warnings.push(`"${h.name}" matches more than one contestant; add an alias in contestants.json`);
      continue;
    }
    if (!c) {
      if (!gone) newEntrants.push(`${h.name} (entered Day ${h.stints[0].entered ?? "?"})`);
      else warnings.push(`"${h.name}" (left Day ${last.exited}) is not in our roster`);
      continue;
    }
    if (gone) {
      const date = addDays(season.premiereDate, last.exited! - 1);
      if (c.status !== "evicted" || c.evictedOn !== date) {
        changes.push(`× ${c.name}: ${last.status} on Day ${last.exited} (${date})${c.status === "evicted" ? ` (was ${c.evictedOn})` : ""}`);
        c.status = "evicted";
        c.evictedOn = date;
        c.manual = true;
        c.evictionSource = "wikipedia";
      }
    } else if (c.status === "evicted" && c.evictionSource === "wikipedia") {
      // Back in the house (re-entry, or a fake eviction that ended in the Secret Room).
      changes.push(`↺ ${c.name}: back in the game per Wikipedia (${last.status || "in house"})`);
      c.status = "active";
      c.evictedOn = null;
      delete c.evictionSource;
    }
  }

  console.log(`Parsed ${housemates.length} housemates from Wikipedia.`);
  if (warnings.length) console.log("Warnings:\n  " + warnings.join("\n  "));
  if (newEntrants.length) console.log("Not tracked yet:\n  " + newEntrants.join("\n  "));
  if (!DRY) writeFileSync(path.join(DATA, "wiki-new-entrants.txt"), newEntrants.join("\n") + (newEntrants.length ? "\n" : ""));
  if (!changes.length) return console.log("Evictions up to date.");
  console.log(changes.join("\n"));
  if (DRY) return console.log("(dry run, nothing written)");
  writeFileSync(path.join(DATA, "contestants.json"), JSON.stringify(roster, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
