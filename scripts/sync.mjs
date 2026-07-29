// Validate every apps/<id>/app.json and mirror the catalog into a Convex
// deployment (agentInfra/appCatalog:syncCatalog). Dependency-free on purpose:
// validation is hand-rolled against the same rules as schema/app.schema.json
// so CI needs nothing beyond node + the convex CLI.
//
//   node scripts/sync.mjs --check          validate only
//   CONVEX_DEPLOY_KEY=… node scripts/sync.mjs   validate + sync
//
// Repo + sha come from GitHub Actions env (GITHUB_REPOSITORY / GITHUB_SHA)
// with git fallbacks for local runs.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CATEGORIES = new Set(["growth", "operations", "build", "general"]);
const APPS_DIR = "apps";

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exitCode = 1;
}

function validate(id, m) {
  const ctx = `apps/${id}/app.json`;
  if (m.appId !== id)
    fail(`${ctx}: appId "${m.appId}" must equal folder name "${id}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(m.appId ?? "")))
    fail(`${ctx}: bad appId`);
  if (!Number.isInteger(m.version) || m.version < 1)
    fail(`${ctx}: version must be a positive integer`);
  for (const key of ["name", "tagline", "who", "how"]) {
    if (typeof m[key] !== "string" || m[key].length === 0)
      fail(`${ctx}: missing ${key}`);
  }
  if (m.tagline && m.tagline.length > 140) fail(`${ctx}: tagline > 140 chars`);
  if (!CATEGORIES.has(m.category))
    fail(`${ctx}: category must be one of ${[...CATEGORIES].join("/")}`);
  if (m.accent !== undefined && typeof m.accent !== "string")
    fail(`${ctx}: accent must be a string`);
  if (!Array.isArray(m.connectors)) fail(`${ctx}: connectors must be an array`);
  for (const c of m.connectors ?? []) {
    if (
      typeof c.id !== "string" ||
      typeof c.label !== "string" ||
      typeof c.required !== "boolean"
    ) {
      fail(`${ctx}: connector entries need {id, label, required}`);
    }
  }
  const sm = m.setupMinutes;
  if (
    !sm ||
    !Number.isInteger(sm.min) ||
    !Number.isInteger(sm.max) ||
    sm.min < 1 ||
    sm.max < sm.min
  ) {
    fail(`${ctx}: setupMinutes needs integer {min, max} with 1 <= min <= max`);
  }
  if (!m.adds || !Array.isArray(m.adds.crons) || !Array.isArray(m.adds.apps)) {
    fail(`${ctx}: adds needs {crons: [], apps: []}`);
  }
  const allowed = new Set([
    "appId",
    "version",
    "name",
    "tagline",
    "who",
    "how",
    "category",
    "accent",
    "connectors",
    "setupMinutes",
    "adds",
  ]);
  for (const key of Object.keys(m)) {
    if (!allowed.has(key)) fail(`${ctx}: unknown key "${key}"`);
  }
}

const ids = readdirSync(APPS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const apps = [];
for (const id of ids) {
  const manifestPath = join(APPS_DIR, id, "app.json");
  if (!existsSync(manifestPath)) {
    fail(`apps/${id}/ has no app.json`);
    continue;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    fail(`${manifestPath}: invalid JSON — ${err.message}`);
    continue;
  }
  validate(id, manifest);
  const packaged = existsSync(join(APPS_DIR, id, "INSTALL.md"));
  if (packaged && !existsSync(join(APPS_DIR, id, "SKILL.md"))) {
    fail(`apps/${id}/ is packaged (has INSTALL.md) but has no SKILL.md`);
  }
  // Artwork is convention, not manifest fields: icon.png + screenshots/*.
  // Relative paths here; the sync phase turns them into raw.githubusercontent
  // URLs pinned at the synced commit.
  const iconPath = existsSync(join(APPS_DIR, id, "icon.png"))
    ? `apps/${id}/icon.png`
    : null;
  const shotsDir = join(APPS_DIR, id, "screenshots");
  const screenshotPaths = existsSync(shotsDir)
    ? readdirSync(shotsDir)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .sort()
        .map((f) => `apps/${id}/screenshots/${f}`)
    : [];
  apps.push({ ...manifest, packaged, iconPath, screenshotPaths });
}

if (process.exitCode) {
  console.error("Validation failed — not syncing.");
  process.exit(1);
}
console.log(
  `✔ ${apps.length} manifests valid (${apps.filter((a) => a.packaged).length} packaged, ${apps.filter((a) => a.iconPath).length} with icons)`,
);

if (process.argv.includes("--check")) {
  process.exit(0);
}

if (!process.env.CONVEX_DEPLOY_KEY) {
  console.log("CONVEX_DEPLOY_KEY not set — skipping sync.");
  process.exit(0);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const repo =
  process.env.GITHUB_REPOSITORY ??
  git("remote", "get-url", "origin")
    .replace(/^.*github\.com[:/]/, "")
    .replace(/\.git$/, "");
const commitSha = process.env.GITHUB_SHA ?? git("rev-parse", "HEAD");

const raw = (path) =>
  `https://raw.githubusercontent.com/${repo}/${commitSha}/${path}`;
const payloadApps = apps.map(({ iconPath, screenshotPaths, ...app }) => ({
  ...app,
  ...(iconPath ? { iconUrl: raw(iconPath) } : {}),
  ...(screenshotPaths.length > 0
    ? { screenshotUrls: screenshotPaths.map(raw) }
    : {}),
}));
const payload = JSON.stringify({ repo, commitSha, apps: payloadApps });
console.log(
  `Syncing ${apps.length} apps @ ${commitSha.slice(0, 10)} (${repo})…`,
);
const out = execFileSync(
  "npx",
  [
    "--yes",
    "convex@latest",
    "run",
    "agentInfra/appCatalog:syncCatalog",
    payload,
  ],
  { encoding: "utf8" },
);
console.log(out.trim());
console.log("✔ synced");
