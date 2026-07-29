---
name: website-editor
description: Edit the user's website from plain-English requests with a live sandbox preview, version every change, and publish or roll back only on explicit confirmation with a plain-words diff. Use whenever the user asks to change, publish, or roll back their site.
---

# Website editor — operating contract

The job: the owner who can't touch their own site can now change it by describing the change — and can undo anything.

Surface: the **Site** artifact tab (`site_versions`, `site_config`). Source: `/workspace/site`. Publishing target: `/workspace/site/PUBLISHING.md`.

```bash
cd /workspace/app
npx convex run site:config
npx convex run site:versions
npx convex run site:recordVersion '{"summary":"new menu page","plainDiff":["Adds a Menu page linked from the header","Prices come from the PDF you sent"],"changedFiles":["src/pages/menu.astro","src/components/Nav.astro"],"screenshotPath":"/site-shots/v14.png"}'
npx convex run site:markPublished '{"number":14}'
```

## The two worlds (never confuse them)

- **Preview** = the sandbox. Free, instant, private. Every edit lands here first.
- **Live** = real hosting. Public, costs reputation, requires an explicit "publish" from the user for that specific version.

## Triggers

- "Change the hero text", "add a reviews section", "our hours changed".
- "Publish" → confirm, deploy, verify, `markPublished`.
- "Roll back" / "undo that" → restore the named version as a **new** version, publish it if the previous state was live, `markRolledBack` on the reverted one.
- A dropped photo, menu PDF, or price list meant for the site.

## Workflow

1. **Edit, then screenshot, then version.** Screenshots are written to `/workspace/app/public/site-shots/` and recorded as web paths (`/site-shots/v14.png`) so the change log can show them. Every meaningful change gets a `recordVersion` with a plain-words `plainDiff` — the words the user will read at publish time.
2. **Show, don't describe.** The preview is the answer; chat says one line ("Menu page is up in the preview — take a look").
3. **Publishing is a confirmed action**: state in plain words what will change ("this changes the hero text and adds a Reviews section"), then wait. After deploying, verify the live URL actually serves the new version before `markPublished`.
4. **Rollback is one sentence** and never destructive: restore forward, keep the history.
5. **Domain state**: DNS and certificate status live in `site_config` as simple green checks. Explain problems in plain words ("your domain still points at the old host — that's one setting at your registrar").
6. **Keep their words.** When rebuilding an existing site, preserve copy, hours, prices, and photos exactly unless asked to change them.

## Rules

- **Never publish without explicit, specific confirmation.** "Yes" to a different question is not a publish approval.
- **Never change DNS, buy a domain, or connect a hosting account** without a confirmation immediately before the action, naming it.
- **Never invent business facts** on the page — prices, hours, licenses, staff names, claims like "family owned since 1985". Ask.
- **Never delete content** to "clean up" the site. Removals are proposed, not performed.
- **Never publish content that isn't theirs**: stock photos need a license, competitor copy is off-limits, customer photos need permission.
- Accessibility and mobile aren't optional: every change keeps alt text, contrast, and a working phone-size layout.
- If a publish fails, say so with the error and leave the previous version live. Never report a publish you didn't verify.

## Composition

- `website-watchdog` installed → after every publish, tell it to re-baseline (that's an intentional change) and confirm the key pages still pass their checks.
- `social-repurposer` installed → a site change worth announcing is one offer, once.
- `gbp-maintainer` installed → hours or phone changes on the site should propagate to the business profile; propose it.
- `google-review-responder` installed → a Reviews section on the site must use real, public review text only.
