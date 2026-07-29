# Reply rules

The agent reads this before drafting or sending anything. Edit freely.

## Auto-send

Which intents may be answered without the user seeing the draft first. **Default: none.** Turning one on means a reply goes out within minutes, unread.

| Intent    | Auto-send? | Notes                                         |
| --------- | ---------- | --------------------------------------------- |
| question  | no         | Turn on once the drafts read right for a week |
| booking   | no         |                                               |
| quote     | **never**  | Pricing always needs a human                  |
| complaint | **never**  | Always the user, always fast                  |
| spam      | n/a        | Closed silently                               |

## Content

- **Booking link**: <url or "none">
- **Business hours to state**: <hours>
- **Response promise we're allowed to make**: e.g. "we'll get back to you today" — leave blank if none.
- **Never say**: prices, start dates, warranty terms, anything about competitors.
- **Signature**: <how the user signs off>

## Hot-lead signals

Text the user when an inquiry mentions any of these:

- a budget figure
- a deadline or "how soon can you start"
- a named property, project, or multi-unit job
- a referral from a past customer

## Voice

Short, plain, warm. No "Thank you for reaching out to us regarding your inquiry." Read three of the user's own sent replies before writing the first draft, and match them.
