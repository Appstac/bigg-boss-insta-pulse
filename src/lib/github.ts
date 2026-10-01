import "server-only";

/**
 * Minimal GitHub helper for the `data` branch. The repo is taken from GITHUB_REPO ("owner/name")
 * or, on Vercel, from the connected Git repository. GITHUB_TOKEN is a fine-grained token for this
 * repo with Contents: read/write and Actions: read/write.
 */
export const DATA_BRANCH = "data";

export function repo(): string | null {
  if (process.env.GITHUB_REPO) return process.env.GITHUB_REPO;
  const { VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: slug } = process.env;
  return owner && slug ? `${owner}/${slug}` : null;
}

export function hasWriteAccess(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && repo());
}

function headers(extra: Record<string, string> = {}) {
  return {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "x-github-api-version": "2022-11-28",
    ...extra,
  };
}

/** Latest commit sha of the data branch (one small API call). */
export async function latestDataSha(init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${repo()}/commits/${DATA_BRANCH}`, {
    ...init,
    headers: headers({ accept: "application/vnd.github.sha" }),
  });
  if (!res.ok) throw new Error(`GitHub data sha: HTTP ${res.status}`);
  return (await res.text()).trim();
}

/** Raw file contents from the data branch (or a specific commit via `ref`), or null if missing. */
export async function readDataFile(
  path: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {},
  ref: string = DATA_BRANCH,
) {
  const res = await fetch(`https://api.github.com/repos/${repo()}/contents/${path}?ref=${ref}`, {
    ...init,
    headers: headers({ accept: "application/vnd.github.raw" }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${path}: HTTP ${res.status}`);
  return res.text();
}

/** Create or replace a file on the data branch as one commit. */
export async function writeDataFile(path: string, content: string, message: string) {
  const base = `https://api.github.com/repos/${repo()}/contents/${path}`;
  const meta = await fetch(`${base}?ref=${DATA_BRANCH}`, { headers: headers(), cache: "no-store" });
  const sha = meta.ok ? ((await meta.json()) as { sha: string }).sha : undefined;
  const res = await fetch(base, {
    method: "PUT",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({ message, content: Buffer.from(content).toString("base64"), branch: DATA_BRANCH, sha }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub write ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** Start the collection workflow right away instead of waiting for the next 30-minute run. */
export async function runCollectorNow(): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${repo()}/actions/workflows/collect.yml/dispatches`, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({ ref: "master" }),
    cache: "no-store",
  });
  return res.status === 204;
}
