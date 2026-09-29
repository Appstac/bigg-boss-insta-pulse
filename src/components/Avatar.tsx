/* eslint-disable @next/next/no-img-element */

const GRADIENTS = [
  ["#6d28d9", "#db2777"],
  ["#1d4ed8", "#06b6d4"],
  ["#b45309", "#f59e0b"],
  ["#047857", "#10b981"],
  ["#be123c", "#fb7185"],
  ["#4338ca", "#a78bfa"],
  ["#0f766e", "#2dd4bf"],
  ["#9d174d", "#f472b6"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

/** Contestant photo, or a stylised initials tile when no photo exists yet. */
export function Avatar({
  name,
  photo,
  size = 40,
  evicted = false,
  ring,
  rounded = "full",
  className = "",
}: {
  name: string;
  photo: string | null;
  size?: number;
  evicted?: boolean;
  /** CSS color for an identity ring (e.g. the series color in charts). */
  ring?: string;
  rounded?: "full" | "xl";
  className?: string;
}) {
  const [a, b] = GRADIENTS[hash(name) % GRADIENTS.length];
  const radius = rounded === "full" ? "rounded-full" : "rounded-2xl";
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden ${radius} ${evicted ? "grayscale opacity-70" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px var(--surface), 0 0 0 4px ${ring}` : undefined,
        background: photo ? "var(--surface-2)" : `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {photo ? (
        <img src={photo} alt={name} width={size} height={size} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-semibold tracking-wide text-white" style={{ fontSize: Math.max(10, size * 0.36) }} aria-label={name}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
