# Candidate tracker — install

You are installing the **candidate-tracker** skill. This package was unzipped
to `/workspace/apps/candidate-tracker/`. Follow these steps in order; every
step is idempotent, so re-running after a partial install is safe. Check off
the matching todo on your install task as you complete each stage.

## 1. Start the app services

```bash
/usr/local/bin/start-convex
/usr/local/bin/start-app
```

Both no-op if already running. `start-app` copies the starter to
`/workspace/app` if this project has no app yet — note whether the app was
**fresh** or **already existed**; step 4 differs.

Make sure `/workspace/app/.env.local` exists (see the `custom-app` skill if
not):

```bash
[ -f /workspace/app/.env.local ] || cat > /workspace/app/.env.local <<EOF
CONVEX_SELF_HOSTED_URL=http://localhost:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /opt/convex/admin_key.txt)
EOF
```

## 2. Install the backend

```bash
cp /workspace/apps/candidate-tracker/app/convex/candidatesTables.ts /workspace/app/convex/
cp /workspace/apps/candidate-tracker/app/convex/candidates.ts /workspace/app/convex/
```

Then edit `/workspace/app/convex/schema.ts` to include the tables:

```ts
import { candidatesTables } from './candidatesTables';
// inside defineSchema({ ... }):
  ...candidatesTables,
```

Deploy:

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 3. Install the UI

```bash
cp /workspace/apps/candidate-tracker/app/src/CandidateBoard.tsx /workspace/app/src/
```

- **Fresh app** (starter untouched): replace the body of
  `/workspace/app/src/App.tsx` with:

  ```tsx
  import CandidateBoard from "./CandidateBoard";
  export default function App() {
    return <CandidateBoard />;
  }
  ```

- **Existing app**: integrate `<CandidateBoard />` without breaking what's
  there — add a simple tab/section switcher in `App.tsx`. Do not duplicate an
  existing candidates/hiring surface; if one exists, merge intent and prefer
  the existing data, extending it rather than shipping a second tracker.

Check `/tmp/app-dev.log` for compile errors before continuing.

## 4. Register the artifact

```bash
orgorg-artifact add --id candidate-board --kind app --title "Candidates" --port 5173 --route / --live
```

If the app already had a registered artifact and you mounted the board behind
a tab, keep the existing entry and just make sure the board is reachable.

## 5. Add the staleness cron

Merge this entry into `/workspace/.orgorg/crons.json` (create the file with
`{"crons": []}` if missing; keep existing entries; skip if an entry with id
`candidate-staleness` already exists):

```json
{
  "id": "candidate-staleness",
  "freq": "daily",
  "time": "09:00",
  "enabled": true,
  "prompt": "Candidate-tracker staleness sweep. Run `cd /workspace/app && npx convex run candidates:stale` to list active candidates untouched for 3+ days. If none, do nothing and end quietly. If any: post one short chat message listing each stale candidate (name, role, days idle, current stage) with a concrete suggested next action each (e.g. a drafted nudge email or a schedule-the-interview reminder). Do not modify candidates yourself unless the user asks."
}
```

## 6. Record the install

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing). Update the existing entry instead of appending if `candidate-tracker` is already present:

```json
{
  "appId": "candidate-tracker",
  "version": 1,
  "description": "Hiring pipeline board with a daily staleness sweep that nags before candidates go cold.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/candidate-tracker/",
    "/workspace/app/convex/candidates.ts",
    "/workspace/app/convex/candidatesTables.ts",
    "/workspace/app/src/CandidateBoard.tsx",
    "/workspace/app/convex/schema.ts (+candidatesTables spread)"
  ],
  "crons": ["candidate-staleness"],
  "artifacts": ["candidate-board"]
}
```

## 7. Hand over

Post a short chat summary: the Candidates tab is live, how to add candidates
(in the app, or by dropping resumes / forwarding emails and asking you), and
that a daily 9:00 staleness sweep now flags anyone idle 3+ days. Read
`/workspace/apps/candidate-tracker/SKILL.md` — it governs how you operate
this app from now on.
