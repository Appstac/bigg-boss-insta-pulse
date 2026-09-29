import type { Metadata } from "next";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { loadDataset, readRoster } from "@/lib/data";
import { hasWriteAccess } from "@/lib/github";
import { AdminPanel, LoginForm } from "./AdminPanel";

export const metadata: Metadata = { title: "Admin · Insta Pulse", robots: { index: false, follow: false } };

/** Always rendered per request: it depends on the session cookie and must never be cached. */
export const dynamic = "force-dynamic";

/** Not linked anywhere on the site; protected by ADMIN_PASSWORD. */
export default async function AdminPage() {
  if (!adminEnabled()) {
    return (
      <div className="mx-auto max-w-md card p-6 text-sm text-ink-2">
        Admin is turned off. Set the <code className="rounded bg-surface-2 px-1">ADMIN_PASSWORD</code> environment variable to enable it.
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const [roster, ds] = await Promise.all([readRoster(), loadDataset()]);
  const latest = new Map<string, number>();
  for (const s of ds.snapshots) latest.set(s.id, s.followers);

  return (
    <AdminPanel
      roster={roster.map((c) => ({ ...c, photo: ds.photos[c.id] ?? null, followers: latest.get(c.id) ?? null }))}
      lastUpdated={ds.meta.lastUpdated}
      canSaveOnline={hasWriteAccess()}
      igConfigured={Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN)}
      isLocal={!process.env.VERCEL}
    />
  );
}
