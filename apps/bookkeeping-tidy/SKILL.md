---
name: bookkeeping-tidy
description: Weekly categorization of new transactions with sticky learned rules, receipt matching from inbox and files, and a month-end accountant-ready doc plus the questions that need a human. Use on the weekly tidy, when the user corrects a category, or when a receipt or month-end is mentioned.
---

# Pre-close bookkeeping tidy — operating contract

The job: month-end becomes a review instead of archaeology, and the accountant stops billing hourly for cleanup.

Surface: the **Close** artifact tab (`close_months`, `close_rules`). Categories: `/workspace/books/categories.md`. Receipts: `/workspace/books/receipts/`.

```bash
cd /workspace/app
npx convex run close:activeRules
npx convex run close:upsertMonth '{"month":"2026-07","transactions":214,"categorized":209,"receiptsExpected":38,"receiptsMatched":34}'
npx convex run close:setFlags '{"month":"2026-07","flags":[{"text":"What was this? No receipt and an unfamiliar merchant.","merchant":"SQ *XKLM","date":"2026-07-14","amount":412.55,"resolved":false}]}'
npx convex run close:learnRule '{"match":"home depot","category":"Materials","origin":"user","note":"Corrected 7/28 — not Supplies"}'
npx convex run close:closeMonth '{"month":"2026-07","docPath":"/workspace/books/2026-07-close.md"}'
```

## Triggers

- `bookkeeping-weekly-tidy` (Fri 16:00).
- "That's equipment, not supplies" → `learnRule` with `origin: "user"`, and say you wrote it down.
- A receipt arrives (photo, PDF, inbox attachment) → match it, or file it and say what it's still waiting for.
- Month-end / "get it ready for my accountant" → produce the doc.

## Workflow

1. **Rules first, guesses second.** Apply `activeRules` before categorizing anything yourself. User rules always beat your own.
2. **Categorize only into `categories.md`.** If nothing fits, it's a flag, not a new category. Never invent an account.
3. **Match receipts** by amount + date + merchant, in that order of confidence. A near-match is a flag, not a match.
4. **Missing receipts get named**: "no receipt for Home Depot, 7/14, $412.55" — never "4 receipts missing". The name and date are what let the user find it.
5. **Flags are questions, not counts.** Three good questions beat a list of forty uncategorized rows.
6. **Month-end doc**: one file at `/workspace/books/<month>-close.md` — totals per category, the flags with their answers, receipts still missing, and anything unusual. That doc is the artifact the user forwards; write it to be read by an accountant, not by a machine.
7. **Corrections are sticky and you say so.** "Got it — Home Depot is Materials from now on, and I've fixed the three earlier ones this month."

## Rules

- **Never change anything in the source system.** You read the bank/accounting feed; you don't post entries, reclassify in QuickBooks, or mark things reconciled.
- **Never guess a merchant's identity** from a cryptic descriptor — flag it.
- **Never delete or rewrite a rule the user set.** They can remove rules in the app; you can't.
- **No tax advice.** Deductibility questions go to the accountant, phrased as a question in the doc.
- Financial detail stays in the workspace: no amounts in memory files, no merchant lists in artifact titles.

## Composition

- `spend-anomaly-watch` installed → it flags anomalies, you categorize; share the transaction source and don't double-report the same charge in the same week.
- `invoice-chaser` installed → paid invoices are income rows; take its record rather than inferring from the bank descriptor.
- `renewal-tracker` installed → a recurring charge whose contract it knows should be categorized consistently with that contract.
