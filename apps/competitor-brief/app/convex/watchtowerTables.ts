import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { watchtowerTables } from './watchtowerTables';
//   export default defineSchema({ ...watchtowerTables, /* existing tables */ });

export const watchtowerTables = {
  competitors: defineTable({
    name: v.string(),
    siteUrl: v.string(),
    pricingUrl: v.optional(v.string()),
    careersUrl: v.optional(v.string()),
    gbpUrl: v.optional(v.string()),

    // Web path to the latest screenshot, served by the app itself:
    // the file lives at /workspace/app/public/watchtower/<slug>/<date>.png and
    // this field holds "/watchtower/<slug>/<date>.png" so the grid can show it.
    screenshotPath: v.optional(v.string()),
    previousScreenshotPath: v.optional(v.string()),

    // Extracted, with the page they came from — never inferred.
    pricePoints: v.array(v.object({ label: v.string(), value: v.string() })),
    openRoles: v.optional(v.number()),
    // Inference is always labeled as inference in the UI.
    hiringSignal: v.optional(v.string()),

    lastCheckedAt: v.optional(v.number()),
    lastChangeAt: v.optional(v.number()),
    lastChangeSummary: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // One row per weekly brief; body lives in a doc artifact, the row is the archive.
  competitor_briefs: defineTable({
    weekOf: v.string(), // "2026-07-27"
    docId: v.optional(v.string()),
    summary: v.string(), // the one-line honest version, padding forbidden
    changeCount: v.number(),
    createdAt: v.number(),
  }).index("by_weekOf", ["weekOf"]),
};
