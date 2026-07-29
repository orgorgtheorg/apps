# Install: Speed-to-lead responder

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists. Check off the matching todo on your install task as you finish each step.

## 1. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
```

Both no-op if already running. `start-app` copies the starter to `/workspace/app` if this project has no app yet — note whether the app was **fresh** or **already existed**; step 3 differs.

```bash
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 2. Backend

```bash
cp /workspace/apps/speed-to-lead/app/convex/leadsTables.ts /workspace/app/convex/
cp /workspace/apps/speed-to-lead/app/convex/leads.ts /workspace/app/convex/
```

Add the tables to `/workspace/app/convex/schema.ts`:

```ts
import { leadsTables } from "./leadsTables";
// inside defineSchema({ ... }):
...leadsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. UI

```bash
cp /workspace/apps/speed-to-lead/app/src/LeadsInbox.tsx /workspace/app/src/
```

- **Fresh app** → make it the whole app:

  ```tsx
  import LeadsInbox from "./LeadsInbox";
  export default function App() {
    return <LeadsInbox />;
  }
  ```

- **Existing app** → add a tab/section for it in `App.tsx` without disturbing what's there. If this project already has a leads or deals surface, do **not** ship a second one: extend the existing surface and skip the parts of this step that would duplicate it, noting that in the ledger.

Check `/tmp/app-dev.log` for compile errors before continuing.

## 4. Register the artifact

```bash
orgorg-artifact add --id leads-inbox --kind app --title "Leads" --port 5173 --route / --live
```

If an app artifact is already registered and you mounted the inbox behind a tab, keep the existing entry.

## 5. Reply rules

```bash
mkdir -p /workspace/leads
[ -f /workspace/leads/reply-rules.md ] || cp /workspace/apps/speed-to-lead/assets/reply-rules.md /workspace/leads/reply-rules.md
```

Then ask the user, in **one** message: the booking link (if any) to include in acknowledgments, and whether auto-send should be on for plain inquiries (default: **off**). Write both answers into `reply-rules.md`. Do not enable auto-send unless they say yes explicitly.

## 6. Inbox watch (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `speed-to-lead-watch` already exists):

```json
{
  "id": "speed-to-lead-watch",
  "freq": "interval",
  "intervalMinutes": 10,
  "enabled": true,
  "prompt": "Speed-to-lead pass. Read /workspace/apps/speed-to-lead/SKILL.md and /workspace/leads/reply-rules.md. Check for new inbound inquiries (email, forms, messages) since the last pass; for each, `cd /workspace/app && npx convex run leads:create` with the ORIGINAL arrival time, classify intent, and draft a personalized acknowledgment with leads:setDraft. Auto-send only where reply-rules.md explicitly allows it for that intent, then leads:setStatus answered. Send anything already approved in the app (leads:queue -> approvedToSend). Text the user via SMS only for hot leads, and only if SMS is configured. If nothing new and nothing approved, end quietly with no chat message."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `speed-to-lead` is already present):

```json
{
  "appId": "speed-to-lead",
  "version": 1,
  "description": "Leads inbox with an SLA clock: new inquiries filed and acknowledged within minutes, unusual ones held for approval.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/speed-to-lead/",
    "/workspace/app/convex/leads.ts",
    "/workspace/app/convex/leadsTables.ts",
    "/workspace/app/src/LeadsInbox.tsx",
    "/workspace/app/convex/schema.ts (+leadsTables spread)",
    "/workspace/leads/reply-rules.md"
  ],
  "crons": ["speed-to-lead-watch"],
  "artifacts": ["leads-inbox"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Leads is live — new tab. Every inbound inquiry lands there within about ten minutes with a personal reply already drafted and a clock showing how long that person has been waiting (green under 15 minutes, red past an hour); you approve, I send. Pricing questions, complaints, and anything big always wait for you, and auto-send stays off until you tell me otherwise.

Then check off the install task's todos and mark it Done.
