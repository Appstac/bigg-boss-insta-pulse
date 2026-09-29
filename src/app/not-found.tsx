import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">404</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This contestant or page doesn&apos;t exist, or the link has changed.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-page">Dashboard</Link>
        <Link href="/contestants" className="rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold hover:bg-surface-2">All contestants</Link>
      </div>
    </div>
  );
}
