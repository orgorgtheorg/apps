---
name: resume-screener
description: Score dropped resumes against a job description into a comparison sheet with red flags, a tailored phone-screen question per candidate, and drafted advance/reject emails. Use whenever resume-looking files land in the workspace, the user pastes a JD, or asks to screen/compare/rank applicants.
---

# Resume screener — operating contract

The job: turn a pile of applicants into a ranked, explained shortlist the user can act on in 10 minutes. Output is always a **sheet artifact** (the scorecard) plus a **doc artifact** (the email drafts) — never a wall of chat text.

## Triggers

- Resume-looking files (PDF/docx, filenames like `John_Smith_Resume.pdf`) appear anywhere in the workspace — usually `/workspace/hiring/inbox/`.
- The user pastes or uploads a job description, or says anything like "screen these", "who should I interview", "rank the applicants".

## Workflow

1. **Establish the JD.** If you don't have one for this role, ask — one message, then wait. Extract 4–6 concrete must-haves and 2–3 nice-to-haves into `/workspace/hiring/<role-slug>/criteria.md` and confirm them in one line ("Scoring against: … — correct me if off."). Re-screens of the same role reuse this file; if the JD changes, update it and re-score everyone.
2. **Parse each resume** in the sandbox (`pdftotext`, docx tooling). Move processed files to `/workspace/hiring/<role-slug>/resumes/`. Never score a resume you couldn't parse — flag it instead.
3. **Build the scorecard** as a sheet artifact named "Screening — <Role>" (one per role; extend it on re-screens, don't create a second). Columns exactly as `assets/scorecard-columns.md`. One row per candidate, deduped by name+email — a re-submitted resume updates its row.
4. **Draft the emails** into a doc artifact "Screening emails — <Role>" using `assets/email-templates.md`: an advance email (with the phone-screen question) for score ≥ 7, a reject for < 5, and a "maybe — hold" note for the middle. Group by decision. These are DRAFTS — clearly marked, never sent.
5. **Report in chat**, three lines max: "8 screened — 3 advance, 2 maybe, 3 pass", link both artifacts, name the single strongest candidate and why.

## Rules

- **Never fabricate.** Every red flag and every must-have judgment quotes or cites the resume line it came from (the sheet's Evidence column). "Not stated" is a valid value.
- **Draft-only.** You never send candidate email — not even with Gmail connected — unless the user explicitly says to send a specific draft.
- **Consistency beats speed.** All candidates for one role are scored against the same criteria.md revision; note the revision date in the sheet header row.
- Rejected ≠ deleted: keep every parsed resume and row. The user decides.

## Composition

- If `/workspace/installed_apps.json` lists `candidate-tracker`: after the user picks who advances, offer once to file those candidates onto the candidate board with the screen notes attached (follow that app's SKILL.md).
- If a meeting-debriefer voice note mentions a screened candidate, append the takeaway to their Notes cell.
