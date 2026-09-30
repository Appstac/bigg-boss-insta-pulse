/** International short form: 950, 12.4K, 931K, 1.85M (two decimals for millions, none from 100K). */
export function compact(n: number | null | undefined): string {
  if (n == null) return "—";
  const a = Math.abs(n);
  const digits = a >= 1_000_000 ? 2 : a >= 100_000 ? 0 : 1;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits }).format(n);
}

export function full(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function signed(n: number | null | undefined, fmt: (n: number) => string = compact): string {
  if (n == null) return "—";
  if (n === 0) return "0";
  return (n > 0 ? "+" : "−") + fmt(Math.abs(n));
}

export function percent(n: number | null | undefined, digits = 1, withSign = false): string {
  if (n == null || !isFinite(n)) return "—";
  // Add decimals for small non-zero values so they never read as "0.0%" (e.g. 0.03% not 0.0%).
  let d = digits;
  while (n !== 0 && d < 3 && Number(Math.abs(n).toFixed(d)) === 0) d++;
  const s = Math.abs(n).toFixed(d) + "%";
  if (!withSign) return (n < 0 ? "−" : "") + s;
  return n === 0 ? s : (n > 0 ? "+" : "−") + s;
}

export function decimal(n: number | null | undefined, digits = 1): string {
  return n == null ? "—" : n.toFixed(digits);
}

export function shortDate(d: string): string {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "14:30" in IST from an ISO timestamp. */
export function istTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
}

/** "29 Sept, 14:30 IST" from an ISO timestamp. */
export function istDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}, ${istTime(iso)} IST`;
}

/**
 * Axis tick formatter for a value range: adds decimals when ticks would otherwise collapse to the
 * same label (e.g. "62L 62L 62.1L" on a tight follower range).
 */
export function axisFormatter(min: number, max: number): (n: number) => string {
  for (const digits of [1, 2, 3]) {
    const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits });
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => fmt.format(min + (max - min) * f));
    if (new Set(ticks).size === ticks.length) return (n) => fmt.format(n);
  }
  return (n) => full(n);
}
