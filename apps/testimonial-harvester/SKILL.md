---
name: testimonial-harvester
description: After a completed job, draft a personal review request with the business's review link, track who was asked in a ledger so nobody is asked twice, and report monthly on asks sent vs reviews landed. Use when a job completes, when the user asks for more reviews, or on the daily post-job check.
---

# Testimonial harvester — operating contract

The job: every happy customer gets asked for a review, **exactly once**, at the moment they're happiest — and the user never has to remember to ask.

State: `/workspace/reviews/config.md` (link + signals), `/workspace/reviews/asked.md` (the ledger). No app tab.

## Triggers

- The `testimonial-post-job` cron (daily 17:00).
- "Dana's job is done", "we finished the Oakridge install", an invoice marked paid, a past calendar event matching the job-complete signal.
- "Can we get more reviews?" → run the check now over the last 30 days instead of waiting.

## Workflow

1. **Wait for the glow window** — 2 days after completion, not the same day. Sooner reads as transactional; a week later the feeling is gone.
2. **Check the ledger first.** If the person is in `asked.md` at all, stop. One ask per customer, per lifetime, unless the user explicitly says to ask again.
3. **Draft, personally.** Name them, name the specific job, one sentence of genuine specificity, then the link. Rotate the phrasing — three drafts in a row with the same opening line is how a business gets flagged for review-gating.
4. **Pick the channel**: text if a mobile number is known and the user has SMS wired, otherwise email. Never both.
5. **Queue for approval** in a doc artifact and one short chat line. Never send on your own initiative.
6. **On send**, append to the ledger: date · name · job · channel · phrasing variant used.
7. **Monthly** (first ask of a new month): report asks sent → reviews landed, if the review-responder apps let you count landed ones.

## Rules

- **Never ask twice.** The ledger is the contract; check it before every draft, append after every send.
- **Never ask anyone who has ever left a negative review** or is flagged do-not-ask. If `google-review-responder` or `yelp-review-responder` is installed, cross-check their review history first.
- **Never offer or imply an incentive** for a review, and never ask "if you had a good experience" in a way that filters — review gating violates Google and Yelp policy and can get the profile penalized. Ask everyone whose job went fine, plainly.
- **Never ask on Yelp.** Yelp explicitly prohibits soliciting reviews. If the user asks you to, say why you won't and offer the Google ask instead.
- **Never invent the review link or the customer's contact details.**
- Silence after an ask is the end of it. No follow-ups, no second nudge.

## Composition

- `google-review-responder` installed → a review that lands within ~2 weeks of an ask gets matched to it (ledger: `→ landed 7/30`) and triggers a thank-you reply draft in that app's queue.
- `invoice-chaser` installed → "invoice paid" is the cleanest job-complete signal; use it in preference to calendar guessing.
- `candidate-tracker` / hiring apps: unrelated — never ask a candidate for a review.
