import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/brand";

// Home-screen icon for iPhone/iPad. Generated once at build time (no request data).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS rounds the corners itself, so the tile is square.
  return new ImageResponse(<LogoMark size={180} radius={0} />, size);
}
