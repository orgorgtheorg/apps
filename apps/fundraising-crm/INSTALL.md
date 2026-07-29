# Install: Fundraising CRM

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Privacy first (say this before anything else)

A raise is the most sensitive thing in a company. If this project's channel is visible to the whole org, say so **now** and recommend a private project for the raise — one message, then continue either way. Record the user's choice in the ledger entry's `description`.

## 2. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 3. Backend

```bash
cp /workspace/apps/fundraising-crm/app/convex/investorsTables.ts /workspace/app/convex/
cp /workspace/apps/fundraising-crm/app/convex/investors.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { investorsTables } from "./investorsTables";
// inside defineSchema({ ... }):
...investorsTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 4. UI

```bash
cp /workspace/apps/fundraising-crm/app/src/InvestorPipeline.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<InvestorPipeline />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id investor-pipeline --kind app --title "Raise" --port 5173 --route / --live
```

## 5. The raise profile

```bash
mkdir -p /workspace/raise
[ -f /workspace/raise/profile.md ] || cp /workspace/apps/fundraising-crm/assets/raise-profile.md /workspace/raise/profile.md
```

Ask, in **one** message: what they're raising (amount, stage, instrument), the one-line pitch, and who's already in the pipeline. Fill in `profile.md`, then create a card per named investor with `investors:create` — researching each one (fund size, recent deals, thesis fit) with a source link as you go.

## 6. Follow-up sweep (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `raise-followup-sweep` already exists):

```json
{
  "id": "raise-followup-sweep",
  "freq": "weekdays",
  "time": "08:00",
  "enabled": true,
  "prompt": "Fundraising follow-up sweep. Run `cd /workspace/app && npx convex run investors:dueFollowUps`. For each due follow-up, draft a short nudge referencing the actual last conversation (from that card's notes) into a doc artifact 'Raise follow-ups — <date>'. Also run investors:momentum and investors:passReasons: if three or more passes cite the same theme, say so in one line. Post one chat message: the momentum numbers, the follow-ups due with a link to the drafts, and the pass pattern if there is one. Send nothing. If nothing is due and nothing changed, end quietly."
}
```

## 7. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `fundraising-crm` is already present):

```json
{
  "appId": "fundraising-crm",
  "version": 1,
  "description": "Investor pipeline kanban with voice-debrief updates, dated follow-ups, momentum stats, and verbatim pass reasons.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/fundraising-crm/",
    "/workspace/app/convex/investors.ts",
    "/workspace/app/convex/investorsTables.ts",
    "/workspace/app/src/InvestorPipeline.tsx",
    "/workspace/app/convex/schema.ts (+investorsTables spread)",
    "/workspace/raise/profile.md"
  ],
  "crons": ["raise-followup-sweep"],
  "artifacts": ["investor-pipeline"]
}
```

## 8. Handover

Post a short chat message (~3 sentences):

> Raise is live — new tab, Researching → Intro'd → Met → Partner meeting → Terms, seeded with who you named and the research I could verify. After each pitch, record a voice debrief here and I'll update the card, log the pass reason verbatim if it's a no, and turn "circle back in two weeks" into a dated follow-up I'll resurface with a nudge already drafted. The header line is your momentum: meetings this week, new intros, days since terms moved.

Then check off the install task's todos and mark it Done.
