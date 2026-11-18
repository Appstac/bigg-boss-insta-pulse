// One build script for both hosts: Cloudflare Workers Builds (WORKERS_CI=1) needs the OpenNext
// bundle; everywhere else (Vercel, local) it's a plain `next build`.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

// Workers Builds restores .next/cache from the previous build, and its saved fetch responses come
// back corrupted ("Failed to parse JSON file" warnings). Data is re-read at build time anyway.
if (process.env.WORKERS_CI) rmSync(".next/cache/fetch-cache", { recursive: true, force: true });

const cmd = process.env.WORKERS_CI ? "npx opennextjs-cloudflare build" : "npx next build";
console.log(`> ${cmd}`);
const { status } = spawnSync(cmd, { stdio: "inherit", shell: true });
process.exit(status ?? 1);
