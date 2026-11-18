import { ImageResponse } from "next/og";
import { BRAND_GRADIENT, LogoMark } from "@/lib/brand";

// Link preview banner (WhatsApp, X, Facebook, Telegram, Slack…). Generated once at build time.
export const alt = "BB Telugu 10 · Insta Pulse: live Instagram analytics for every Bigg Boss Telugu 10 contestant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHIPS = ["Live followers", "Daily growth", "Engagement", "Leaderboards"];

/** The site's font (Geist) in bold; the built-in fallback font only has a regular weight. */
async function geistBold(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Bold.ttf");
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null; // offline build: fall back to the default font
  }
}

export default async function OpenGraphImage() {
  const bold = await geistBold();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 88% 12%, rgba(219,39,119,0.35), transparent 45%), radial-gradient(circle at 8% 100%, rgba(109,40,217,0.45), transparent 50%)",
          color: "#fff",
          fontFamily: bold ? "Geist" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <LogoMark size={84} radius={22} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>Insta Pulse</div>
            <div style={{ fontSize: 24, color: "#a1a1aa" }}>Bigg Boss Telugu Season 10</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Bigg Boss Telugu 10</div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              backgroundImage: BRAND_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Instagram Pulse
          </div>
          <div style={{ fontSize: 30, color: "#d4d4d8", marginTop: 6 }}>
            Live follower counts, growth and engagement for every contestant, updated every 30 minutes.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {CHIPS.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  fontSize: 22,
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#e4e4e7",
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#f9a8d4" }}>bb.appstac.com</div>
        </div>
      </div>
    ),
    { ...size, fonts: bold ? [{ name: "Geist", data: bold, weight: 700, style: "normal" }] : undefined },
  );
}
