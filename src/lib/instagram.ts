import "server-only";

const VERSION = process.env.GRAPH_API_VERSION ?? "v26.0";

/** "https://www.instagram.com/some.user/?hl=en", "@some.user" or "some.user" → "some.user". */
export function parseHandle(input: string): string | null {
  const s = input.trim();
  const fromUrl = s.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)?.[1];
  const handle = (fromUrl ?? s.replace(/^@/, "")).replace(/\.$/, "");
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(handle)) return null;
  if (["p", "reel", "reels", "stories", "explore", "tv"].includes(handle.toLowerCase())) return null;
  return handle;
}

export interface LookupResult {
  username: string;
  name: string;
  followers: number;
  posts: number;
}

/** Confirms the account exists and is visible to Business Discovery (Business/Creator). */
export async function lookupInstagram(handle: string): Promise<LookupResult> {
  const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) throw new Error("IG_USER_ID / IG_ACCESS_TOKEN are not configured on the server.");
  const url = new URL(`https://graph.facebook.com/${VERSION}/${IG_USER_ID}`);
  url.searchParams.set("fields", `business_discovery.username(${handle}){username,name,followers_count,media_count}`);
  url.searchParams.set("access_token", IG_ACCESS_TOKEN);
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as {
    business_discovery?: { username: string; name?: string; followers_count: number; media_count: number };
    error?: { message: string };
  };
  const bd = body.business_discovery;
  if (!bd) {
    const msg = body.error?.message ?? "";
    throw new Error(
      /Invalid user id|Cannot find User|does not exist/i.test(msg)
        ? `@${handle} was not found, or it is a personal account (only Business/Creator accounts can be tracked).`
        : msg || "Instagram lookup failed.",
    );
  }
  return { username: bd.username, name: bd.name ?? bd.username, followers: bd.followers_count, posts: bd.media_count };
}
