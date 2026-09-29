"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Contestant } from "@/lib/types";
import { addContestant, collectNow, login, logout, updateContestant, type ActionState } from "./actions";

type Row = Contestant & { photo: string | null; followers: number | null };

const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent";
const btn = "rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50";

function Notice({ state }: { state: ActionState }) {
  if (state.error) return <p className="rounded-xl bg-down-bg px-3 py-2 text-sm text-down">{state.error}</p>;
  if (state.message) return <p className="rounded-xl bg-up-bg px-3 py-2 text-sm text-up">{state.message}</p>;
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="card mx-auto max-w-sm space-y-4 p-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Restricted</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Admin sign in</h1>
      </div>
      <input name="password" type="password" autoComplete="current-password" placeholder="Admin password" required className={input} autoFocus />
      <Notice state={state} />
      <button disabled={pending} className={`${btn} w-full bg-ink text-page`}>{pending ? "Checking…" : "Sign in"}</button>
    </form>
  );
}

function AddForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(addContestant, {});
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Add a contestant</h2>
        <p className="text-sm text-muted">
          Paste their Instagram profile link. The account is checked straight away; tracking, charts, rankings and comparisons pick them up
          automatically, and past posts are backfilled to the premiere.
        </p>
      </div>
      <input name="instagram" required placeholder="https://www.instagram.com/username/" className={input} disabled={disabled} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="name" placeholder="Name (optional, taken from Instagram)" className={input} disabled={disabled} />
        <input name="teluguName" placeholder="Telugu name (optional)" className={input} disabled={disabled} />
        <input name="profession" placeholder="Profession (optional)" className={input} disabled={disabled} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select name="entryType" defaultValue="wildcard" className={`${input} w-auto`} disabled={disabled}>
          <option value="wildcard">Wildcard entry</option>
          <option value="original">Original contestant</option>
        </select>
        <select name="status" defaultValue="active" className={`${input} w-auto`} disabled={disabled}>
          <option value="active">In the house</option>
          <option value="evicted">Already evicted</option>
        </select>
        <button disabled={pending || disabled} className={`${btn} ml-auto bg-accent text-accent-ink`}>{pending ? "Checking Instagram…" : "Add contestant"}</button>
      </div>
      <Notice state={state} />
    </form>
  );
}

function RosterRow({ c, disabled }: { c: Row; disabled: boolean }) {
  const [state, action, pending] = useActionState(updateContestant, {});
  const [status, setStatus] = useState(c.status);
  const needsHandle = !c.instagram;
  return (
    <form action={action} className={`rounded-2xl border p-3 ${needsHandle ? "border-[var(--down)]" : "border-line"} bg-surface`}>
      <input type="hidden" name="id" value={c.id} />
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={c.name} photo={c.photo} size={40} evicted={c.status === "evicted"} />
        <div className="min-w-40 flex-1">
          <div className="font-medium">
            {c.name}
            {c.entryType === "wildcard" && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">Wildcard</span>}
          </div>
          <div className="text-xs text-muted">
            {needsHandle ? <span className="font-semibold text-down">Needs Instagram handle</span> : `@${c.instagram}`}
            {c.followers != null && ` · ${c.followers.toLocaleString("en-IN")} followers`}
          </div>
        </div>
        <input name="instagram" placeholder={needsHandle ? "Instagram URL or @handle" : "Change handle (optional)"} className={`${input} w-56`} disabled={disabled} />
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value as Row["status"])} className={`${input} w-auto`} disabled={disabled}>
          <option value="active">In house</option>
          <option value="evicted">Evicted</option>
        </select>
        {status === "evicted" && <input name="evictedOn" type="date" defaultValue={c.evictedOn ?? ""} className={`${input} w-auto`} disabled={disabled} />}
        <button disabled={pending || disabled} className={`${btn} bg-ink text-page`}>{pending ? "Saving…" : "Save"}</button>
      </div>
      {(state.error || state.message) && (
        <div className="mt-2">
          <Notice state={state} />
        </div>
      )}
    </form>
  );
}

export function AdminPanel({
  roster,
  lastUpdated,
  canSaveOnline,
  igConfigured,
  isLocal,
}: {
  roster: Row[];
  lastUpdated: string | null;
  canSaveOnline: boolean;
  igConfigured: boolean;
  isLocal: boolean;
}) {
  const [collectState, runCollect, collecting] = useActionState(collectNow, {});
  const canSave = canSaveOnline || isLocal;
  const sorted = [...roster].sort(
    (a, b) => Number(!!a.instagram) - Number(!!b.instagram) || Number(a.status === "evicted") - Number(b.status === "evicted") || a.name.localeCompare(b.name),
  );
  const pending = roster.filter((c) => !c.instagram).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Admin</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Contestants</h1>
          <p className="mt-1 text-sm text-muted">
            {roster.length} tracked · {roster.filter((c) => c.status === "active").length} in the house
            {pending > 0 && <span className="font-semibold text-down"> · {pending} need an Instagram handle</span>}
            {lastUpdated && ` · last collection ${new Date(lastUpdated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`}
          </p>
        </div>
        <div className="flex gap-2">
          {canSaveOnline && (
            <form action={runCollect}>
              <button disabled={collecting} className={`${btn} border border-line-strong`}>{collecting ? "Starting…" : "Collect now"}</button>
            </form>
          )}
          <form action={logout}>
            <button className={`${btn} border border-line`}>Sign out</button>
          </form>
        </div>
      </div>

      <Notice state={collectState} />
      {!canSave && (
        <p className="rounded-xl bg-down-bg px-3 py-2 text-sm text-down">Saving is off: set GITHUB_TOKEN (Contents + Actions read/write on this repo) in the Vercel environment variables.</p>
      )}
      {!igConfigured && <p className="rounded-xl bg-down-bg px-3 py-2 text-sm text-down">IG_USER_ID / IG_ACCESS_TOKEN are not set here, so new handles cannot be checked.</p>}

      <AddForm disabled={!canSave || !igConfigured} />

      <section className="space-y-2">
        <h2 className="font-semibold">Roster</h2>
        <p className="text-sm text-muted">
          Evictions and new wildcards are picked up automatically from the roster source every 6 hours. Changing a status here overrides that
          check for this contestant.
        </p>
        {sorted.map((c) => (
          <RosterRow key={c.id} c={c} disabled={!canSave} />
        ))}
      </section>
    </div>
  );
}
