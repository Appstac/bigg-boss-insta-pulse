import type { Metadata } from "next";
import { computeAnalytics, toClient } from "@/lib/analytics";
import { loadDataset } from "@/lib/data";
import { ContestantGrid } from "@/components/ContestantGrid";

export const metadata: Metadata = { title: "Contestants · BB Telugu 10 · Insta Pulse" };

export default async function ContestantsPage() {
  const ds = await loadDataset();
  const a = computeAnalytics(ds);
  const stats = a.stats.map(toClient);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Season 10</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Contestants</h1>
        <p className="mt-1 text-sm text-muted">All {stats.length} housemates with live Instagram numbers. Press + on two or more cards to compare them.</p>
      </div>
      <ContestantGrid stats={stats} growthLabel={a.growthSince} />
    </div>
  );
}
