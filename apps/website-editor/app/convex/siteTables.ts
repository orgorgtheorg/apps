import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { siteTables } from './siteTables';
//   export default defineSchema({ ...siteTables, /* existing tables */ });

export const siteTables = {
  // One row per meaningful edit. Versions are append-only: rollback creates a
  // new version that restores an old one rather than deleting history.
  site_versions: defineTable({
    number: v.number(), // v1, v2, … monotonic
    summary: v.string(), // plain words: "new menu page"
    // What actually changed, for the publish confirmation.
    plainDiff: v.array(v.string()),
    changedFiles: v.array(v.string()),
    // Web path under the app's public/ dir, e.g. "/site-shots/v14.png".
    screenshotPath: v.optional(v.string()),
    status: v.union(
      v.literal("preview"),
      v.literal("published"),
      v.literal("superseded"),
      v.literal("rolledBack"),
    ),
    restoredFrom: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_number", ["number"]),

  // Single row, keyed "site".
  site_config: defineTable({
    key: v.string(),
    // Where the preview runs in the sandbox (the Vite/dev server).
    previewUrl: v.string(),
    liveUrl: v.optional(v.string()),
    host: v.optional(v.string()), // "vercel" | "cloudflare" | …
    domain: v.optional(v.string()),
    dnsOk: v.optional(v.boolean()),
    certOk: v.optional(v.boolean()),
    sourceDir: v.string(), // /workspace/site
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
};
