import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bbp_admin";

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Session value derived from the password, so changing ADMIN_PASSWORD signs everyone out. */
function sessionValue(): string {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "").update("insta-pulse-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(input: string): boolean {
  return adminEnabled() && safeEqual(input, process.env.ADMIN_PASSWORD!);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(v && safeEqual(v, sessionValue()));
}

export async function startSession() {
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
}
