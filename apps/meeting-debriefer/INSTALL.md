# Install: Meeting debriefer

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Files into place

```bash
mkdir -p /workspace/meetings/logs
[ -f /workspace/meetings/README.md ] || cp /workspace/apps/meeting-debriefer/assets/log-format.md /workspace/meetings/README.md
```

`/workspace/meetings/logs/<counterpart-slug>.md` is the per-counterpart running log — one file per person or company, appended forever. Created on first debrief, not now.

## 2. Commitment resurfacing (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `debrief-commitments` already exists):

```json
{
  "id": "debrief-commitments",
  "freq": "weekdays",
  "time": "08:30",
  "enabled": true,
  "prompt": "Meeting-debriefer commitment check. Read /workspace/meetings/logs/*.md for open commitments. Surface (a) MY commitments due today or tomorrow and (b) THEIR commitments now overdue by 2+ days. If none, end quietly with no message. Otherwise post one short chat message: mine first with the exact promise quoted ('you said you'd send the deck by Friday'), then theirs with a one-line drafted follow-up each. Do not create tasks for their commitments; mine are already on the board."
}
```

## 3. No artifact app

No artifact tab and no local Convex tables — the task board and the log files are the surface. Verify you added none.

## 4. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `meeting-debriefer` is already present):

```json
{
  "appId": "meeting-debriefer",
  "version": 1,
  "description": "Turns a voice memo or pasted notes into extracted commitments on the task board, a per-counterpart meeting log, and a drafted follow-up email.",
  "installedAt": "<ISO timestamp>",
  "files": ["/workspace/apps/meeting-debriefer/", "/workspace/meetings/"],
  "crons": ["debrief-commitments"],
  "artifacts": []
}
```

## 5. Handover

Post a short chat message (~3 sentences):

> Meeting debriefer is set up. After a call, record a voice memo here (or paste your notes) and I'll pull out who committed to what — your commitments go on the task board with dates, theirs become things I watch for — append the takeaways to that client's running log, and draft the follow-up email before your next call starts. Each weekday morning I'll remind you of anything you promised that's coming due.

Then check off the install task's todos and mark it Done.
