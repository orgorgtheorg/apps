# Install: Interview scheduler

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Files into place

The package is unpacked at `/workspace/apps/interview-scheduler/`. Create the working area if missing:

```bash
mkdir -p /workspace/hiring
```

Scheduling state per role lives in `/workspace/hiring/<role-slug>/scheduling.md` — created on first use, not now.

## 2. Booking rules

Create `/workspace/memory/general/interview-booking-rules.md` if it does not exist, seeded from `assets/booking-rules.md`. If it already exists, leave it alone — it holds the user's learned preferences.

```bash
mkdir -p /workspace/memory/general
[ -f /workspace/memory/general/interview-booking-rules.md ] \
  || cp /workspace/apps/interview-scheduler/assets/booking-rules.md \
        /workspace/memory/general/interview-booking-rules.md
```

Add a line to `/workspace/memory/index.md` under the topic-file map pointing at it (skip if already there).

## 3. Silence check (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `interview-silence-check` already exists):

```json
{
  "id": "interview-silence-check",
  "freq": "weekdays",
  "time": "09:30",
  "enabled": true,
  "prompt": "Interview-scheduler silence check. Read every /workspace/hiring/*/scheduling.md. For each candidate whose status is 'slots offered' with no reply for 4+ days, draft a short, warm nudge email (one per candidate, in a doc artifact 'Scheduling nudges') and park a NeedsHuman task listing them so the user can send or drop. If none are silent, do nothing and end quietly — no chat message."
}
```

## 4. No artifact app

This app registers no artifact and installs no local Convex tables. Verify you added none.

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `interview-scheduler` is already present):

```json
{
  "appId": "interview-scheduler",
  "version": 1,
  "description": "Proposes interview slots from the real calendar, drafts slot-offer emails, tracks replies, books the event.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/interview-scheduler/",
    "/workspace/memory/general/interview-booking-rules.md"
  ],
  "crons": ["interview-silence-check"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message — teach the trigger, don't describe the plumbing (~3 sentences):

> Interview scheduler is set up. Say "schedule Maria and Devon for screens" and I'll pull three real openings each from your calendar, show them to you here, and draft the slot-offer emails for your approval — I never send or book without your go-ahead. My booking rules (no interviews before 10am, nothing inside 24 hours, no lunch slots) are in memory and you can edit them any time by telling me.

Then check off the install task's todos and mark it Done.
