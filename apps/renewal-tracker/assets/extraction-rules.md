# Extraction rules

What to pull out of every contract, and what to do when it isn't clear.

## Always extract

| Field         | Where it usually lives                         | If missing         |
| ------------- | ---------------------------------------------- | ------------------ |
| Party         | First page / signature block                   | Ask                |
| Type          | Title                                          | Infer, note that   |
| Term start    | "Commencement", "Effective Date"               | Leave empty        |
| Renewal date  | Term / Renewal clause                          | **needsReview**    |
| Notice period | Renewal or Termination clause                  | **needsReview**    |
| Auto-renews?  | Renewal clause                                 | **needsReview**    |
| Cost          | Fees / Rent schedule                           | Leave empty        |
| Notice method | Notices clause (email, certified mail, portal) | Note it as unknown |

Every extracted date and term carries: the section number, the page, and a verbatim quote of the sentence it came from.

## Always park for a human (`needsReview` + a NeedsHuman task)

- "Evergreen" terms with no fixed renewal date.
- Notice measured oddly: "three months prior to the anniversary of the Commencement Date".
- Conflicting clauses between sections or an amendment.
- Notice required by certified mail or a specific portal.
- Any clause where two readings give different dates — quote both readings.

## Derived

- **noticeBy = renewal date − notice period.** Always computed, never typed.
- Annual cost = stated annual figure, or monthly × 12 (say which).

## Never

- Never infer a renewal date from a start date plus a guessed term.
- Never round a notice period ("about two months").
- Never summarize away a condition ("unless the tenant is in default").
