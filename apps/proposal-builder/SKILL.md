---
name: proposal-builder
description: Assemble quotes and proposals from the user's own price book — line items, correct math, standing terms, a branded PDF, and the judgment calls stated out loud. Use when the user asks for a quote, proposal, estimate, or bid, or wants to revise or re-send one.
---

# Proposal & quote builder — operating contract

The job: "quote for Oakridge Plaza, weekly mowing ~2 acres + spring cleanup" becomes a branded, correctly-priced PDF in two minutes — built from the user's real rates, never from invented ones.

Surface: the **Price book** artifact tab (`price_items`, `proposal_terms`, `quotes`). Branding: `/workspace/branding/letterhead.md`. Output PDFs: `/workspace/proposals/`.

```bash
cd /workspace/app
npx convex run priceBook:items
npx convex run priceBook:terms
npx convex run priceBook:staleRates
npx convex run priceBook:upsertItem '{"name":"Weekly mowing","unit":"per acre / visit","rate":85,"floorRate":70}'
npx convex run priceBook:saveQuote '{"client":"Oakridge Plaza","title":"Grounds maintenance 2026","lines":[{"label":"Weekly mowing","unit":"per acre / visit","quantity":56,"rate":85,"priceItemName":"Weekly mowing"}],"assumptions":["28 visits/season, 2 acres"],"pdfPath":"/workspace/proposals/oakridge-v1.pdf"}'
```

## Triggers

- "Quote for…", "put together a proposal for…", "what would we charge for…".
- "Send Oakridge a revised version" → a new version, never an edit in place.
- A won/lost outcome → set the quote's status; it tunes nothing automatically but it's the record.

## Workflow

1. **Read the price book first.** Every line comes from a `price_items` row where one exists. If the job needs something not in the book, ask for the rate once, add it to the book, then use it — the book grows, guesses don't.
2. **Do the math in code, not in your head.** Quantities × rates, totals, taxes if the terms define them. Then check the total against the line items before writing the PDF.
3. **State the judgment calls.** Every quote carries `assumptions` — "assumed 28 visits/season", "assumed you're mobilizing once, not weekly". Two or three, in plain words, and repeated in the chat message. This is what makes the user trust a quote they didn't write.
4. **Margin check.** If any line lands below its `floorRate`, set `marginFlag` and say it in chat as a whisper, not a block: "the mowing line is $8/visit under your floor — deliberate?"
5. **Render the PDF** into `/workspace/proposals/<client>-v<n>.pdf` matching `letterhead.md` (logo, colors, address block, terms). Link it in chat as `[Oakridge Plaza — v1 (PDF)](sandbox:/workspace/proposals/oakridge-v1.pdf)`.
6. **Version, don't overwrite.** `saveQuote` increments the version for the same client + title. v1 stays readable after v2 exists.
7. **Report in three lines**: what's in it, the total, the judgment calls.

## Rules

- **Never invent a rate, a discount, or a term.** A price the user never set appearing in a document they sign is the worst failure this app can have.
- **Never send the proposal.** You produce the PDF; the user sends it (or asks you to draft the covering email).
- **Seasonal rate hygiene**: when `staleRates` shows a rate older than six months and it's about to be used, ask once — "your mulch cost is from last March — still right?" — then quote.
- **Attachments**: if the terms reference an insurance certificate or license, attach the file from `/workspace/branding/`; if it's missing, say so rather than referencing a document that doesn't exist.
- **Match the user's voice** in the covering language: learn it from the proposals they seeded, not from a generic template.

## Composition

- `speed-to-lead` / `pipeline-staleness` installed → a quote sent updates that lead/deal's notes with the version and total.
- `invoice-chaser` installed → a won quote is what becomes an invoice; hand over the line items rather than retyping them.
- `renewal-tracker` installed → a multi-year proposal's renewal and notice dates belong in its registry.
