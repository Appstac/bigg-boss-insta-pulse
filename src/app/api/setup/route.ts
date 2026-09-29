/**
 * Local-only helper for the /setup page: verifies an Instagram connection and
 * saves IG_USER_ID / IG_ACCESS_TOKEN to .env.local. Disabled outside `next dev`
 * and for any request that doesn't come from localhost.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const VERSION = process.env.GRAPH_API_VERSION ?? "v26.0";

function isLocal(request: Request) {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  return process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

function upsertEnv(values: Record<string, string>) {
  const file = path.join(process.cwd(), ".env.local");
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/) : [];
  for (const [key, value] of Object.entries(values)) {
    const i = lines.findIndex((l) => l.startsWith(key + "="));
    if (i >= 0) lines[i] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(file, lines.filter((l, i, a) => l || i < a.length - 1).join("\n") + "\n");
}

export async function POST(request: Request) {
  if (!isLocal(request)) return new Response("Not found", { status: 404 });
  const { igUserId, token: rawToken, testUsername, appId } = (await request.json()) as {
    igUserId?: string;
    token?: string;
    testUsername?: string;
    appId?: string;
  };
  let token = rawToken;
  if (!igUserId || !/^\d+$/.test(igUserId) || !token) {
    return Response.json({ ok: false, error: "Missing Instagram account id or token." }, { status: 400 });
  }

  // Prove Business Discovery works before saving anything.
  const username = (testUsername ?? "").replace(/[^\w.]/g, "") || "instagram";
  const url = new URL(`https://graph.facebook.com/${VERSION}/${igUserId}`);
  url.searchParams.set("fields", `business_discovery.username(${username}){username,followers_count,media_count}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const body = (await res.json()) as {
    business_discovery?: { username: string; followers_count: number; media_count: number };
    error?: { message: string };
  };
  if (!body.business_discovery) {
    return Response.json({ ok: false, error: body.error?.message ?? "Business Discovery test failed." }, { status: 400 });
  }

  // Swap a short-lived token for a 60-day one when the app secret is available locally.
  const secret = process.env.FB_APP_SECRET;
  if (secret && appId) {
    const ex = new URL(`https://graph.facebook.com/${VERSION}/oauth/access_token`);
    ex.searchParams.set("grant_type", "fb_exchange_token");
    ex.searchParams.set("client_id", appId);
    ex.searchParams.set("client_secret", secret);
    ex.searchParams.set("fb_exchange_token", token);
    const j = (await (await fetch(ex)).json()) as { access_token?: string };
    if (j.access_token) token = j.access_token;
  }

  const dbg = new URL(`https://graph.facebook.com/${VERSION}/debug_token`);
  dbg.searchParams.set("input_token", token);
  dbg.searchParams.set("access_token", token);
  const info = (await (await fetch(dbg)).json()) as { data?: { expires_at?: number; data_access_expires_at?: number } };
  const expiresAt = info.data?.expires_at ? new Date(info.data.expires_at * 1000).toISOString() : null;

  upsertEnv({ IG_USER_ID: igUserId, IG_ACCESS_TOKEN: token, GRAPH_API_VERSION: VERSION });
  return Response.json({ ok: true, test: body.business_discovery, expiresAt, shortLived: !!info.data?.expires_at && info.data.expires_at * 1000 - Date.now() < 7 * 86_400_000 });
}
