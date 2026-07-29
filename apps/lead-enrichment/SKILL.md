---
name: lead-enrichment
description: Turn a raw list of names into researched, scored prospects — company, title, LinkedIn, one recent fact, and a fit score with sources — filling the Prospects grid row by row. Use when a CSV or list of names is dropped, when the user asks to research prospects, or to re-enrich stale rows.
---

# Lead list enrichment — operating contract

The job: a dead CSV becomes a researched, ranked list the user can act on today — with every claim traceable to a page.

Surface: the **Prospects** artifact tab, backed by the local `prospects` table. Fit definition: `/workspace/sales/fit-profile.md`.

```bash
cd /workspace/app
npx convex run prospects:importRows '{"batch":"conf-attendees-jul","rows":[{"rawName":"Dana Cruz","rawCompany":"Fenmore"}]}'
npx convex run prospects:nextBatch '{"limit":10}'
npx convex run prospects:claim '{"id":"<_id>"}'
npx convex run prospects:setEnrichment '{"id":"<_id>","company":{"value":"Fenmore Retail","sourceUrl":"https://…"},"fitScore":8,"fitReason":"12 stores, ops lead — matches profile","confidence":0.8,"status":"done"}'
npx convex run prospects:markStale '{"olderThanDays":90}'
npx convex run prospects:progress
```

## Triggers

- A CSV, spreadsheet, or pasted list of names/companies arrives.
- "Research these", "who's worth calling?", "enrich the conference list".
- "Re-run the stale ones" → `markStale`, then work the queue again.

## Workflow

1. **Confirm the mapping before importing.** "Column B looks like company — right?" One question, then import. A wrong mapping poisons every row.
2. **Import the whole list first** (`importRows` with a batch name) so the user sees the rows immediately and watches them fill in. Re-importing the same file must not duplicate — the mutation dedupes, don't defeat it.
3. **Work in batches of 10.** `nextBatch` → `claim` each row → research → `setEnrichment`. The grid animates while a row is `enriching`; that live fill is the experience.
4. **Cap research at ~90 seconds per row.** Past that, write what you have with `status: "unverified"` and a low confidence. Never burn ten minutes on one row.
5. **Every researched cell carries its `sourceUrl`** — the page you actually read. No source means you couldn't verify it: say so via a missing `sourceUrl` and a lower `confidence`, don't launder a guess into a fact.
6. **Score against the profile**, not against vibes. `fitReason` is one line and must reference the profile ("12 locations, ops lead — matches; no e-commerce, minor mismatch").
7. **Report**: "180 rows, 174 researched, 6 couldn't be verified" and name the five best fits with their one-line reasons.

## Rules

- **Never invent an email address, a title, or a company.** Pattern-guessing an email (`first.last@company.com`) is inventing. If the user wants guessed patterns, they must ask, and the cell stays sourceless.
- **Never overwrite the imported values.** `rawName`/`rawCompany`/`rawEmail` stay as the user gave them; research goes in the sourced fields.
- **"Couldn't verify" is a good answer.** Honest gaps are what make the verified cells worth trusting.
- **No scraping behind logins** and nothing that violates a site's terms; if a source needs a sign-in the user has, ask before using it.
- Public sources only — no personal-life research.
- Cost discipline: don't re-research a row enriched within 90 days unless asked.

## Composition

- `speed-to-lead` installed → "push the top 20 to the leads inbox" creates rows there with the research attached as a note; don't maintain the prospect in two places afterwards.
- `pipeline-staleness` installed → prospects that become real deals are its surface.
- `meeting-prep` installed → its briefs should reuse the sourced research here instead of re-searching.
