/**
 * Categorical series slots (validated order - see globals.css --series-N).
 * Colors are handed out to *selected entities* in selection order and stay with
 * that entity while it remains selected, so removing one never repaints others.
 */
export const MAX_SERIES = 6;

export function seriesVar(slot: number): string {
  return `var(--series-${slot + 1})`;
}

/** Keep existing assignments; give new ids the lowest free slot. */
export function assignSlots(ids: string[], prev: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  const used = new Set<number>();
  for (const id of ids) {
    if (prev[id] != null && !used.has(prev[id])) {
      next[id] = prev[id];
      used.add(prev[id]);
    }
  }
  for (const id of ids) {
    if (next[id] != null) continue;
    let slot = 0;
    while (used.has(slot)) slot++;
    next[id] = slot;
    used.add(slot);
  }
  return next;
}
