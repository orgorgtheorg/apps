# Install: Spend anomaly watch

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Confirm the bank mirror exists

This app is genuinely connector-gated — it reads the live bank transaction mirror. Before anything else, verify you can read transactions (a bank connection, an exported CSV the user drops, or an accounting page you can reach in the shared browser).

- Can read → note **which** source, concretely; step 3's cron prompt must name it.
- Cannot read → do not fake it. Install everything else, then park a NeedsHuman task (reason `Question`) saying the watch is idle until a bank source exists, and say the same in the handover.

## 2. Working files

```bash
mkdir -p /workspace/spend
[ -f /workspace/spend/expected.md ] || cp /workspace/apps/spend-anomaly-watch/assets/expected.md /workspace/spend/expected.md
[ -f /workspace/spend/renewals.md ] || cp /workspace/apps/spend-anomaly-watch/assets/renewals.md /workspace/spend/renewals.md
[ -f /workspace/spend/muted.md ] || printf '# Muted vendors\n\nOne line per vendor: name · muted on · why.\n' > /workspace/spend/muted.md
```

## 3. Crons

Merge both into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip either if its id already exists). Replace `<SOURCE>` with the concrete read you verified in step 1.

```json
{
  "id": "spend-anomaly-scan",
  "freq": "daily",
  "time": "08:00",
  "enabled": true,
  "prompt": "Spend anomaly scan. Read transactions since the last scan via <SOURCE>, plus /workspace/spend/expected.md, /workspace/spend/renewals.md and /workspace/spend/muted.md. Flag only: a vendor never seen before, the same amount to the same vendor twice within 3 days, a recurring charge more than 20% above its usual amount, and any renewal in renewals.md falling due within 30 days. Skip anything explained by expected.md or listed in muted.md. If there is nothing, end quietly with no message. Otherwise post ONE chat message, one line per flag, each with amount, vendor, date, and a single-sentence reason — and for renewals the cancel-by date. Offer 'mute <vendor>' as the reply verb. Change nothing."
}
```

```json
{
  "id": "spend-weekly-digest",
  "freq": "weekly",
  "days": ["Mon"],
  "time": "08:00",
  "enabled": true,
  "prompt": "Spend weekly digest. Summarize last week's spending from <SOURCE> into a doc artifact 'Spend — week of <date>': total out, top 5 vendors, new vendors, subscriptions, anything that changed shape versus the prior week. Post two lines in chat: the total and the single most interesting movement, with a link to the doc. No alarm language for normal variance."
}
```

## 4. Monthly doc

No artifact tab and no local Convex tables. The monthly artifact is a doc created on demand by the digest — don't create one now.

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `spend-anomaly-watch` is already present):

```json
{
  "appId": "spend-anomaly-watch",
  "version": 1,
  "description": "Daily scan of the bank mirror for new vendors, duplicate charges, grown subscriptions, and renewals due within 30 days; weekly digest.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/spend-anomaly-watch/",
    "/workspace/spend/expected.md",
    "/workspace/spend/renewals.md",
    "/workspace/spend/muted.md"
  ],
  "crons": ["spend-anomaly-scan", "spend-weekly-digest"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message (~3 sentences):

> Spend watch is on. I'll check transactions each morning and ping you only for the four things worth interrupting for — a vendor you've never paid, the same charge twice, a subscription that grew, or an annual renewal coming due (with the cancel-by date, which is the number that actually matters). Everything else goes in the Monday digest; reply "mute Notion" any time and that vendor stops flagging.

Then check off the install task's todos and mark it Done.
