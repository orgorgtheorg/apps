# Install: Pipeline staleness sweep

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Find the deal surface (do this first — it determines everything else)

This app deliberately ships **no board of its own**. It rides whatever deal surface this project already has, in this order of preference:

1. A local Convex table of deals/leads in `/workspace/app/convex/` — e.g. `leads` (installed by `speed-to-lead`) or `prospects` (installed by `lead-enrichment`). Check `/workspace/installed_apps.json` and `ls /workspace/app/convex/`.
2. A `Deals` or `Pipeline` sheet artifact (`orgorg-artifact list`).
3. Nothing yet → create the sheet: `cd /workspace/app && npx convex run sheet:create '{"title":"Deals"}'`, register it (`orgorg-artifact add --id deals --kind sheet --title "Deals" --port 5176 --route /sheet/<sheetId>`), and seed the header row from `assets/deals-sheet-columns.md`.

Record which surface you chose — the cron prompt in step 2 must name it concretely.

## 2. Monday sweep (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `pipeline-staleness-sweep` already exists). **Replace `<SURFACE>` with the concrete read command for the surface you chose in step 1** — e.g. `cd /workspace/app && npx convex run leads:list`, or `npx convex run sheet:getValues '{"sheetId":"…"}'`:

```json
{
  "id": "pipeline-staleness-sweep",
  "freq": "weekly",
  "days": ["Mon"],
  "time": "08:00",
  "enabled": true,
  "prompt": "Pipeline staleness sweep. Read the deal surface with: <SURFACE>. List every open deal with no activity in 10+ days, skipping any deal snoozed past today per /workspace/sales/snoozed.md and any contact nudged in the last 7 days per /workspace/sales/nudge-log.md. If none, post one line saying the pipeline is clean and stop. Otherwise draft one nudge email per stale deal into a single doc artifact named 'Nudges — <week of>', each referencing the last real interaction (never 'just checking in'), then post one chat digest: the deals with days-idle, a link to the doc, and a P.S. line with what was won and lost this month. Do not send anything."
}
```

## 3. Working files

```bash
mkdir -p /workspace/sales
[ -f /workspace/sales/nudge-log.md ] || printf '# Nudge log\n\nOne line per nudge sent: date · contact · deal · what was said.\n' > /workspace/sales/nudge-log.md
[ -f /workspace/sales/snoozed.md ] || printf '# Snoozed deals\n\nOne line per snooze: deal · until (date) · reason.\n' > /workspace/sales/snoozed.md
```

## 4. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `pipeline-staleness` is already present):

```json
{
  "appId": "pipeline-staleness",
  "version": 1,
  "description": "Monday sweep of the deal surface: stale deals with context-aware nudge emails pre-drafted.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/pipeline-staleness/",
    "/workspace/sales/nudge-log.md",
    "/workspace/sales/snoozed.md"
  ],
  "crons": ["pipeline-staleness-sweep"],
  "artifacts": []
}
```

(If step 1 had to create the `deals` sheet, add `"deals"` to `artifacts`.)

## 5. Handover

Post a short chat message (~3 sentences) naming the surface you're watching:

> Staleness sweep is on. Every Monday at 8am I'll check <surface> for deals with nothing happening in 10+ days and drop a digest here with a nudge email already drafted for each — referencing what actually last happened, not "just checking in". Say "snooze Oakridge until the 15th" any time and it drops out of the sweep with the reason logged.

Then check off the install task's todos and mark it Done.
