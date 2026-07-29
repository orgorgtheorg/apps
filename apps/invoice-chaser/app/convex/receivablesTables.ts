import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { receivablesTables } from './receivablesTables';
//   export default defineSchema({ ...receivablesTables, /* existing tables */ });

export const invoiceStatus = v.union(
  v.literal("open"),
  v.literal("promised"), // they said they'd pay by a date — chasing pauses
  v.literal("disputed"), // frozen: never chase a disputed invoice
  v.literal("paid"),
  v.literal("writtenOff"),
);

// The politeness gradient, visible and editable rather than hidden in prompts.
export const chaseTone = v.union(
  v.literal("gentle"),
  v.literal("direct"),
  v.literal("firm"),
  v.literal("phoneCall"), // stop emailing; this one needs a human voice
);

export const receivablesTables = {
  invoices: defineTable({
    client: v.string(),
    email: v.optional(v.string()),
    number: v.string(),
    amount: v.number(),
    issuedAt: v.number(),
    dueAt: v.number(),
    status: invoiceStatus,

    // Per-client override of the global auto-send setting.
    autoSend: v.optional(v.boolean()),
    promisedFor: v.optional(v.number()), // honored: no chasing before this date
    disputeNote: v.optional(v.string()),

    chases: v.array(
      v.object({
        at: v.number(),
        tone: chaseTone,
        sent: v.boolean(), // false = drafted only
        note: v.optional(v.string()),
      }),
    ),
    nextDraft: v.optional(v.string()),
    nextTone: v.optional(chaseTone),

    paidAt: v.optional(v.number()),
    source: v.optional(v.string()), // "QuickBooks", "dropped sheet", "manual"
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_client", ["client"]),
};
