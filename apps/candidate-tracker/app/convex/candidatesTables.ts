import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { candidatesTables } from './candidatesTables';
//   export default defineSchema({ ...candidatesTables, /* existing tables */ });
export const candidateStage = v.union(
  v.literal("applied"),
  v.literal("screening"),
  v.literal("interview"),
  v.literal("offer"),
  v.literal("hired"),
  v.literal("rejected"),
);

export const candidatesTables = {
  candidates: defineTable({
    name: v.string(),
    role: v.string(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    stage: candidateStage,
    notes: v.array(v.object({ text: v.string(), at: v.number() })),
    createdAt: v.number(),
    // Bumped by every mutation — the staleness signal the daily cron reads.
    lastTouchedAt: v.number(),
  }).index("by_stage", ["stage"]),
};
