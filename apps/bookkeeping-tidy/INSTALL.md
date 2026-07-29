# Install: Pre-close bookkeeping tidy

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Confirm the transaction source

This app is connector-gated: it needs transactions. Verify you can read them (a bank connection, an accounting page in the shared browser, or an exported CSV the user drops). Name the source concretely — step 6's cron prompt needs it. If there is none, install everything else, park a NeedsHuman task (reason `Question`), and say plainly in the handover that the weekly pass is idle until a source exists.

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
cp /workspace/apps/bookkeeping-tidy/app/convex/closeTables.ts /workspace/app/convex/
cp /workspace/apps/bookkeeping-tidy/app/convex/close.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { closeTables } from "./closeTables";
// inside defineSchema({ ... }):
...closeTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/bookkeeping-tidy/app/src/CloseChecklist.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<CloseChecklist />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id close-checklist --kind app --title "Close" --port 5173 --route / --live
```

## 5. Chart of accounts

```bash
mkdir -p /workspace/books/receipts
[ -f /workspace/books/categories.md ] || cp /workspace/apps/bookkeeping-tidy/assets/categories.md /workspace/books/categories.md
```

Ask the user for their accountant's category list if they have one (or a recent P&L, which is the same thing). Replace the defaults in `categories.md` with it. Categorizing into categories their accountant doesn't use creates work rather than saving it.

## 6. Weekly tidy (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `bookkeeping-weekly-tidy` already exists). Replace `<SOURCE>`:

```json
{
  "id": "bookkeeping-weekly-tidy",
  "freq": "weekly",
  "days": ["Fri"],
  "time": "16:00",
  "enabled": true,
  "prompt": "Weekly bookkeeping tidy. Read /workspace/apps/bookkeeping-tidy/SKILL.md, /workspace/books/categories.md, and `cd /workspace/app && npx convex run close:activeRules`. Pull this week's new transactions from <SOURCE>. Apply the learned rules first, then categorize the rest against categories.md — never invent a category. Match receipts: inbox attachments and files in /workspace/books/receipts against amounts and dates. Update the month row with close:upsertMonth and write close:setFlags with the specific things you could not place (merchant, date, amount, and the actual question). Post one short chat message: categorized n/N, receipts m/M, and the 3 questions — nothing else. Change nothing in the source system."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `bookkeeping-tidy` is already present):

```json
{
  "appId": "bookkeeping-tidy",
  "version": 2,
  "description": "Close checklist app: weekly categorization with sticky learned rules, receipt matching, and an accountant-ready month-end doc.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/bookkeeping-tidy/",
    "/workspace/app/convex/close.ts",
    "/workspace/app/convex/closeTables.ts",
    "/workspace/app/src/CloseChecklist.tsx",
    "/workspace/app/convex/schema.ts (+closeTables spread)",
    "/workspace/books/categories.md",
    "/workspace/books/receipts/"
  ],
  "crons": ["bookkeeping-weekly-tidy"],
  "artifacts": ["close-checklist"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Close is live — new tab, one card per month showing categorized ✓, receipts matched, and the flags for your accountant. Every Friday I'll categorize the week's transactions using your accountant's own categories, match receipts from your inbox and files, and list the few things I genuinely couldn't place with the merchant and date — not just a count. Correct me once ("that's equipment, not supplies") and the rule sticks forever; you can see and delete every rule in the app.

Then check off the install task's todos and mark it Done.
