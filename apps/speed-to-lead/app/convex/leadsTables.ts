import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { leadsTables } from './leadsTables';
//   export default defineSchema({ ...leadsTables, /* existing tables */ });

export const leadIntent = v.union(
  v.literal("quote"), // wants a price / a job done
  v.literal("question"), // information only
  v.literal("booking"), // wants to schedule
  v.literal("complaint"), // unhappy — never auto-send
  v.literal("spam"),
  v.literal("other"),
);

export const leadStatus = v.union(
  v.literal("new"), // arrived, nothing drafted yet
  v.literal("drafted"), // agent wrote a reply, waiting on the user
  v.literal("approved"), // user approved — the agent sends on its next run
  v.literal("answered"), // reply is out the door
  v.literal("held"), // deliberately parked (needs a human decision)
  v.literal("closed"), // spam, duplicate, or resolved elsewhere
);

export const leadsTables = {
  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.string(), // "website form", "Gmail", "Yelp message"…
    subject: v.optional(v.string()),
    excerpt: v.string(), // first line(s) of what they actually wrote
    intent: leadIntent,
    status: leadStatus,
    // Response-time clock: the whole point of the app.
    arrivedAt: v.number(),
    answeredAt: v.optional(v.number()),
    // Signals that mention budget or timeline — worth an SMS.
    hot: v.boolean(),
    hotReason: v.optional(v.string()),
    draft: v.optional(v.string()),
    notes: v.array(v.object({ text: v.string(), at: v.number() })),
    lastTouchedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_arrivedAt", ["arrivedAt"]),
};
