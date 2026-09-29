import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadContestants } from "@/lib/data";
import { ClientSetup } from "./ClientSetup";

export const metadata: Metadata = { title: "Connect Instagram · Insta Pulse", robots: { index: false } };

/** Local-only setup page; never part of the deployed site. */
export default function SetupPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const test = loadContestants().find((c) => c.instagram)?.instagram ?? "";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">One-time setup</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Connect Instagram</h1>
        <p className="mt-1 text-sm text-muted">
          Log in with the Facebook account that owns your Page and <strong>@dreamers__hope</strong>. The token is saved only to{" "}
          <code className="rounded bg-surface-2 px-1">.env.local</code> on this computer.
        </p>
      </div>
      <ClientSetup defaultAppId={process.env.NEXT_PUBLIC_FB_APP_ID ?? "1074293098730326"} testUsername={test} />
    </div>
  );
}
