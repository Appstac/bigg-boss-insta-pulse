"use client";

import dynamic from "next/dynamic";

/** The flow reads the login result from the URL, so it only renders in the browser. */
export const ClientSetup = dynamic(() => import("./SetupFlow").then((m) => m.SetupFlow), {
  ssr: false,
  loading: () => <div className="card p-6 text-sm text-muted">Loading…</div>,
});
