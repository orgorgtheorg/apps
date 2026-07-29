# Install: Website editor

Idempotent — safe to re-run for a retry or an update. You are the installer: merge into the workspace as it actually is; never create a duplicate of something that already exists.

## 1. Is there a site already?

Ask **one** question and wait: does the user have a site today (URL), and do they want to (a) rebuild it here, or (b) start fresh? If they have one, fetch it and keep its content and copy — never lose their existing text.

## 2. Site source + preview

```bash
mkdir -p /workspace/site
```

Scaffold or import the site into `/workspace/site` and run it locally. Note the preview port. The preview is the sandbox; it is not public.

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
cp /workspace/apps/website-editor/app/convex/siteTables.ts /workspace/app/convex/
cp /workspace/apps/website-editor/app/convex/site.ts /workspace/app/convex/
```

Add to `/workspace/app/convex/schema.ts`:

```ts
import { siteTables } from "./siteTables";
// inside defineSchema({ ... }):
...siteTables,
```

```bash
cd /workspace/app && npx convex deploy --typecheck disable
```

## 5. UI

```bash
cp /workspace/apps/website-editor/app/src/SiteEditor.tsx /workspace/app/src/
```

Fresh app → `App.tsx` renders `<SiteEditor />`; existing app → add it as a tab/section.

```bash
orgorg-artifact add --id site-editor --kind app --title "Site" --port 5173 --route / --live
```

Then record the config so the preview pane has something to show:

```bash
cd /workspace/app && npx convex run site:setConfig '{"previewUrl":"http://localhost:<preview port>","sourceDir":"/workspace/site"}'
```

```bash
mkdir -p /workspace/app/public/site-shots
```

Record the imported/scaffolded state as v1 with `site:recordVersion`, screenshotting it into `/workspace/app/public/site-shots/v1.png` and passing `screenshotPath` as the web path `/site-shots/v1.png`.

## 6. Publishing target (ask, don't assume)

Ask where publishing should go: their existing host, a platform-managed host, or "decide later". Write the answer into `/workspace/site/PUBLISHING.md` using `assets/publishing.md` as the shape, including who owns the domain and DNS. **Do not connect, deploy, or change DNS during install** — publishing is always a separate, confirmed action.

## 7. No cron

Editing is conversational. Verify you added no cron entry.

## 8. Ledger

Append to `/workspace/installed_apps.json` (create as `{"apps": []}` if missing; update the existing entry instead of appending if `website-editor` is already present):

```json
{
  "appId": "website-editor",
  "version": 1,
  "description": "Site editor: live sandbox preview beside a version log; publish and rollback are explicit, confirmed actions.",
  "installedAt": "<ISO timestamp>",
  "files": [
    "/workspace/apps/website-editor/",
    "/workspace/app/convex/site.ts",
    "/workspace/app/convex/siteTables.ts",
    "/workspace/app/src/SiteEditor.tsx",
    "/workspace/app/convex/schema.ts (+siteTables spread)",
    "/workspace/site/",
    "/workspace/app/public/site-shots/"
  ],
  "crons": [],
  "artifacts": ["site-editor"]
}
```

## 9. Handover

Post a short chat message (~3 sentences):

> Site is live — new tab: the preview on the left is your real site running on my computer, the change log on the right is every version. Describe what you want in plain words ("move the phone number to the top, add a reviews section") and the preview updates while we talk; nothing is public until you say publish, and I'll tell you in plain words what the publish changes first. Any version in the log can be restored with one sentence.

Then check off the install task's todos and mark it Done.
