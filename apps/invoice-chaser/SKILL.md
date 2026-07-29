---
name: invoice-chaser
description: Track open invoices in the Receivables aging table and chase them on an escalating, editable politeness gradient — honoring promises-to-pay, freezing disputes, and detecting payments. Use on the weekly chase pass, when an invoice or payment is mentioned, or when the user asks who owes them money.
---

# Invoice chaser — operating contract

The job: the user stops dreading the "where's my money" conversation, because it happens on schedule, in their voice, without them.

Surface: the **Receivables** artifact tab (`invoices`). Ladder: `/workspace/invoices/chase-ladder.md`.

```bash
cd /workspace/app
npx convex run receivables:aging
npx convex run receivables:dueForChase
npx convex run receivables:upsert '{"client":"Fenmore","number":"1043","amount":4200,"issuedAt":1751328000000,"dueAt":1753920000000,"email":"ap@fenmore.com","source":"QuickBooks"}'
npx convex run receivables:setDraft '{"id":"<_id>","draft":"Hi …","tone":"direct"}'
npx convex run receivables:recordChase '{"id":"<_id>","tone":"direct","sent":true}'
npx convex run receivables:setStatus '{"id":"<_id>","status":"promised","promisedFor":1754524800000}'
```

## Triggers

- `invoice-chase-pass` (Tue 09:00).
- "Who owes us money?", "did Fenmore pay?"
- A payment lands (bank feed, a "paid" reply, the user says so) → mark paid, stop chasing, say it plainly.
- A reply promising a date → `status: promised` with `promisedFor`. Chasing pauses until then, automatically.
- "They're disputing invoice 1043" → `status: disputed` with the note. Chasing freezes.

## The politeness gradient

Four rungs, visible and editable in `chase-ladder.md`:

| Days overdue | Tone       | Shape                                                     |
| ------------ | ---------- | --------------------------------------------------------- |
| 0–6          | gentle     | Assume it's an oversight. One line, invoice attached.     |
| 7–20         | direct     | Name the amount and the due date. Ask for a payment date. |
| 21–44        | firm       | State the terms, the age, and what happens next.          |
| 45+          | phone call | **Stop emailing.** Flag it for the user to call.          |

Escalation is per-invoice and time-based; a new invoice for the same client starts at gentle again.

## Rules

- **Never chase a disputed invoice.** The freeze is absolute until the user lifts it. Chasing during a dispute is how a business loses a client and a case.
- **Honor promises-to-pay.** If someone says "I'll pay on the 12th", nothing goes out before the 13th — and if the 13th arrives unpaid, the next chase references the promise in their own words.
- **One chase per invoice per week**, and never two invoices to the same client in the same day — batch them into one message.
- **Auto-send is per client and off by default.** Approvals happen in the app.
- **Never threaten** collections, legal action, late fees, or service suspension unless the user's own terms say it and they told you to. Never invent a late fee.
- **Never state a payment happened** without evidence from the source or the user. "Marked paid — from your bank feed on the 14th" is the standard.
- Payment detected → confirm in chat with the amount and date, and celebrate briefly. That moment is why anyone installs this.

## Composition

- `speed-to-lead` / `proposal-builder` installed → a won quote becomes an invoice; take the line items rather than retyping.
- `spend-anomaly-watch` installed → it watches money out, you watch money in; if it has a bank source, use the same one for payment detection and say so in the ledger.
- `bookkeeping-tidy` installed → it owns categorization; hand it paid invoices instead of categorizing yourself.
- `pipeline-staleness` installed → don't let both apps nudge the same contact in the same week; unpaid invoices belong to you.
