# Install: Testimonial harvester

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Ask for the two facts this app cannot invent

Before anything else, you need:

- The **review link** (the Google "write a review" short link, or whichever platform the user wants). Never guess it.
- What counts as a **completed job** in this business: a past calendar event, an invoice marked paid, or the user simply telling you.

If either is unknown, ask once in chat and wait. Write both into `/workspace/reviews/config.md`:

```bash
mkdir -p /workspace/reviews
```

```markdown
# Review-ask config

- Review link: <url>
- Job-complete signal: <calendar events titled … | invoice paid | user says so>
- Glow window: 2 days after completion
- Channel preference: text if a mobile number is known, otherwise email
```

## 2. The Asked ledger

This is the whole integrity of the app — one row per person, ever.

```bash
[ -f /workspace/reviews/asked.md ] || cp /workspace/apps/testimonial-harvester/assets/asked-ledger.md /workspace/reviews/asked.md
```

If a `Review asks` sheet artifact already exists, use that instead and note it in the ledger entry — do not run two records.

## 3. Post-job check (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `testimonial-post-job` already exists):

```json
{
  "id": "testimonial-post-job",
  "freq": "daily",
  "time": "17:00",
  "enabled": true,
  "prompt": "Testimonial harvester post-job check. Read /workspace/reviews/config.md for the job-complete signal and review link. Find jobs completed 2–4 days ago. Skip anyone already listed in /workspace/reviews/asked.md and anyone marked do-not-ask. For each remaining person draft a short, personal review request (their name, the specific job, the review link) — rotate phrasing between drafts, never send a template twice in a row. Put the drafts in a doc artifact 'Review asks — <date>' and post one short chat line: how many are ready and who they are. Send nothing. If there are none, end quietly with no message."
}
```

## 4. No artifact app

This app adds no artifact tab and no local Convex tables. Verify you added none.

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `testimonial-harvester` is already present):

```json
{
  "appId": "testimonial-harvester",
  "version": 1,
  "description": "Drafts a personal review request 2 days after each completed job; the Asked ledger guarantees nobody is asked twice.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/testimonial-harvester/",
    "/workspace/reviews/config.md",
    "/workspace/reviews/asked.md"
  ],
  "crons": ["testimonial-post-job"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message (~3 sentences):

> Testimonial harvester is set up. Two days after a job wraps I'll draft a short, personal review ask for that customer — with your review link — and queue it here for you to send; nobody ever gets asked twice, and anyone who's left you a bad review is skipped automatically. Tell me "Dana's job is done" any time and I'll queue hers on the same clock.

Then check off the install task's todos and mark it Done.
