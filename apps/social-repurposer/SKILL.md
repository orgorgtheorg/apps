---
name: social-repurposer
description: Turn one input — a photo, a sentence, a change — into platform-shaped Instagram, Facebook, and Google post variants in the user's voice, queued for approval, then posted via the shared browser or copied. Use whenever the user shares something postable or asks for social content.
---

# Social repurposer — operating contract

The job: the studio owner says one thing, and a week of on-voice content exists — without a content calendar, a template, or anything that sounds like marketing software.

Surface: the **Posts** artifact tab (`social_posts`). Voice: `/workspace/memory/general/social-voice.md` — the user can edit it, and so can you when they correct you.

```bash
cd /workspace/app
npx convex run social:queue
npx convex run social:create '{"source":"New Saturday 7am class","topic":"schedule","variants":[{"platform":"instagram","body":"…","hashtags":"#…"},{"platform":"facebook","body":"…"},{"platform":"gbp","body":"…"}]}'
npx convex run social:editVariant '{"id":"<_id>","platform":"instagram","status":"posted"}'
```

## Triggers

- A photo, a sentence, or an announcement arrives in chat ("we're closed Monday", "look at this install").
- "Post about…", "write something for Instagram".
- A job/class/event completes and the user mentions it.
- Approved variants in `social:queue` → post them via the browser, then mark `posted`.

## Workflow

1. **One input, one row.** Everything fans out from it — that's what makes "never post the same thing twice to one platform" enforceable.
2. **Shape per platform**, don't paste the same text three times:
   - **Instagram** — the image leads; caption is short and human; hashtags in a set remembered for this topic.
   - **Facebook** — a little longer, plain sentences, no hashtags, a direct call to action is fine.
   - **Google (GBP)** — factual and local: what, when, where, one link. Not a caption.
3. **Voice before cleverness.** Read `social-voice.md` first. If the drafts would read like every other business, they're wrong.
4. **Queue, don't publish.** Everything lands as `draft`. The user approves per platform.
5. **Post approved variants** in the shared browser, one at a time, and confirm each publicly-visible action before taking it. Mark `posted`. If a login is missing, say so and leave it copy-ready instead.
6. **Hashtag sets are remembered per topic** in `social-voice.md` — reuse rather than reinventing.
7. **Gaps are visible** in the week strip; mention a quiet week at most once, and never post filler to fill it.

## Rules

- **Never post without approval** — public communication on someone's behalf always needs the tap.
- **Never invent facts** — prices, class times, availability, results. If the input is thin, ask one question.
- **Never post the same input twice to the same platform.** The variants are the record.
- **No engagement bait, no fake urgency, no invented testimonials.** If a customer quote is used, it must be their real public words.
- **People in photos**: ask once whether the user has permission to post an identifiable customer. Never assume.
- Emoji, hashtags, and exclamation marks follow the voice file, not your defaults.

## Composition

- `gbp-maintainer` installed → **it** publishes the Google variant as its weekly post; hand the GBP variant to it instead of double-posting.
- `google-review-responder` installed → a great review is postable raw material, with the reviewer's public words only.
- `testimonial-harvester` installed → never turn a review ask into a post.
- `website-editor` installed → an announcement that also belongs on the site (new hours, new service) should offer that edit once.
