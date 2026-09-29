import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { loadDataset } from "@/lib/data";
import { Nav } from "@/components/Nav";
import { RelativeTime } from "@/components/RelativeTime";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BB Telugu 10 · Insta Pulse",
  description: "Daily Instagram follower trends, posting activity and engagement for every Bigg Boss Telugu Season 10 contestant.",
};

/** Re-render with fresh data from the data branch at most every 10 minutes (must be a literal). */
export const revalidate = 600;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { meta } = await loadDataset();
  const updated = meta.lastUpdated
    ? new Date(meta.lastUpdated).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
    : "never";
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="brand-bg grid h-8 w-8 place-items-center rounded-xl text-white shadow-sm" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold tracking-tight">Insta Pulse</span>
                <span className="block text-[11px] text-muted">Bigg Boss Telugu 10</span>
              </span>
            </Link>
            <nav className="order-last w-full sm:order-none sm:w-auto">
              <Nav />
            </nav>
            <span className="ml-auto flex items-center gap-2 text-xs text-muted">
              <span className="live-dot h-2 w-2 rounded-full bg-[var(--up)]" aria-hidden />
              Updated {meta.lastUpdated ? <RelativeTime iso={meta.lastUpdated} absolute={updated} /> : "never"}
            </span>
          </div>
        </header>
        {meta.source === "demo" && (
          <div className="border-b border-line bg-surface-2 px-4 py-2 text-center text-xs text-ink-2 sm:text-sm">
            <strong className="text-ink">Preview with simulated numbers.</strong> Live Instagram data appears after the first <code className="rounded bg-surface-3 px-1">npm run collect</code>.
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted">
            <span>Fan-made analytics · not affiliated with Star Maa, JioHotstar or Instagram.</span>
            <span>Reach &amp; impressions are private to each account; engagement rate is the public proxy.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
