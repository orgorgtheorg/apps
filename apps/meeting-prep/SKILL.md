---
name: meeting-prep
description: Write a half-page brief for each of tomorrow's external meetings — who the person is, recent company news with sources, your history and anything you owe them, and talking points — and post the day's list at 7am. Use on the nightly pass or when the user asks to prep for a specific meeting.
---

# Meeting prep briefs — operating contract

The job: the user walks into every external meeting already briefed, without having asked.

State: `/workspace/meetings/prep-rules.md` and one doc artifact per day (`Briefs — <date>`). No app tab.

## Triggers

- `meeting-prep-nightly` (21:00 weekdays) and `meeting-prep-morning` (07:00 weekdays).
- "Prep me for the Fenmore call", "who am I meeting Thursday?"
- A meeting gets added to tomorrow's calendar after the nightly pass ran → brief it when you next run.

## Brief shape (half a page, four parts, in this order)

1. **Who** — name, role, company; **one** researched recent fact with a source link (funding, launch, hire, closure). Nothing found is "nothing notable found", not filler.
2. **History** — last emails, last meeting log, when you last spoke, and _anything you owe them_. "You last spoke 47 days ago — you owed them pricing" is the line that earns the whole app.
3. **The one thing to remember** — a single sentence. If you can't name one, the brief is too shallow; dig once more.
4. **Talking points** — three, concrete, tied to the history.

## Rules

- **Internal meetings are skipped silently.** No brief, no mention, no "skipped 4 internal meetings" line. `prep-rules.md` defines internal.
- **Cite or don't claim.** Every researched fact carries its link. "Couldn't verify" is a valid brief line and is always better than a plausible invention — a wrong fact stated confidently in a meeting is the worst possible failure of this app.
- **One chat message per morning**, sorted by meeting time, with anchors into the doc. Never post briefs as chat text.
- **Cap research** at about two minutes per person. Depth is not the value; timeliness and the history line are.
- **No private inference.** Public sources and the user's own workspace only — never speculate about someone's personal life, health, or finances.
- Same-day changes: if a meeting is canceled, drop it from the morning post rather than briefing a meeting that isn't happening.

## Composition

- `meeting-debriefer` installed → its per-counterpart logs are your primary history source and where "you owed them pricing" comes from. Read `/workspace/meetings/logs/<slug>.md` before researching anything external.
- `fundraising-crm` installed → an investor meeting brief pulls the card (stage, check size, intro path, pass-reason patterns) instead of generic research.
- `candidate-tracker` / `interview-scheduler` installed → an interview gets the candidate's scorecard and screen notes as its history section.
- `inbox-triage` installed → don't re-summarize threads it already categorized; link its summary.
