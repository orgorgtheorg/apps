# Install: Meeting prep briefs

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Confirm you can read the calendar

The whole app depends on tomorrow's calendar. Verify you can read it (a calendar connection, or the shared browser signed into the calendar). If you cannot, install the rest, park a NeedsHuman task (reason `Question`) saying briefs stay idle until a calendar is reachable, and say so in the handover — don't pretend.

## 2. Files into place

```bash
mkdir -p /workspace/meetings/briefs
[ -f /workspace/meetings/prep-rules.md ] || cp /workspace/apps/meeting-prep/assets/prep-rules.md /workspace/meetings/prep-rules.md
```

`prep-rules.md` holds what counts as internal (skipped silently), the user's own domain, and how deep to research. Ask for the company's email domain if you don't already know it, and write it in.

## 3. Nightly brief pass (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `meeting-prep-nightly` already exists):

```json
{
  "id": "meeting-prep-nightly",
  "freq": "weekdays",
  "time": "21:00",
  "enabled": true,
  "prompt": "Meeting prep nightly pass. Read /workspace/meetings/prep-rules.md, then tomorrow's calendar. Skip internal-only meetings silently. For each external meeting write a half-page brief into the doc artifact 'Briefs — <tomorrow's date>', sorted by meeting time: who (name, role, company, one researched recent fact with its source link), history (last emails and any /workspace/meetings/logs entry, including anything you owe them), the one thing to remember, and three talking points. Cap research at ~2 minutes per person and write 'couldn't verify' rather than guessing. Do not post anything in chat now — post at 07:00 via the meeting-prep-morning schedule."
}
```

```json
{
  "id": "meeting-prep-morning",
  "freq": "weekdays",
  "time": "07:00",
  "enabled": true,
  "prompt": "Meeting prep morning post. If a briefs doc exists for today, post ONE chat message: a line per external meeting (time · who · the single thing to remember), with a link to the doc. If there are no external meetings today, end quietly with no message."
}
```

## 4. No artifact app

Briefs are doc artifacts created by the cron. No local Convex tables, no app tab. Verify you added none.

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `meeting-prep` is already present):

```json
{
  "appId": "meeting-prep",
  "version": 1,
  "description": "Night-before briefs for tomorrow's external meetings, posted as one 7am digest.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/meeting-prep/",
    "/workspace/meetings/prep-rules.md",
    "/workspace/meetings/briefs/"
  ],
  "crons": ["meeting-prep-nightly", "meeting-prep-morning"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message (~3 sentences):

> Meeting prep is set up. Each night I'll read tomorrow's calendar and write a half-page brief for every external meeting — who they are, what's happened between you, and the one thing to remember — then post the day's list here at 7am with a link. Internal meetings get skipped silently, and you can tell me any time to prep a specific meeting sooner.

Then check off the install task's todos and mark it Done.
