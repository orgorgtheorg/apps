import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { closeTables } from './closeTables';
//   export default defineSchema({ ...closeTables, /* existing tables */ });

export const closeTables = {
  // One row per month — the close checklist grid.
  close_months: defineTable({
    month: v.string(), // "2026-07"
    transactions: v.number(),
    categorized: v.number(),
    receiptsExpected: v.number(),
    receiptsMatched: v.number(),
    // Things the accountant needs to answer; each is a real question, not a count.
    flags: v.array(
      v.object({
        text: v.string(),
        merchant: v.optional(v.string()),
        date: v.optional(v.string()),
        amount: v.optional(v.number()),
        resolved: v.boolean(),
      }),
    ),
    closedAt: v.optional(v.number()),
    docPath: v.optional(v.string()), // the accountant-ready doc
    updatedAt: v.number(),
  }).index("by_month", ["month"]),

  // Learned categorization rules. A correction lands here once and holds forever.
  close_rules: defineTable({
    // Matched against the transaction descriptor, case-insensitive substring.
    match: v.string(),
    category: v.string(),
    // "user" rules came from a correction and outrank "agent" guesses.
    origin: v.union(v.literal("user"), v.literal("agent")),
    note: v.optional(v.string()),
    createdAt: v.number(),
    lastAppliedAt: v.optional(v.number()),
    timesApplied: v.number(),
  }).index("by_match", ["match"]),
};
