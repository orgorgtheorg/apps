# Install: Competitor brief

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Who are we watching?

Ask **one** question and wait: which competitors (names + URLs), up to six. If the user names more than six, take the first six and say why — a brief covering ten competitors stops being read.

## 2. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 3. Backend

```bash
cp /workspace/apps/competitor-brief/app/convex/watchtowerTables.ts /workspace/app/convex/
cp /workspace/apps/competitor-brief/app/convex/watchtower.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { watchtowerTables } from "./watchtowerTables";
// inside defineSchema({ ... }):
...watchtowerTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/competitor-brief/app/src/Watchtower.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<Watchtower />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id watchtower --kind app --title "Watchtower" --port 5173 --route / --live
```

## 5. Seed the competitors and capture baselines

For each competitor from step 1:

```bash
cd /workspace/app && npx convex run watchtower:addCompetitor '{"name":"…","siteUrl":"https://…","pricingUrl":"https://…","careersUrl":"https://…"}'
```

Then, for each: open the site in the browser, screenshot the homepage to `/workspace/watchtower/<slug>/<date>.png`, save the page text to `/workspace/watchtower/<slug>/<date>.txt`, extract any visible price points, and call `watchtower:recordCheck` with the screenshot path and price points (**no** `changeSummary` — this is the baseline, not a change).

```bash
mkdir -p /workspace/watchtower
```

## 6. Monday brief (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `competitor-monday-brief` already exists):

```json
{
  "id": "competitor-monday-brief",
  "freq": "weekly",
  "days": ["Mon"],
  "time": "08:00",
  "enabled": true,
  "prompt": "Competitor Monday brief. Read /workspace/apps/competitor-brief/SKILL.md. For each row from `cd /workspace/app && npx convex run watchtower:competitors`: fetch the site, pricing page, careers page and business profile; screenshot into /workspace/watchtower/<slug>/<date>.png; diff text and prices against the previous capture; call watchtower:recordCheck (with changeSummary ONLY when something actually changed). Then write one doc artifact 'Competitor brief — <week of>': per competitor what changed, what it means, and what to consider, with before/after screenshot pairs for visual changes and hiring inferences clearly labeled as inference. Save it with watchtower:saveBrief and post two lines in chat with the doc link. If nothing changed anywhere, the brief and the chat line are one honest sentence each — never pad."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `competitor-brief` is already present):

```json
{
  "appId": "competitor-brief",
  "version": 1,
  "description": "Watchtower grid of competitors with weekly site/pricing/careers diffs and a Monday brief.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/competitor-brief/",
    "/workspace/app/convex/watchtower.ts",
    "/workspace/app/convex/watchtowerTables.ts",
    "/workspace/app/src/Watchtower.tsx",
    "/workspace/app/convex/schema.ts (+watchtowerTables spread)",
    "/workspace/watchtower/"
  ],
  "crons": ["competitor-monday-brief"],
  "artifacts": ["watchtower"]
}
```

## 8. Handover

Post a short chat message (~3 sentences) naming who you're watching:

> Watchtower is live — new tab, with <n> competitors baselined this morning. Every Monday at 8 I'll re-check their site, pricing, and careers pages and write a one-page brief: what changed, what it means, what to consider — with before/after screenshots when a page actually looks different. Paste a URL here any time and say "watch this one too".

Then check off the install task's todos and mark it Done.
