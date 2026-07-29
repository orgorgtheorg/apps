# Install: Proposal & quote builder

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

Note whether `/workspace/app` was **fresh** or **already existed**.

## 2. Backend

```bash
cp /workspace/apps/proposal-builder/app/convex/priceBookTables.ts /workspace/app/convex/
cp /workspace/apps/proposal-builder/app/convex/priceBook.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { priceBookTables } from "./priceBookTables";
// inside defineSchema({ ... }):
...priceBookTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. UI

```bash
cp /workspace/apps/proposal-builder/app/src/PriceBook.tsx /workspace/app/src/
```

- **Fresh app** → `App.tsx` renders `<PriceBook />`.
- **Existing app** → add it as a tab/section.

Check `/tmp/app-dev.log` for compile errors, then:

```bash
orgorg-artifact add --id price-book --kind app --title "Price book" --port 5173 --route / --live
```

## 4. Seed from real proposals (the step that makes this app good)

Ask the user to drop **2–3 past proposals or invoices** into Files. Then:

1. Extract every line item, unit, and rate into `price_items` (`priceBook:upsertItem`).
2. Extract the standing terms (payment, cancellation, insurance/COI, validity window) into `proposal_terms` (`priceBook:setTerm`).
3. Show the user the extracted list in chat and ask them to correct anything wrong **before** you quote off it.

If they have nothing to drop, say the price book starts empty and rates must be added in the app first — do not invent rates.

## 5. Branding capture (one time)

Ask for a letterhead: a logo file, or a past proposal PDF whose look should be matched. Save into `/workspace/branding/` and record what you captured (colors, fonts, logo path, address block) in `/workspace/branding/letterhead.md` using `assets/letterhead-template.md` as the shape. If nothing is provided, note that PDFs will be clean but unbranded until they give you one.

```bash
mkdir -p /workspace/branding /workspace/proposals
[ -f /workspace/branding/letterhead.md ] || cp /workspace/apps/proposal-builder/assets/letterhead-template.md /workspace/branding/letterhead.md
```

## 6. No cron

Quotes are made on request. Verify you added no cron entry.

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `proposal-builder` is already present):

```json
{
  "appId": "proposal-builder",
  "version": 2,
  "description": "Price book app plus quote assembly: line items from the user's own rates, correct math, branded PDF, and the judgment calls stated.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/proposal-builder/",
    "/workspace/app/convex/priceBook.ts",
    "/workspace/app/convex/priceBookTables.ts",
    "/workspace/app/src/PriceBook.tsx",
    "/workspace/app/convex/schema.ts (+priceBookTables spread)",
    "/workspace/branding/letterhead.md",
    "/workspace/proposals/"
  ],
  "crons": [],
  "artifacts": ["price-book"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Price book is live — new tab, seeded from your past proposals (check the rates; I got them from your own documents). Now say something like "quote for Oakridge Plaza — weekly mowing, about 2 acres, plus spring cleanup" and I'll assemble the line items, do the math, and post a branded PDF with the two or three judgment calls I made written out so you can correct them. Edit a rate in the app any time and the next quote uses it.

Then check off the install task's todos and mark it Done.
