import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { priceBookTables } from './priceBookTables';
//   export default defineSchema({ ...priceBookTables, /* existing tables */ });

export const priceBookTables = {
  // The user's rates. The agent reads these to build quotes and never invents
  // a rate that isn't here.
  price_items: defineTable({
    name: v.string(),
    unit: v.string(), // "per visit", "per acre", "hourly", "flat"
    rate: v.number(),
    // Below this, the agent whispers a margin warning instead of staying quiet.
    floorRate: v.optional(v.number()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Rates go stale; the agent nags seasonally using this.
    updatedAt: v.number(),
  }).index("by_category", ["category"]),

  // Standing terms and attachments that go on every proposal.
  proposal_terms: defineTable({
    key: v.string(), // "payment", "cancellation", "insurance", "validity"
    body: v.string(),
    attachmentPath: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  quotes: defineTable({
    client: v.string(),
    title: v.string(),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("won"),
      v.literal("lost"),
    ),
    lines: v.array(
      v.object({
        label: v.string(),
        unit: v.string(),
        quantity: v.number(),
        rate: v.number(),
        // Set when the line came from a price_items row, so edits can be traced.
        priceItemName: v.optional(v.string()),
      }),
    ),
    total: v.number(),
    // The judgment calls the agent made, surfaced to the user every time.
    assumptions: v.array(v.string()),
    marginFlag: v.optional(v.string()),
    pdfPath: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["client"]),
};
