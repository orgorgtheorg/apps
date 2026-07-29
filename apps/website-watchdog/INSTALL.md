# Install: Website watchdog

Idempotent — safe to re-run for a retry or an update. Zero connectors: this should be done in under two minutes.

## 1. Ask for the URLs (once)

You need the site URL and, ideally, the two or three pages that actually matter (homepage, booking/checkout, contact). If the user gave them in the request, use those; otherwise ask **one** question and wait.

```bash
mkdir -p /workspace/watchdog/baseline /workspace/watchdog/latest
[ -f /workspace/watchdog/watchlist.md ] || cp /workspace/apps/website-watchdog/assets/watchlist.md /workspace/watchdog/watchlist.md
```

Write the pages into `watchlist.md` — one row per page with the URL and a one-line "what must be true on this page" check (e.g. "the Book now button exists and links to /booking").

## 2. Capture the baseline

For each page: fetch it, save the HTML text to `/workspace/watchdog/baseline/<slug>.txt`, and screenshot it in the browser to `/workspace/watchdog/baseline/<slug>.png`. Confirm each page's check currently passes — if one already fails, say so now rather than alerting about it at 3am.

## 3. Hourly health check (cron)

Merge into `/workspace/.orgorg/crons.json` (create as `{"crons": []}` if missing; keep existing entries; skip if `watchdog-health-check` already exists):

```json
{
  "id": "watchdog-health-check",
  "freq": "hourly",
  "time": "00:07",
  "enabled": true,
  "prompt": "Website watchdog health check. Read /workspace/apps/website-watchdog/SKILL.md, then /workspace/watchdog/watchlist.md and /workspace/watchdog/state.md. For each page: fetch it, compare status code, the page's stated check, and text content against /workspace/watchdog/baseline/. Screenshot into /workspace/watchdog/latest/. BROKEN (non-200, timeout, or a failed check) => alert immediately in chat with the screenshot linked, what changed, and when it started; then record it in state.md as an open incident and do NOT alert again for it — update the existing incident instead. DRIFT (text changed but the page works) => note it in state.md and mention it at most once a day. RECOVERED => post one line and close the incident. Nothing wrong => end quietly with no message."
}
```

## 4. State file

```bash
[ -f /workspace/watchdog/state.md ] || cp /workspace/apps/website-watchdog/assets/state.md /workspace/watchdog/state.md
```

## 5. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `website-watchdog` is already present):

```json
{
  "appId": "website-watchdog",
  "version": 1,
  "description": "Hourly uptime and content-drift check of key pages with screenshot evidence and one alert per incident.",
  "installedAt": "<ISO timestamp>",
  "files": ["/workspace/apps/website-watchdog/", "/workspace/watchdog/"],
  "crons": ["watchdog-health-check"],
  "artifacts": []
}
```

## 6. Handover

Post a short chat message (~3 sentences) naming the pages you're watching:

> Watchdog is running on <n> pages. Every hour I'll check them and screenshot the result — if something breaks you'll get one alert here with the screenshot and when it started, and I'll keep updating that same thread instead of pinging you hourly. Intentional changes: just tell me "yes I did that" and I'll re-baseline.

Then check off the install task's todos and mark it Done.
