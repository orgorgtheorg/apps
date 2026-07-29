import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { prospectsTables } from './prospectsTables';
//   export default defineSchema({ ...prospectsTables, /* existing tables */ });

export const prospectStatus = v.union(
  v.literal("pending"), // imported, not researched yet
  v.literal("enriching"), // the agent is on this row right now
  v.literal("done"),
  v.literal("unverified"), // researched, but couldn't confirm — stated honestly
);

// A researched value plus where it came from. No source => the UI shows it as
// unverified; the agent is never allowed to fill one of these from memory.
const sourced = v.object({
  value: v.string(),
  sourceUrl: v.optional(v.string()),
});

export const prospectsTables = {
  prospects: defineTable({
    // As imported — never overwritten by research.
    rawName: v.string(),
    rawCompany: v.optional(v.string()),
    rawEmail: v.optional(v.string()),
    batch: v.string(), // the CSV/import this row came from

    // Researched.
    company: v.optional(sourced),
    title: v.optional(sourced),
    linkedin: v.optional(sourced),
    news: v.optional(sourced), // one recent, dated fact
    email: v.optional(sourced),

    fitScore: v.optional(v.number()), // 1–10
    fitReason: v.optional(v.string()), // one line, always present when scored
    confidence: v.optional(v.number()), // 0–1, drives the dot in the grid

    status: prospectStatus,
    researchSeconds: v.optional(v.number()),
    enrichedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_batch", ["batch"]),
};
