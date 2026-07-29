import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { solicitationsTables } from './solicitationsTables';
//   export default defineSchema({ ...solicitationsTables, /* existing tables */ });

export const solicitationDecision = v.union(
  v.literal("new"),
  v.literal("go"),
  v.literal("noGo"),
  v.literal("submitted"),
  v.literal("won"),
  v.literal("lost"),
);

export const solicitationsTables = {
  solicitations: defineTable({
    // Portal id (SAM notice id, state portal number) — dedupes the daily sweep.
    externalId: v.string(),
    source: v.string(), // "SAM.gov", "CA eProcure"…
    agency: v.string(),
    title: v.string(),
    url: v.string(),
    dueAt: v.number(),
    estimatedValue: v.optional(v.string()),
    naics: v.optional(v.string()),
    setAside: v.optional(v.string()),
    summary: v.string(),

    // Scored against the capabilities profile, and it must explain itself.
    fitScore: v.number(), // 1–10
    fitReasons: v.array(v.string()),
    recommendation: v.string(), // go / no-go, with the why
    decision: solicitationDecision,

    // Set when drafting starts.
    responseDocPath: v.optional(v.string()),
    reusedFrom: v.optional(v.string()), // "Similar to the March bid — 60% reusable"
    outcomeNote: v.optional(v.string()),

    foundAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_decision", ["decision"])
    .index("by_dueAt", ["dueAt"]),
};
