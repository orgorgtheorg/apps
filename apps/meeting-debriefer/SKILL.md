---
name: meeting-debriefer
description: Turn a voice memo or pasted notes from a meeting into extracted commitments (yours on the task board, theirs watched), an appended per-counterpart meeting log, and a drafted follow-up email. Use whenever a recording or notes arrive, or the user says "just got off a call with…".
---

# Meeting debriefer — operating contract

The job: the ten minutes after a call — commitments, notes, follow-up — happen without the user doing them, before the next call starts.

State: `/workspace/meetings/logs/<counterpart-slug>.md`, one append-only file per person or company. Commitments live on the channel task board. No app tab.

## Triggers

- A voice recording or transcript arrives in the channel.
- "Just got off a call with Priya", pasted notes, a photo of a notepad.
- The user asks "what did I promise them?" or "catch me up on <client>".

## Workflow

1. **Transcribe/read first, in full.** Never debrief from a partial listen.
2. **Split commitments by owner** — this is the core discipline:
   - **Mine** → file as tasks on the board with the due date the user actually said (or `NeedsHuman` if the date is vague). Quote the promise verbatim in the task detail.
   - **Theirs** → do **not** create tasks. They go in the log as watches with an expected date; the weekday cron surfaces them once overdue.
3. **Append to the counterpart's log**: date, who was there, what was discussed, decisions, commitments (both sides), open questions, and the timestamp/offset in the recording for each extracted item so the user can jump back to it.
4. **Draft the follow-up email** into a doc artifact ("Follow-up — <counterpart>, <date>"): thanks, the two or three things that matter, your commitments with dates, one clear ask. Draft-only.
5. **Report in chat, three lines**: what the meeting was, your commitments with dates, the follow-up draft link. Not a transcript summary.

## Rules

- **Never invent a commitment.** If the recording is ambiguous ("I'll try to get you something next week"), record it as ambiguous and ask — a phantom deadline on the board is worse than no board.
- **Theirs are watches, not your todos.** Cluttering the user's board with other people's work is the fastest way to make them stop trusting it.
- **Quote, don't paraphrase, promises.** "You said you'd send the deck by Friday" only lands because it's their words.
- **Never send the follow-up** without explicit approval.
- Recordings and transcripts stay in the workspace; never paste long transcript blocks into chat.
- Private meetings stay private: if the user says a debrief is sensitive, keep it out of memory files and say where it lives.

## Composition

- `candidate-tracker` installed → a debrief about a candidate becomes a note on their card and, on the user's confirmation, a stage move.
- `fundraising-crm` installed → an investor debrief updates that investor's card (last touch, pass reason, "circle back in two weeks" → a dated follow-up) instead of only a log file.
- `meeting-prep` installed → your logs are what make its briefs good ("you last spoke 47 days ago — you owed them pricing"). Keep the "open commitments" section of each log current for exactly this reason.
- `interview-scheduler` installed → a "let's talk again next week" from a debrief hands off to it.
