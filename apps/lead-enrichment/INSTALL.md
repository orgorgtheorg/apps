# Install: Lead list enrichment

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

Note whether `/workspace/app` was **fresh** or **already existed** — step 3 differs.

## 2. Backend

```bash
cp /workspace/apps/lead-enrichment/app/convex/prospectsTables.ts /workspace/app/convex/
cp /workspace/apps/lead-enrichment/app/convex/prospects.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { prospectsTables } from "./prospectsTables";
// inside defineSchema({ ... }):
...prospectsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. UI

```bash
cp /workspace/apps/lead-enrichment/app/src/ProspectsTable.tsx /workspace/app/src/
```

- **Fresh app** → `App.tsx` renders `<ProspectsTable />`.
- **Existing app** → add it as a tab/section without disturbing what's there.

Check `/tmp/app-dev.log` for compile errors.

## 4. Register the artifact

```bash
orgorg-artifact add --id prospects --kind app --title "Prospects" --port 5173 --route / --live
```

## 5. Fit profile

The fit score is meaningless without a definition of "good fit". Create it now:

```bash
mkdir -p /workspace/sales
[ -f /workspace/sales/fit-profile.md ] || cp /workspace/apps/lead-enrichment/assets/fit-profile.md /workspace/sales/fit-profile.md
```

Ask the user, in **one** message: who is a great customer for them (industry, size, role they sell to) and what disqualifies someone. Write the answers into `fit-profile.md`. If they'd rather do it later, say the scores will be blank until then — do not invent a profile.

## 6. No cron

Enrichment runs when the user drops a list, not on a schedule. Verify you added no cron entry.

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `lead-enrichment` is already present):

```json
{
  "appId": "lead-enrichment",
  "version": 1,
  "description": "Prospects grid that fills in company, title, LinkedIn, recent news, and a sourced fit score as browser research completes.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/lead-enrichment/",
    "/workspace/app/convex/prospects.ts",
    "/workspace/app/convex/prospectsTables.ts",
    "/workspace/app/src/ProspectsTable.tsx",
    "/workspace/app/convex/schema.ts (+prospectsTables spread)",
    "/workspace/sales/fit-profile.md"
  ],
  "crons": [],
  "artifacts": ["prospects"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Prospects is live — new tab. Drop a CSV (or paste a list) and I'll confirm the column mapping, then research in batches of ten: company, title, LinkedIn, one recent thing worth mentioning, and a fit score with a one-line reason — every researched cell links to the page it came from. Anything I can't verify says "couldn't verify" instead of guessing, and I cap research at about 90 seconds a row so a 200-row list finishes today.

Then check off the install task's todos and mark it Done.
