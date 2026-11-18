// One build script for both hosts: Cloudflare Workers Builds (WORKERS_CI=1) needs the OpenNext
// bundle; everywhere else (Vercel, local) it's a plain `next build`.
import { spawnSync } from "node:child_process";

const cmd = process.env.WORKERS_CI ? "npx opennextjs-cloudflare build" : "npx next build";
console.log(`> ${cmd}`);
const { status } = spawnSync(cmd, { stdio: "inherit", shell: true });
process.exit(status ?? 1);
