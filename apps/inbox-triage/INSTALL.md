# Install: Inbox triage

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

This is the highest-trust app in the catalog. Install it conservatively: **auto-send off everywhere**, and say so twice.

## 1. Confirm mail access

Verify you can read the user's mail (a Gmail connection, or the shared browser signed into their mailbox). If you cannot, stop and park a NeedsHuman task (reason `Question`) — a triage app with no mail is not worth half-installing.

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
cp /workspace/apps/inbox-triage/app/convex/triageTables.ts /workspace/app/convex/
cp /workspace/apps/inbox-triage/app/convex/triage.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { triageTables } from "./triageTables";
// inside defineSchema({ ... }):
...triageTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/inbox-triage/app/src/ResponseQueue.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<ResponseQueue />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id response-queue --kind app --title "Inbox" --port 5173 --route / --live
```

## 5. Learn the user's categories (don't invent them)

Read the last ~200 messages and propose 5–8 categories **from what's actually in the mailbox** — with an example sender for each. Show them in chat and ask for corrections in one message. Then write each as a rule:

```bash
cd /workspace/app && npx convex run triage:upsertRule '{"name":"Client work","matches":["@fenmore.com","@oakridge.com"],"bucket":"needsYou"}'
```

Every rule starts with `autoSend` **false**. Never set it true during install, even if the user says "yes go ahead" — tell them the switch is in the app's Rules panel, per category, once they've seen a week of drafts.

## 6. Triage pass + morning digest (crons)

Merge both into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip either if its id exists):

```json
{
  "id": "inbox-triage-pass",
  "freq": "interval",
  "intervalMinutes": 30,
  "enabled": true,
  "prompt": "Inbox triage pass. Read /workspace/apps/inbox-triage/SKILL.md and `cd /workspace/app && npx convex run triage:rules`. For each new thread since the last pass: categorize it against the rules, choose its bucket, and upsert it with triage:upsert INCLUDING a one-line reason. Draft replies for routine threads (triage:setDraft). Send only where the matching rule has autoSend true, and send anything the user approved (triage:digest -> approvedToSend), marking it sent. Post nothing in chat — the 7am digest is the only scheduled message."
}
```

```json
{
  "id": "inbox-triage-digest",
  "freq": "weekdays",
  "time": "07:00",
  "enabled": true,
  "prompt": "Inbox triage morning digest. Run `cd /workspace/app && npx convex run triage:digest` and post exactly three lines: needs-you count, handled count, FYI count — plus one sentence naming the single email that genuinely matters most and why. Link the Inbox tab. If needs-you is zero, say so in one line and stop."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `inbox-triage` is already present):

```json
{
  "appId": "inbox-triage",
  "version": 1,
  "description": "Three-bucket response queue (Needs you / Handled / FYI) with visible editable rules, drafted replies, and per-category auto-send that is off by default.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/inbox-triage/",
    "/workspace/app/convex/triage.ts",
    "/workspace/app/convex/triageTables.ts",
    "/workspace/app/src/ResponseQueue.tsx",
    "/workspace/app/convex/schema.ts (+triageTables spread)"
  ],
  "crons": ["inbox-triage-pass", "inbox-triage-digest"],
  "artifacts": ["response-queue"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Inbox is live — three buckets: Needs you, Handled, FYI, with the categories I read off your actual mailbox (they're in Rules; edit them, they're not a black box). Every morning at 7 you'll get three lines here plus the one email that actually matters. **I don't send anything without your approval** — auto-send is off for every category, and turning it on is a switch you flip in Rules once the drafts read right to you.

Then check off the install task's todos and mark it Done.
