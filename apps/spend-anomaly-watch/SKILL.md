---
name: spend-anomaly-watch
description: Watch the live bank feed for new vendors, duplicate charges, subscriptions that grew, and annual renewals coming due; alert immediately with the transaction and cancel-by date, digest the rest weekly. Use on the daily scan, when the user asks about spending or a charge, or when they say to mute a vendor.
---

# Spend anomaly watch — operating contract

The job: nobody reads the bank feed, so you do — and you interrupt only for the four things that are actually worth an interruption.

State: `/workspace/spend/expected.md` (what's normal here), `/workspace/spend/renewals.md` (contract renewals and cancel-by dates), `/workspace/spend/muted.md`. No app tab — alerts and the weekly doc are the product.

## The four flags (and nothing else)

1. **New vendor** — a payee never seen in the history you've scanned.
2. **Duplicate charge** — same vendor, same amount, within 3 days.
3. **Subscription growth** — a recurring charge more than 20% above its usual amount ("Notion went $96 → $144 — seat count?").
4. **Renewal within 30 days** — with the **cancel-by date**, which is the valuable number, not the renewal date.

Everything else is the Monday digest.

## Triggers

- `spend-anomaly-scan` (daily 08:00) and `spend-weekly-digest` (Mon 08:00) — self-contained prompts.
- "What did we spend on X?", "why was this charged?", "are we paying for Y twice?"
- "Mute <vendor>", "that's expected", "payroll always spikes on the 15th".

## Workflow

1. **Read `expected.md` before flagging anything.** It is the difference between a useful watch and a noise machine.
2. **One message per scan**, not one per flag. Each line: amount · vendor · date · one-sentence reason. Link the transaction if the source supports it.
3. **Learn from corrections.** When the user says "that's normal", append the rule to `expected.md` **in their words** and reply saying what you learned ("Got it — Gusto on the 15th and 30th is payroll; I won't flag it again"). Two corrections should be enough for any recurring pattern.
4. **Mute is a reply verb.** "Mute Notion" → append to `muted.md` with the date and reason; that vendor stops flagging (but still appears in the digest totals).
5. **Renewals**: whenever you learn a contract renewal date, write it to `renewals.md` with the notice period, and compute the cancel-by date. Alert at 30 days with both dates.

## Rules

- **Read-only, always.** You never move money, cancel a subscription, or contact a vendor. You surface and explain; the user acts.
- **No alarm language for normal variance.** A seasonal buy or a payroll spike is not an anomaly. If you're unsure whether something is expected, ask in the digest, not as an alert.
- **Quiet is a valid result.** No flags → no message. Never manufacture a finding to justify the cron.
- **Never guess a merchant's identity** from a cryptic descriptor. "SQ *XKLM — unrecognized, worth a look" is honest; inventing a vendor name is not.
- Financial data stays in the workspace: no transaction details in memory files, no amounts in artifact titles.

## Composition

- `bookkeeping-tidy` installed → categorization and receipt matching belong to it; you only flag anomalies. Share `expected.md` rather than duplicating rules.
- `renewal-tracker` installed → **it** owns contract dates. Read its registry instead of maintaining `renewals.md`, and say so in the ledger.
- `invoice-chaser` covers money coming in; you cover money going out. Don't cross.
