import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { triageTables } from './triageTables';
//   export default defineSchema({ ...triageTables, /* existing tables */ });

export const triageBucket = v.union(
  v.literal("needsYou"), // a human decision, draft waiting
  v.literal("handled"), // routine; replied or ready to reply
  v.literal("fyi"), // categorized and quiet
);

export const triageStatus = v.union(
  v.literal("new"),
  v.literal("drafted"),
  v.literal("approved"), // user approved the draft — agent sends
  v.literal("sent"),
  v.literal("archived"),
);

export const triageTables = {
  triage_emails: defineTable({
    threadId: v.string(), // stable per-thread id — one row per thread
    from: v.string(),
    fromEmail: v.optional(v.string()),
    subject: v.string(),
    snippet: v.string(),
    receivedAt: v.number(),

    category: v.string(), // from the user's own rule set
    bucket: triageBucket,
    // Always present: "why is this in Needs-you?" must have a one-line answer.
    reason: v.string(),

    status: triageStatus,
    draft: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_bucket", ["bucket"])
    .index("by_threadId", ["threadId"]),

  // The category rules, visible and editable — never a black box.
  triage_rules: defineTable({
    name: v.string(), // "Invoices", "Newsletters", "Client work"
    // Plain-language matcher the agent applies: senders, subjects, phrases.
    matches: v.array(v.string()),
    bucket: triageBucket,
    // Per-category send permission. Off unless the user explicitly turns it on.
    autoSend: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),
};
