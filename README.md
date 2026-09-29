# BB Telugu 10 · Insta Pulse

Instagram analytics for every Bigg Boss Telugu Season 10 contestant: live follower counts (every ~15 minutes), daily trends, posting activity, engagement, leaderboards, and side-by-side comparison of any 2–6 contestants.

## Pages

| Route | What it shows |
|---|---|
| `/` | House KPIs, **Live · last 24 hours**, top movers, contestant cards, follower trends, daily-gain heatmap, weekly gains, growth vs engagement, posting activity, full table |
| `/contestants`, `/contestants/[id]` | Every contestant; profile with 48-hour chart, rank history, weekly gains, projections, vs-house averages, top posts |
| `/compare?ids=a,b,c` | Head-to-head table (★ = leader), trends, rank history, weekly gains, radar |
| `/leaderboards` | 12 top-5 boards |
| `/admin` | **Hidden, password protected.** Add contestants by Instagram URL, fix handles, mark evictions, start a collection |

## How data flows

```
GitHub Actions (every 15 min)            data branch                 Vercel site
  scripts/sync-roster.ts (every 6 h)  ─┐    contestants.json            reads the data branch,
  scripts/collect.ts                  ─┴─►  snapshots.json  (daily)  ─► refreshes every 10 min,
                                            intraday.json   (48 h)      no redeploys
  /admin (server actions) ─────────────────► contestants.json
```

- **`master`** holds the code. **`data`** holds only the latest data files as one force-pushed commit; history lives inside `snapshots.json`. `vercel.json` stops Vercel from deploying the `data` branch.
- `data/` on `master` is a build-time fallback and the local-development copy.
- Instagram numbers come from the official Graph API **Business Discovery** endpoint (Business/Creator accounts only). Reach and impressions are private to each account, so the site uses **engagement rate**: the median of (likes + comments) ÷ followers per post. It's a median because collab reels with the show's accounts can reach far beyond a contestant's own followers.

## Roster changes (evictions, wildcards)

- **Automatic:** every 6 hours `scripts/sync-roster.ts` reads the contestants tab on biggbosspulse.com (`season.json` → `sourceUrl`). It marks evictions (dated from the exit week), adds new wildcards, and takes their Instagram link when the page lists one. It never deletes anyone. If the page layout changes it makes no changes and the workflow shows a warning.
- **Manual:** open `/admin`, paste the Instagram profile URL and click **Add contestant**. The account is verified, saved to the `data` branch, and a collection starts, so the new contestant is on every page within about a minute. Contestants the sync added without a handle are listed first, marked "Needs Instagram handle".
- A status changed on `/admin` is marked `manual` and the automatic check leaves it alone.

## Setup

### GitHub repository
Must be **public** for free 15-minute Actions runs (private repos get 2,000 min/month; this needs about 2,900). Nothing secret is in the repo.

Repository **secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `IG_USER_ID` | Your Instagram professional account id (`1784…`) |
| `IG_ACCESS_TOKEN` | Long-lived token (60 days) |

### Vercel environment variables

| Variable | Needed for |
|---|---|
| `ADMIN_PASSWORD` | Turns on `/admin` (off when unset) |
| `GITHUB_TOKEN` | `/admin` saving + "Collect now". Fine-grained token for this repo only: **Contents: read/write**, **Actions: read/write** |
| `IG_USER_ID`, `IG_ACCESS_TOKEN` | `/admin` verifying new handles |

The repo is detected from Vercel's Git connection (override with `GITHUB_REPO=owner/name`).

**Vercel Hobby only deploys commits authored by the account owner.** Commit with the owner's GitHub identity (`git config user.name/user.email` in this repo).

### Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run collect      # one collection into ./data (needs .env.local)
node scripts/sync-roster.ts --dry-run
```

`/setup` (local only) connects Instagram through Facebook Login and writes `IG_USER_ID` / `IG_ACCESS_TOKEN` to `.env.local`. Renew the token before it expires (60 days) by running it again, then update the GitHub secrets and Vercel variables.
