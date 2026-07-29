# Install: RFP finder & drafter

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. The capabilities profile (the app is worthless without it)

```bash
mkdir -p /workspace/bids/past
[ -f /workspace/bids/capabilities.md ] || cp /workspace/apps/rfp-finder/assets/capabilities.md /workspace/bids/capabilities.md
```

Ask, in **one** message: what work they do and where, their NAICS codes if they know them, certifications they actually hold (small business, 8(a), WOSB, HUBZone, state DBE), bonding capacity, and the biggest contract they've delivered. Fill in `capabilities.md`. **Only certifications the user names go in the file, and only certifications in the file may ever appear in a response.**

Also ask which portals to sweep besides SAM.gov (state/city procurement sites) and add them to the file.

## 2. Past bids

Ask them to drop 1–3 past proposals or bid responses into `/workspace/bids/past/`. These become the reuse library — the "we bid on something like this in March" moment depends on them existing.

## 3. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 4. Backend

```bash
cp /workspace/apps/rfp-finder/app/convex/solicitationsTables.ts /workspace/app/convex/
cp /workspace/apps/rfp-finder/app/convex/solicitations.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { solicitationsTables } from "./solicitationsTables";
// inside defineSchema({ ... }):
...solicitationsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 5. UI

```bash
cp /workspace/apps/rfp-finder/app/src/Solicitations.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<Solicitations />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id solicitations --kind app --title "Bids" --port 5173 --route / --live
```

## 6. Daily sweep (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `rfp-daily-sweep` already exists):

```json
{
  "id": "rfp-daily-sweep",
  "freq": "weekdays",
  "time": "07:30",
  "enabled": true,
  "prompt": "RFP daily sweep. Read /workspace/apps/rfp-finder/SKILL.md and /workspace/bids/capabilities.md. Search SAM.gov and each configured portal for solicitations posted since the last sweep matching the profile's NAICS codes, keywords, and geography. For each match: summarize it, score fit 1-10 with explicit reasons quoted against the profile, write a go/no-go recommendation, check /workspace/bids/past for a reusable prior response, and upsert it (`cd /workspace/app && npx convex run solicitations:upsert`) — externalId dedupes, so re-finding one must not duplicate it. Then run solicitations:dueSoon and include anything with a near deadline. Post one chat message: new matches worth a look (never more than five), and the deadlines closing. If there are no new matches, end quietly."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `rfp-finder` is already present):

```json
{
  "appId": "rfp-finder",
  "version": 1,
  "description": "Daily solicitation sweep into a deadline-sorted board with self-explaining fit scores, go/no-go calls, and boilerplate drafted from past bids.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/rfp-finder/",
    "/workspace/app/convex/solicitations.ts",
    "/workspace/app/convex/solicitationsTables.ts",
    "/workspace/app/src/Solicitations.tsx",
    "/workspace/app/convex/schema.ts (+solicitationsTables spread)",
    "/workspace/bids/capabilities.md",
    "/workspace/bids/past/"
  ],
  "crons": ["rfp-daily-sweep"],
  "artifacts": ["solicitations"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Bids is live — new tab, sorted by deadline. Each weekday morning I'll sweep SAM.gov and your state portals against your capabilities profile and file the matches with a fit score that shows its reasoning and a go/no-go call. Hit "Go" on one and I'll draft the boilerplate sections from your past bids — reusing what genuinely fits and clearly stubbing the parts that need your judgment. I'll never claim a certification that isn't in your profile.

Then check off the install task's todos and mark it Done.
