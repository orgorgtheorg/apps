import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { contractsTables } from './contractsTables';
//   export default defineSchema({ ...contractsTables, /* existing tables */ });

export const contractsTables = {
  contracts: defineTable({
    party: v.string(),
    type: v.string(), // lease, insurance, SaaS, service agreement…
    startAt: v.optional(v.number()),
    renewsAt: v.number(),
    // Days of notice required to stop the renewal.
    noticeDays: v.number(),
    // renewsAt - noticeDays. The promoted date: the one that costs money.
    noticeBy: v.number(),
    autoRenews: v.boolean(),
    monthlyCost: v.optional(v.number()),
    annualCost: v.optional(v.number()),

    // Extraction shows its work: the clause and where it is in the document.
    citation: v.optional(v.string()), // "§14.2, page 9"
    citationQuote: v.optional(v.string()),
    filePath: v.optional(v.string()),

    status: v.union(
      v.literal("active"),
      v.literal("noticeGiven"),
      v.literal("ended"),
      v.literal("needsReview"), // ambiguous clause — parked for a human
    ),
    ambiguityNote: v.optional(v.string()),
    calendarEventId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_noticeBy", ["noticeBy"])
    .index("by_status", ["status"]),
};
