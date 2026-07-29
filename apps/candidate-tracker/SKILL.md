---
name: candidate-tracker
description: "Operate the hiring pipeline: keep the Candidates board current from resumes, emails, and chat; write screen notes; run the daily staleness sweep; draft candidate communications. Read this whenever the user mentions candidates, applicants, hiring, interviews, resumes, or the Candidates tab."
---

# Candidate tracker

You maintain this project's hiring pipeline. The user sees it as the
**Candidates** artifact tab; the data lives in the local Convex tables
`candidates` (installed by this skill). Your job: the board is always
current, and no candidate ever goes cold silently.

## The data model

`candidates` rows: `name`, `role` (the opening), optional `email` /
`source`, `stage` (`applied → screening → interview → offer → hired |
rejected`), `notes` (append-only `{ text, at }`), `lastTouchedAt` (bumped by
every mutation — the staleness signal).

Operate it from the shell (always `cd /workspace/app` first):

```bash
npx convex run candidates:list
npx convex run candidates:create '{"name":"Dana Cruz","role":"Dispatcher","email":"dana@x.com","source":"Indeed"}'
npx convex run candidates:move '{"id":"<_id>","stage":"screening"}'
npx convex run candidates:addNote '{"id":"<_id>","text":"Phone screen 7/28: strong scheduling experience"}'
npx convex run candidates:stale
```

The user edits the same tables through the app; your `list`/`stale` reads
always reflect their changes live.

## When to act

- **Resume dropped in Files / attached in chat** → extract name, role (ask
  if ambiguous), contact; `create` the candidate with `source`; summarize
  the resume into a first note. Then tell the user it's on the board.
- **User forwards or mentions a candidate email** → find the candidate (by
  name/email via `list`), `addNote` with the gist, and `move` if the email
  implies a stage change ("she accepted the screen" → `screening`).
- **User asks to advance/reject someone** → `move`, then offer the matching
  next step: a drafted scheduling email on `interview`, a drafted offer
  email on `offer`, a kind rejection draft on `rejected`. Draft-only: never
  send without an explicit go-ahead.
- **Daily staleness cron** (`candidate-staleness`, 09:00) → its prompt is
  self-contained: report stale candidates with suggested next actions, touch
  nothing without instruction.
- **"How's hiring going?"** → one compact summary from `list`: per-stage
  counts, who moved recently, who's stale, what needs the user.

## Rules

- Every candidate interaction you learn about becomes a note — the board is
  the record; chat is where you summarize it.
- Never fabricate contact details or interview outcomes; note only what the
  user or a document actually said.
- Stage moves you make on your own initiative: none. Suggest, then act on
  confirmation. (Notes you may add freely.)
- If the Gmail connection is available, you may search mail for candidate
  threads when the user asks you to catch the board up; summarize into
  notes, don't paste whole emails.
