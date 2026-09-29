import type { Metadata } from "next";
import { computeAnalytics, toClient } from "@/lib/analytics";
import { MAX_SERIES } from "@/lib/colors";
import { loadDataset } from "@/lib/data";
import { CompareView } from "@/components/CompareView";

export const metadata: Metadata = { title: "Compare contestants · BB Telugu 10" };

export default async function ComparePage(props: PageProps<"/compare">) {
  const sp = await props.searchParams;
  const ds = await loadDataset();
  const a = computeAnalytics(ds);
  const stats = a.stats.map(toClient);
  const valid = new Set(stats.map((s) => s.contestant.id));
  const raw = typeof sp.ids === "string" ? sp.ids.split(",") : [];
  const ids = [...new Set(raw)].filter((id) => valid.has(id)).slice(0, MAX_SERIES);
  const initial = ids.length ? ids : [...stats].sort((a, b) => b.followers - a.followers).slice(0, 2).map((s) => s.contestant.id);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Head to head</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Compare contestants</h1>
        <p className="text-sm text-muted">Side-by-side Instagram numbers. The link updates as you pick, so you can share it.</p>
      </div>
      <CompareView stats={stats} initial={initial} premiereDate={ds.season.premiereDate} weekLabels={a.weekLabels} growthLabel={a.growthSince} />
    </div>
  );
}
