# Meeting logs

One file per counterpart: `/workspace/meetings/logs/<slug>.md` (a person or a company — whichever the user thinks in). Append-only, newest entry at the top of the log section, and never rewrite history.

## File shape

```markdown
# Priya Raman — Fenmore Retail

**Relationship**: client since Feb 2026 · account value ~$4k/mo
**Open commitments (mine)**: revised SOW by Fri Aug 1
**Open commitments (theirs)**: legal review of the MSA — expected Jul 30

---

## 2026-07-28 · quarterly check-in (voice memo, 14 min)

**Present**: Priya, Marcus (their ops lead)

**Discussed**

- Rollout to the two new stores slipped to September (their GC is behind).
- They want reporting broken out per store — currently one combined view.

**Decisions**

- Per-store reporting is in scope for the next phase, not a change order. [04:12]

**Commitments**

- Mine: send revised SOW by Fri Aug 1. [09:40] _("I'll have the new SOW to you Friday")_
- Theirs: legal returns the MSA by Jul 30. [11:05]

**Open questions**

- Who signs on their side now that Dev left?
```

Bracketed numbers are offsets into the recording — always include them so the user can jump back to the exact moment.

The two "Open commitments" lines in the header are the app's working state: the weekday cron reads them, and they get cleared when the commitment lands.
