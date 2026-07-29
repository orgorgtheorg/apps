# OrgOrg Apps

The public catalog of installable **apps** for OrgOrg's AI coworkers ([orgorg.com](https://orgorg.com)). An app is a packaged job-to-be-done: install one into a project and its agent gains a concrete capability — "screen my resumes", "chase my invoices", "watch my competitors" — set up on the agent's own computer in minutes.

This repo is the source of truth. On every push to `main`, a GitHub Action validates each manifest and mirrors the catalog (plus the commit sha) into OrgOrg's backend; the marketplace UI renders those rows, and installing an app fetches its folder from this repo **pinned at that sha** — what you see here is byte-for-byte what installs.

## What an app is

One folder under `apps/<id>/`:

```
apps/<id>/
  app.json        # manifest — the only file the platform reads (schema/app.schema.json)
  INSTALL.md      # install brief — the agent follows this literally, once (packaged apps only)
  SKILL.md        # operating contract — governs the agent's behavior from then on
  app/            # optional pre-built artifact app (sandbox-local Convex tables + UI)
  crons/          # optional schedule fragments the install merges into crons.json
  assets/         # optional templates, seeds, reference files
```

- **`app.json`** is deterministic metadata: id, version, copy for the marketplace card (`tagline`/`who`/`how`), category, connector dependencies, setup-time estimate, and what installing adds. Bump `version` on any meaningful change.
- **`INSTALL.md`** must be **idempotent** — installs, retries, and updates all re-run it. It ends by writing an entry to the sandbox ledger (`/workspace/installed_apps.json`) and posting a short handover message in chat.
- **`SKILL.md`** is the ongoing contract: triggers, workflow, rules (draft-only, never fabricate), and how it composes with other installed apps.
- **Artwork is convention, not manifest fields**: `icon.png` (512×512, square — corners are rounded by the UI) and `screenshots/01.png…` are detected by the sync and served as raw URLs pinned at the synced commit. No files = the store renders a generated placeholder tile.
- An app **without** an `INSTALL.md` is manifest-only: it appears in the catalog and the agent sets it up from the manifest's description instead of packaged files. Packaged is better; manifest-only is the honest fallback while packages are being built.

The install mechanic: the platform files a task for the project's agent whose spec says _fetch `apps/<id>` at commit `<sha>`, follow INSTALL.md_. The agent is the installer — it merges into the live workspace (extending existing boards/files instead of duplicating), records what it added in the ledger, and reports back in chat. Uninstall reverses the ledger.

## Contributing / publishing

1. Add or edit a folder under `apps/`.
2. `node scripts/sync.mjs --check` validates every manifest locally.
3. Push to `main` — the Action re-validates and syncs the catalog to the dev and prod deployments (deploy keys are repo secrets scoped to a single internal mutation).

Version history is git history; installs pin a sha, so editing an app never mutates what earlier installs fetched.
