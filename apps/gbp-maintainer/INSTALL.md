# Install: Google Business Profile maintainer

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Business facts (ask once, remember forever)

This app must never invent a business fact. Create `/workspace/gbp/` and seed the two files it reads:

```bash
mkdir -p /workspace/gbp/screenshots
[ -f /workspace/gbp/hours.md ] || cp /workspace/apps/gbp-maintainer/assets/hours.md /workspace/gbp/hours.md
[ -f /workspace/gbp/profile.md ] || cp /workspace/apps/gbp-maintainer/assets/profile.md /workspace/gbp/profile.md
```

Then ask the user — in **one** chat message, then wait — for whatever `profile.md` still has as `<…>`: the business name as it appears on Google, the profile URL, service area, and the regular hours. Fill them in. Do not proceed to step 3 with placeholders left in.

## 2. Browser sign-in

The weekly run drives the shared browser. Check whether the Google account that manages the profile is already signed in:

- Signed in → note it and continue.
- Not signed in → do **not** attempt to sign in yourself. Park a NeedsHuman task (reason `TakeOverBrowser`) asking the user to sign into Google in the shared browser, then continue the rest of the install; the cron will park again if it's still not signed in when it fires.

## 3. Weekly refresh (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `gbp-weekly-refresh` already exists):

```json
{
  "id": "gbp-weekly-refresh",
  "freq": "weekly",
  "days": ["Tue"],
  "time": "10:00",
  "enabled": true,
  "prompt": "Google Business Profile weekly refresh. Read /workspace/apps/gbp-maintainer/SKILL.md first, then /workspace/gbp/profile.md and /workspace/gbp/hours.md. In the shared browser open the Business Profile. Do four things, skipping any that has nothing real behind it: (1) draft one post from genuinely new workspace material — a photo added to Files this week, a schedule change, a finished job — and publish it only after the user approves in chat; (2) compare live hours to hours.md and fix differences, flagging any upcoming holiday within 14 days that has no answer yet; (3) answer unanswered Q&A with drafts, posting only approved ones; (4) screenshot the live profile into /workspace/gbp/screenshots/<date>.png as proof. Post one short digest of what changed. If nothing was worth doing, say exactly that in one line."
}
```

## 4. No artifact app

No artifact tab, no local Convex tables. Verify you added none.

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `gbp-maintainer` is already present):

```json
{
  "appId": "gbp-maintainer",
  "version": 1,
  "description": "Weekly Google Business Profile upkeep via the shared browser: post, hours, Q&A, photos — with screenshot proof.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/gbp-maintainer/",
    "/workspace/gbp/profile.md",
    "/workspace/gbp/hours.md",
    "/workspace/gbp/screenshots/"
  ],
  "crons": ["gbp-weekly-refresh"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message (~3 sentences):

> Google Business Profile maintainer is set up. Every Tuesday I'll check your profile in the browser — draft a post from whatever's actually new, fix hours drift, answer open questions — and show you the drafts here before anything goes live, with a screenshot of the profile after. Your hours live in `hours.md`; edit that file (or just tell me) and I'll push the change.

Then check off the install task's todos and mark it Done.
