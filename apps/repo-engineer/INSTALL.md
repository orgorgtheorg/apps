# Install: Repo engineer

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. GitHub access

Verify you can reach the repo (`gh auth status`, `gh repo view <org/name>`). If not, park a NeedsHuman task (reason `Question`) asking which repo and how you should authenticate — do **not** ask for a token in chat, and never write credentials into workspace files. Continue only once the repo is readable.

## 2. Clone into the persistent workspace

```bash
mkdir -p /workspace/repos
cd /workspace/repos && [ -d "<name>" ] || gh repo clone <org/name>
cd /workspace/repos/<name> && git fetch --all --prune && git status --short
```

The clone is persistent — it survives every conversation. Never re-clone over an existing one with local work; fetch instead.

Read the repo's own conventions before touching anything: `README`, `CONTRIBUTING`, `CLAUDE.md`/`AGENTS.md`, and the CI config. Note the test, lint, and dev commands.

## 3. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 4. Backend

```bash
cp /workspace/apps/repo-engineer/app/convex/devTables.ts /workspace/app/convex/
cp /workspace/apps/repo-engineer/app/convex/dev.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { devTables } from "./devTables";
// inside defineSchema({ ... }):
...devTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 5. UI

```bash
cp /workspace/apps/repo-engineer/app/src/DevConsole.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<DevConsole />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id dev-console --kind app --title "Dev" --port 5173 --route / --live
```

Record what you learned in step 2:

```bash
cd /workspace/app && npx convex run dev:setConfig '{"repo":"<org/name>","defaultBranch":"main","clonePath":"/workspace/repos/<name>","testCommand":"<…>","lintCommand":"<…>","devCommand":"<…>"}'
```

Then seed the board with any open PRs and assigned issues via `dev:upsertWork` (state `review` for open PRs, `queued` for issues).

## 6. Verify the toolchain once, now

Install dependencies and run the test suite once so the first real task doesn't discover a broken environment. Record the honest result — if the suite fails on a clean checkout, say so in the handover; don't hide it.

## 7. No cron

Work arrives from the user, not a schedule. Verify you added no cron entry. (A daily PR-status sweep can be added later if they ask.)

## 8. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `repo-engineer` is already present):

```json
{
  "appId": "repo-engineer",
  "version": 1,
  "description": "Dev console over a persistent clone: issues become branches and PRs with tests run and an honest summary. Never force-pushes, never merges.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/repo-engineer/",
    "/workspace/app/convex/dev.ts",
    "/workspace/app/convex/devTables.ts",
    "/workspace/app/src/DevConsole.tsx",
    "/workspace/app/convex/schema.ts (+devTables spread)",
    "/workspace/repos/<name>/"
  ],
  "crons": [],
  "artifacts": ["dev-console"]
}
```

## 9. Handover

Post a short chat message (~3 sentences), including the honest test-suite result from step 6:

> Dev is live — new tab: branches, PRs, CI state, and the queue of what I'm taking. The repo is cloned to my computer and stays there, so context survives between conversations; say "take #142" and I'll branch, work, run the tests, and open a PR with a what/why summary and an honest note on anything I couldn't verify. I never force-push and never merge — that stays yours.

Then check off the install task's todos and mark it Done.
