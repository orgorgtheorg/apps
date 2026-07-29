---
name: interview-scheduler
description: Propose interview slots from the real calendar, draft slot-offer emails, track candidate replies, and book the confirmed event with a meeting link. Use whenever the user asks to schedule, reschedule, or confirm an interview, or when a candidate replies picking a time.
---

# Interview scheduler — operating contract

The job: kill the email ping-pong between "let's talk to Maria" and a booked event, without ever putting something on the user's calendar they didn't approve.

There is no app tab — this app is pure choreography. State lives in two honest places: `/workspace/hiring/<role-slug>/scheduling.md` (who was offered what, when, and what came back) and the calendar events themselves.

## Triggers

- "Schedule Maria and Devon for screens", "set up the interview with …", "find me a time with …".
- A candidate email arrives picking, declining, or asking to move a slot.
- The user says "reschedule" / "move" / "cancel" an interview.
- The candidate-tracker app moves someone to `interview` (offer to schedule — once).

## Workflow

1. **Read the rules first.** `/workspace/memory/general/interview-booking-rules.md` governs every proposal. Never propose a slot that violates it.
2. **Read the real calendar.** Never invent availability. If no calendar connection is wired, say so plainly and ask the user for their open windows instead of guessing — a proposed slot that turns out to be double-booked is the one unrecoverable failure of this app.
3. **Propose 3 slots per candidate** in one compact chat message (grouped per candidate, each slot with the day, time, and the candidate's timezone if known). Wait for approval. Do not email anyone yet.
4. **Detect timezone** from the candidate's email signature, phone area code, or stated location — and _say which signal you used_ ("signature says Denver → MT"). If you can't tell, ask rather than assume the user's zone.
5. **Draft the slot-offer email** per candidate into a doc artifact ("Scheduling — <Role>"). Draft-only: sending is the user's action unless they've explicitly told you to send these.
6. **Log to `scheduling.md`**: candidate, slots offered, when offered, status (`slots offered` / `confirmed` / `declined` / `silent`). One row per candidate; update in place.
7. **On a reply**, confirm the pick against the calendar _again_ (it may have filled), create the event with a meeting link and both attendees, and post a one-line confirmation. If the slot is gone, apologize in a redraft with three new slots — that is the reschedule path, not a new thread.
8. **Reschedule verb**: "move Devon to Thursday" → cancel/update the event, draft the apology-and-new-time email, update `scheduling.md`.

## Rules

- **Never book or email without explicit approval.** Reading the calendar is free; writing to it is not.
- **Never offer a slot less than 24 hours out**, over the user's lunch, or outside their working hours — unless the user says to for this one case.
- **Never double-offer the same slot** to two candidates simultaneously. Hold offered slots as tentative in `scheduling.md` until they expire (48h) or are taken.
- **Learn once, remember forever.** A correction ("I don't do interviews before 10") gets written to the booking-rules file immediately, and you say that you wrote it.
- **Silence is a state, not a failure.** After 4 days with no reply, park a NeedsHuman task with a drafted nudge ready — don't chase on your own initiative.

## Composition

- `candidate-tracker` installed → after a booking, `addNote` on that candidate ("Screen booked Thu 7/31 10:00 MT") and `move` to `interview` when the user confirms.
- `meeting-prep` installed → a booked interview gets its brief automatically the night before; don't duplicate the research here.
- `meeting-debriefer` installed → after the interview, the debrief routes back to the candidate's card.
