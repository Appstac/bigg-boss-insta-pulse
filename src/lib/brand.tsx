/** Shared artwork for the generated app icon and social preview images (rendered with next/og). */
export const BRAND_GRADIENT = "linear-gradient(120deg, #6d28d9, #db2777 60%, #f59e0b)";

/** The header logo: an eye on the brand gradient. */
export function LogoMark({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: BRAND_GRADIENT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}
