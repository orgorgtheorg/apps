# Install: Social repurposer

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

## 2. Backend

```bash
cp /workspace/apps/social-repurposer/app/convex/socialTables.ts /workspace/app/convex/
cp /workspace/apps/social-repurposer/app/convex/social.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { socialTables } from "./socialTables";
// inside defineSchema({ ... }):
...socialTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. UI

```bash
cp /workspace/apps/social-repurposer/app/src/PostQueue.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<PostQueue />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id post-queue --kind app --title "Posts" --port 5173 --route / --live
```

## 4. Voice profile (do not skip — this is what makes the drafts theirs)

```bash
mkdir -p /workspace/memory/general
[ -f /workspace/memory/general/social-voice.md ] || cp /workspace/apps/social-repurposer/assets/social-voice.md /workspace/memory/general/social-voice.md
```

Ask the user for **five past posts** (screenshots, links, or pasted text). Read them and fill in `social-voice.md`: sentence length, emoji use, hashtag habits, what they never say, how they refer to customers. Show the user your read of their voice in three bullet points and let them correct it. If they have no past posts, write that in the file and keep drafts plain — do not invent a personality.

Add a line to `/workspace/memory/index.md` pointing at the voice file (skip if already there).

## 5. Browser (optional)

If the user wants you to post rather than hand them text, check whether Instagram/Facebook/Google are signed into the shared browser. Not signed in is fine — the queue's Copy button covers it. Never attempt a sign-in yourself.

## 6. No cron

Posting happens when the user has something to say. Verify you added no cron entry. (If they later ask for a weekly nudge, add one then.)

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `social-repurposer` is already present):

```json
{
  "appId": "social-repurposer",
  "version": 1,
  "description": "Post queue: one input fans out to Instagram / Facebook / Google variants in the user's voice, approved then posted or copied.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/social-repurposer/",
    "/workspace/app/convex/social.ts",
    "/workspace/app/convex/socialTables.ts",
    "/workspace/app/src/PostQueue.tsx",
    "/workspace/app/convex/schema.ts (+socialTables spread)",
    "/workspace/memory/general/social-voice.md"
  ],
  "crons": [],
  "artifacts": ["post-queue"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Posts is live — new tab. Give me one thing — a photo, a sentence, a class that changed — and I'll write an Instagram, a Facebook, and a Google version in your voice; approve one and I post it, or hit copy and post it yourself. Your voice rules live in `memory/general/social-voice.md`; tell me "we don't use exclamation marks" and I'll write it down and stop.

Then check off the install task's todos and mark it Done.
