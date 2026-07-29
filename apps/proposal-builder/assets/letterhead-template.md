# Letterhead

What every generated proposal PDF must look like. Captured once from the user's own documents; edit any time.

- **Business name**: <as it should appear>
- **Logo**: `/workspace/branding/<file>` (or "none — text wordmark")
- **Address block**: <address · phone · email · license #>
- **Primary color**: <hex from their existing material>
- **Accent / rule color**: <hex>
- **Heading font**: <font, or "system serif">
- **Body font**: <font, or "system sans">
- **Footer line**: <e.g. "Licensed & insured · CA C-27 #1234567">

## Structure

1. Letterhead band: logo left, address block right.
2. Title: `Proposal — <client>` with the date and a validity line from `proposal_terms.validity`.
3. Scope paragraph, in the user's voice, two to four sentences.
4. Line-item table: item · unit · quantity · rate · amount. Total in bold.
5. Assumptions ("this quote assumes…") — the judgment calls, verbatim from the quote record.
6. Terms: payment, cancellation, insurance — from `proposal_terms`.
7. Signature block.

## Attachments

Files that ride along with proposals when the terms reference them:

- Certificate of insurance: `/workspace/branding/<file>`
- License: `/workspace/branding/<file>`
