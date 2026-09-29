"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, isAdmin, passwordMatches, startSession } from "@/lib/admin-auth";
import { LIVE_TAG, readRoster, writeRoster } from "@/lib/data";
import { hasWriteAccess, runCollectorNow } from "@/lib/github";
import { lookupInstagram, parseHandle } from "@/lib/instagram";
import type { Contestant } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Your admin session has expired. Sign in again.");
}

/** Save, refresh the public pages, and ask the collector to run now so stats appear quickly. */
async function saveAndRefresh(roster: Contestant[], message: string, collect: boolean): Promise<string> {
  const where = await writeRoster(roster, message);
  updateTag(LIVE_TAG);
  revalidatePath("/", "layout");
  if (where === "local") return "Saved to data/contestants.json. Run `npm run collect` to fetch their stats.";
  if (collect && hasWriteAccess() && (await runCollectorNow())) return "Saved. Collection started, stats appear in about a minute.";
  return "Saved. Stats appear after the next 15-minute collection.";
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "Wrong password." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin");
}

export async function addContestant(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const handle = parseHandle(String(form.get("instagram") ?? ""));
    if (!handle) return { error: "Paste an Instagram profile URL (instagram.com/username) or a @username." };
    const roster = await readRoster();
    if (roster.some((c) => c.instagram.toLowerCase() === handle.toLowerCase())) return { error: `@${handle} is already tracked.` };

    const ig = await lookupInstagram(handle);
    const name = String(form.get("name") ?? "").trim() || ig.name;
    let id = slugify(name) || slugify(handle);
    while (roster.some((c) => c.id === id)) id += "-2";
    const status = form.get("status") === "evicted" ? "evicted" : "active";
    roster.push({
      id,
      name,
      teluguName: String(form.get("teluguName") ?? "").trim(),
      profession: String(form.get("profession") ?? "").trim() || "Contestant",
      status,
      instagram: ig.username,
      evictedOn: status === "evicted" ? todayIST() : null,
      entryType: form.get("entryType") === "original" ? "original" : "wildcard",
      addedOn: todayIST(),
    });
    const note = await saveAndRefresh(roster, `roster: add ${name} (@${ig.username})`, true);
    return { ok: true, message: `Added ${name} (@${ig.username}, ${ig.followers.toLocaleString("en-IN")} followers). ${note}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateContestant(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = String(form.get("id"));
    const roster = await readRoster();
    const c = roster.find((x) => x.id === id);
    if (!c) return { error: "Contestant not found. Reload the page." };

    const changes: string[] = [];
    let collect = false;
    const rawHandle = String(form.get("instagram") ?? "").trim();
    if (rawHandle) {
      const handle = parseHandle(rawHandle);
      if (!handle) return { error: "That doesn't look like an Instagram URL or username." };
      if (handle.toLowerCase() !== c.instagram.toLowerCase()) {
        const ig = await lookupInstagram(handle);
        c.instagram = ig.username;
        changes.push(`@${ig.username}`);
        collect = true;
      }
    }
    const status = form.get("status") === "evicted" ? "evicted" : "active";
    const evictedOn = String(form.get("evictedOn") ?? "") || null;
    if (status !== c.status) {
      c.status = status;
      c.manual = true; // keep the automatic roster check from flipping it back
      changes.push(status === "evicted" ? "evicted" : "back in the house");
    }
    const wantDate = c.status === "evicted" ? (evictedOn ?? c.evictedOn ?? todayIST()) : null;
    if (wantDate !== c.evictedOn) {
      c.evictedOn = wantDate;
      if (wantDate) changes.push(`eviction date ${wantDate}`);
    }
    if (!changes.length) return { ok: true, message: "No changes." };
    const note = await saveAndRefresh(roster, `roster: ${c.name}: ${changes.join(", ")}`, collect);
    return { ok: true, message: `${c.name}: ${changes.join(", ")}. ${note}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function collectNow(): Promise<ActionState> {
  try {
    await requireAdmin();
    if (!hasWriteAccess()) return { error: "GITHUB_TOKEN is not configured." };
    return (await runCollectorNow())
      ? { ok: true, message: "Collection started. New numbers appear in about a minute." }
      : { error: "GitHub refused to start the workflow. Check the token has Actions: read/write." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
