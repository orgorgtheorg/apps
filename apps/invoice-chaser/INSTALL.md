# Install: Invoice chaser

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Where do invoices come from?

Ask **one** question and wait: does the user want you to read invoices from their accounting page in the shared browser (QuickBooks, Wave, Xero), or will they drop a spreadsheet / list? Record the answer — step 6's cron prompt must name the concrete source.

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
cp /workspace/apps/invoice-chaser/app/convex/receivablesTables.ts /workspace/app/convex/
cp /workspace/apps/invoice-chaser/app/convex/receivables.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { receivablesTables } from "./receivablesTables";
// inside defineSchema({ ... }):
...receivablesTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/invoice-chaser/app/src/Receivables.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<Receivables />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id receivables --kind app --title "Receivables" --port 5173 --route / --live
```

## 5. The politeness gradient

```bash
mkdir -p /workspace/invoices
[ -f /workspace/invoices/chase-ladder.md ] || cp /workspace/apps/invoice-chaser/assets/chase-ladder.md /workspace/invoices/chase-ladder.md
```

Show the user the four rungs (gentle → direct → firm → phone-call flag) and the timing, and say they can edit that file. Ask whether auto-send should be on for anyone — default **off** for everybody.

## 6. Import what's open, then the weekly chase (cron)

Import the current open invoices now via `receivables:upsert` (one call per invoice) so the aging table isn't empty on first look. Then merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `invoice-chase-pass` already exists). Replace `<SOURCE>` with the source from step 1:

```json
{
  "id": "invoice-chase-pass",
  "freq": "weekly",
  "days": ["Tue"],
  "time": "09:00",
  "enabled": true,
  "prompt": "Invoice chase pass. Read /workspace/apps/invoice-chaser/SKILL.md and /workspace/invoices/chase-ladder.md. Refresh open invoices from <SOURCE> via `cd /workspace/app && npx convex run receivables:upsert`, marking anything now settled as paid. Then run receivables:dueForChase: for each, draft the reminder at the suggested tone with receivables:setDraft; send immediately ONLY where autoSend is true, recording it with receivables:recordChase. Never chase a disputed invoice or one with an unexpired promise-to-pay. Post one chat digest led by what was collected this month, then the drafts waiting for approval and anything now 60+ days out that needs a phone call. If nothing is due, say the aging is clean in one line."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `invoice-chaser` is already present):

```json
{
  "appId": "invoice-chaser",
  "version": 1,
  "description": "Receivables aging table with an escalating, editable chase ladder; promises-to-pay honored, disputes frozen.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/invoice-chaser/",
    "/workspace/app/convex/receivables.ts",
    "/workspace/app/convex/receivablesTables.ts",
    "/workspace/app/src/Receivables.tsx",
    "/workspace/app/convex/schema.ts (+receivablesTables spread)",
    "/workspace/invoices/chase-ladder.md"
  ],
  "crons": ["invoice-chase-pass"],
  "artifacts": ["receivables"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Receivables is live — new tab, with your open invoices aged into buckets. Each Tuesday I'll draft the next reminder for anything overdue, escalating gently → direct → firm → "this one needs a phone call", and you approve each send (auto-send is off unless you turn it on per client). If someone replies promising a date I'll hold off until then, and a disputed invoice freezes completely — I'll never chase one.

Then check off the install task's todos and mark it Done.
