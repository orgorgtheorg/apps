# Install: Google review responder

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

**Shared queue**: this app and `yelp-review-responder` use the same `reviews` table and the same **Reviews** tab. If the ledger shows the other one is already installed, skip steps 2–4 (the files are already there) and only do steps 1, 5, 6, 7.

## 1. Browser sign-in

The daily fetch drives the shared browser. Check whether the Google account managing the business profile is signed in. If not, do **not** attempt to sign in yourself — park a NeedsHuman task (reason `TakeOverBrowser`) asking the user to sign in, and continue the rest of the install.

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
cp /workspace/apps/google-review-responder/app/convex/reviewsTables.ts /workspace/app/convex/
cp /workspace/apps/google-review-responder/app/convex/reviews.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { reviewsTables } from "./reviewsTables";
// inside defineSchema({ ... }):
...reviewsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/google-review-responder/app/src/ReviewQueue.tsx /workspace/app/src/
```

- **Fresh app** → `App.tsx` renders `<ReviewQueue />`.
- **Existing app** → add it as a tab/section.

```bash
orgorg-artifact add --id reviews --kind app --title "Reviews" --port 5173 --route / --live
```

## 5. Voice

```bash
mkdir -p /workspace/reviews
[ -f /workspace/reviews/reply-voice.md ] || cp /workspace/apps/google-review-responder/assets/reply-voice.md /workspace/reviews/reply-voice.md
```

Ask the user for the business's Google review page URL, and for **three past replies they liked** (or three sentences in their voice). Write the URL and what you learned about their voice into `reply-voice.md`. Without this the drafts read like every other review-bot; say so if they skip it.

## 6. Daily fetch (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `google-review-fetch` already exists):

```json
{
  "id": "google-review-fetch",
  "freq": "daily",
  "time": "08:00",
  "enabled": true,
  "prompt": "Google review fetch. Read /workspace/apps/google-review-responder/SKILL.md and /workspace/reviews/reply-voice.md. In the shared browser open the business's Google reviews page and upsert every review newer than the newest one already stored (`cd /workspace/app && npx convex run reviews:upsert`). Draft an on-brand reply for each new one with reviews:setDraft, varying structure between drafts. Any 1-star review: set escalated with a service-recovery draft and an internal 'what happened?' question, and post it to chat immediately. Then post any replies the user approved in the app (reviews:queue -> approvedToPost) and mark them posted. If nothing is new and nothing is approved, end quietly with no message."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `google-review-responder` is already present):

```json
{
  "appId": "google-review-responder",
  "version": 1,
  "description": "Daily Google review fetch into an approve/edit/skip queue with on-brand drafted replies; 1-star reviews escalate immediately.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/google-review-responder/",
    "/workspace/app/convex/reviews.ts",
    "/workspace/app/convex/reviewsTables.ts",
    "/workspace/app/src/ReviewQueue.tsx",
    "/workspace/app/convex/schema.ts (+reviewsTables spread)",
    "/workspace/reviews/reply-voice.md"
  ],
  "crons": ["google-review-fetch"],
  "artifacts": ["reviews"]
}
```

If the shared files were already installed by `yelp-review-responder`, list only this app's own folder and the cron, and note the sharing in `description`.

## 8. Handover

Post a short chat message (~3 sentences):

> Review queue is live — new tab. Each morning I'll pull your new Google reviews and put a reply draft on each card in your voice; Approve, Edit, or Skip and I post it — nothing goes public without that tap. A 1-star review doesn't wait for the queue: it comes straight here with a service-recovery draft and one question about what happened, because the first hour matters.

Then check off the install task's todos and mark it Done.
