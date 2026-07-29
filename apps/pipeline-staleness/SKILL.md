---
name: pipeline-staleness
description: Watch the project's deal surface for deals going cold, draft context-aware nudge emails referencing the last real interaction, and honor snoozes. Use on the Monday sweep, when the user asks what's stale or what needs following up, or when they snooze a deal.
---

# Pipeline staleness sweep — operating contract

The job: no deal dies of silence. This app owns **no data of its own** — it reads whatever deal surface the project has (see the ledger entry for which one) and writes only two files: `/workspace/sales/nudge-log.md` and `/workspace/sales/snoozed.md`.

## Triggers

- The `pipeline-staleness-sweep` cron (Mon 08:00) — its prompt is self-contained.
- "What's gone quiet?", "who should I follow up with?", "anything stale?"
- "Snooze Oakridge until the 15th" / "stop nudging them".
- A deal's stage changes to closed (won or lost) → log it for the monthly P.S. line.

## Workflow

1. **Read the surface** named in the ledger. If the read fails (table renamed, sheet deleted), say so and stop — never silently fall back to a different source.
2. **Stale = 10+ days with no activity** on an open deal. Use the surface's own touch timestamp; if it has none, use the last note/row edit.
3. **Filter**: drop anything snoozed past today (`snoozed.md`), and anything whose contact appears in `nudge-log.md` within the last 7 days.
4. **Draft one nudge per stale deal** into a doc artifact `Nudges — <week of>`, grouped ready-to-send. Every nudge must reference the **last real interaction** pulled from the surface's notes: "you sent the quote on the 14th", "you walked the property Tuesday". If you cannot find a real interaction, say so in the draft and write a short honest re-open line instead — never generic filler.
5. **Post one digest**: `4 deals cold — Oakridge (12d), Fenmore (14d), …`, a link to the drafts doc, and a P.S. with won/lost this month.
6. **When the user sends one**, append to `nudge-log.md` (date · contact · deal · gist). That log is what prevents double-nudging.

## Rules

- **Never nudge the same contact twice in 7 days**, across every deal they're on. This is the rule that keeps the app from embarrassing the user.
- **Never send.** Drafts only, unless the user says "send them all" for that specific batch.
- **Snoozes are sacred and carry a reason.** "Snoozed — waiting on their board meeting (until Aug 12)". A snoozed deal never appears in the digest, and the reason surfaces when it wakes.
- **No padding.** A clean pipeline is one line: "Nothing stale — 6 open deals, all touched in the last week." Do not manufacture activity to justify the sweep.
- **Don't mutate the surface.** You may add a note recording a nudge you sent; you never move stages on your own initiative.
- "Just checking in" is banned from every draft.

## Composition

- `speed-to-lead` / `lead-enrichment` installed → their tables are the surface; write your nudge notes back onto those rows.
- `invoice-chaser` installed → a deal that is really an unpaid invoice belongs to that app; hand it over instead of nudging twice.
- `meeting-debriefer` installed → its per-counterpart logs are the best source of "the last real interaction"; read them before drafting.
