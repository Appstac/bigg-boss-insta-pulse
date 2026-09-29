export function compact(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function full(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export function signed(n: number | null | undefined, fmt: (n: number) => string = compact): string {
  if (n == null) return "—";
  if (n === 0) return "0";
  return (n > 0 ? "+" : "−") + fmt(Math.abs(n));
}

export function percent(n: number | null | undefined, digits = 1, withSign = false): string {
  if (n == null || !isFinite(n)) return "—";
  const s = Math.abs(n).toFixed(digits) + "%";
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
