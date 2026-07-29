# Install: Contract & renewal tracker

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

This app is correctness-critical: a wrong date here costs the user real money. Install it so that ambiguity always parks for a human.

## 1. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 2. Backend

```bash
cp /workspace/apps/renewal-tracker/app/convex/contractsTables.ts /workspace/app/convex/
cp /workspace/apps/renewal-tracker/app/convex/contracts.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { contractsTables } from "./contractsTables";
// inside defineSchema({ ... }):
...contractsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. UI

```bash
cp /workspace/apps/renewal-tracker/app/src/Registry.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<Registry />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id contracts --kind app --title "Contracts" --port 5173 --route / --live
```

## 4. Contracts folder

```bash
mkdir -p /workspace/contracts
```

Ask the user to drop whatever contracts they have — lease, insurance, key vendors, software. For each one they drop **during install**, extract per `assets/extraction-rules.md` and call `contracts:upsert`. Anything ambiguous goes in with an `ambiguityNote` (status becomes `needsReview`) — never guess a date to make a row look complete.

## 5. Calendar deadlines

For each active contract, create a calendar event on its **notice-by** date titled `Notice deadline — <party> (<type>)` with the clause quote in the description, and store the event id with `contracts:setCalendarEvent`. If no calendar is reachable, say so once and rely on the cron.

## 6. Deadline check (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `renewal-deadline-check` already exists):

```json
{
  "id": "renewal-deadline-check",
  "freq": "daily",
  "time": "08:00",
  "enabled": true,
  "prompt": "Renewal deadline check. Run `cd /workspace/app && npx convex run contracts:dueWarnings`. For each contract at 60, 30, or 7 days (or fewer) before its notice-by date, post one chat message per batch: party, type, the notice-by date, the annual cost, and the clause QUOTED with its citation. Ask the plain question — renew, renegotiate, or give notice? If the user says don't renew, draft the termination-notice letter into a doc artifact but do not send it. If nothing is due, end quietly with no message."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `renewal-tracker` is already present):

```json
{
  "appId": "renewal-tracker",
  "version": 1,
  "description": "Contract registry with extracted renewal terms, cited clauses, promoted notice-by dates, calendar deadlines, and 60/30/7-day warnings.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/renewal-tracker/",
    "/workspace/app/convex/contracts.ts",
    "/workspace/app/convex/contractsTables.ts",
    "/workspace/app/src/Registry.tsx",
    "/workspace/app/convex/schema.ts (+contractsTables spread)",
    "/workspace/contracts/"
  ],
  "crons": ["renewal-deadline-check"],
  "artifacts": ["contracts"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Contracts is live — new tab. Drop any contract PDF here and I'll pull out the renewal date, the notice period, and the exact clause they came from (with the page), then promote the date that actually costs money: the last day you can give notice. I'll warn you at 60, 30, and 7 days with the clause quoted — and if a clause is ambiguous I'll ask you rather than guess, because guessing here is expensive.

Then check off the install task's todos and mark it Done.
