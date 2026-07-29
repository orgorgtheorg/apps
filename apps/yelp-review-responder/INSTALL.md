# Install: Yelp review responder

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

**Shared queue**: this app and `google-review-responder` use the same `reviews` table and the same **Reviews** tab.

## 1. Is the queue already installed?

Check `/workspace/installed_apps.json` and `ls /workspace/app/convex/reviewsTables.ts`.

- **Already there** (google-review-responder installed) → skip step 3 entirely. Do **not** copy a second copy of the tables or a second UI file, and do **not** register a second artifact.
- **Not there** → do step 3.

## 2. Browser sign-in

The daily fetch drives the shared browser with the **Yelp business account** — a different login from Google. Check whether it's signed in; if not, park a NeedsHuman task (reason `TakeOverBrowser`) asking the user to sign into Yelp for Business, and continue the rest of the install.

## 3. App (only if the queue isn't installed yet)

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
cp /workspace/apps/yelp-review-responder/app/convex/reviewsTables.ts /workspace/app/convex/
cp /workspace/apps/yelp-review-responder/app/convex/reviews.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { reviewsTables } from "./reviewsTables";
// inside defineSchema({ ... }):
...reviewsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
cp /workspace/apps/yelp-review-responder/app/src/ReviewQueue.tsx /workspace/app/src/
orgorg-artifact add --id reviews --kind app --title "Reviews" --port 5173 --route / --live
```

Fresh app → `App.tsx` renders `<ReviewQueue />`; existing app → add it as a tab.

## 4. Yelp etiquette file

```bash
mkdir -p /workspace/reviews
[ -f /workspace/reviews/yelp-etiquette.md ] || cp /workspace/apps/yelp-review-responder/assets/yelp-etiquette.md /workspace/reviews/yelp-etiquette.md
```

Ask for the Yelp business page URL and write it into that file. Yelp's norms are different from Google's — this file, not the Google voice file, governs Yelp drafts.

## 5. Daily fetch (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `yelp-review-fetch` already exists):

```json
{
  "id": "yelp-review-fetch",
  "freq": "daily",
  "time": "08:15",
  "enabled": true,
  "prompt": "Yelp review fetch. Read /workspace/apps/yelp-review-responder/SKILL.md and /workspace/reviews/yelp-etiquette.md. In the shared browser open the Yelp business page (including the 'not recommended' section) and upsert new reviews with platform 'yelp' (`cd /workspace/app && npx convex run reviews:upsert`), setting likelyFiltered true for anything in the not-recommended list. For each new review set a replyAdvice line saying whether replying is worth it at all, and draft a cooler-toned reply only where it is. Never draft anything that asks for reviews. 1-star reviews go to chat immediately with a recovery draft. Post approved replies (reviews:queue -> approvedToPost) and mark them posted. Nothing new and nothing approved: end quietly."
}
```

## 6. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `yelp-review-responder` is already present):

```json
{
  "appId": "yelp-review-responder",
  "version": 1,
  "description": "Daily Yelp review fetch into the shared Reviews queue with Yelp-appropriate replies, a should-you-reply recommendation, and no review solicitation ever.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/yelp-review-responder/",
    "/workspace/reviews/yelp-etiquette.md"
  ],
  "crons": ["yelp-review-fetch"],
  "artifacts": []
}
```

If step 3 ran (this app installed the queue), add the app files and `"reviews"` to `artifacts`.

## 7. Handover

Post a short chat message (~3 sentences):

> Yelp is wired into the Reviews tab. Each morning I'll pull new Yelp reviews with a drafted reply — cooler and shorter than the Google ones, because Yelp readers punish corporate warmth — and on some I'll recommend not replying at all, which is often the right move there. I'll never ask anyone for a Yelp review: their policy forbids it and it can get your page penalized.

Then check off the install task's todos and mark it Done.
