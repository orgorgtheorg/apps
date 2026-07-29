# Install: Resume screener

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Files into place

The package is already unpacked at `/workspace/apps/resume-screener/` (this file). Create the drop folder if missing:

```bash
mkdir -p /workspace/hiring/inbox
```

`/workspace/hiring/` is the working area: one subfolder per role will be created as screening happens (`/workspace/hiring/<role-slug>/`). The `assets/` folder here stays where it is — SKILL.md references it.

## 2. No services, no crons

This app installs no artifact app and no schedule. Verify you did not add any.

## 3. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing). Update the existing entry instead of appending if `resume-screener` is already present:

```json
{
  "appId": "resume-screener",
  "version": 1,
  "description": "Scores dropped resumes against a JD into a sheet, with drafted advance/reject emails.",
  "installedAt": "<ISO date>",
  "files": ["/workspace/apps/resume-screener/", "/workspace/hiring/inbox/"],
  "crons": [],
  "artifacts": []
}
```

## 4. Handover

Post a short chat message — teach the trigger, don't describe the plumbing. Shape (adapt the voice, keep it to ~3 sentences):

> Resume screener is set up. Drop resumes (PDF or docx) into Files — `/workspace/hiring/inbox/` — and tell me the role, or just paste the job description. I'll score everyone into a sheet with red flags and a phone-screen question each, and draft the advance/reject emails for your review.

Then check off the install task's todos and mark it Done.
