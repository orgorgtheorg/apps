import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { reviewsTables } from './reviewsTables';
//   export default defineSchema({ ...reviewsTables, /* existing tables */ });
//
// Shared by google-review-responder and yelp-review-responder — one queue, one
// table, `platform` tells them apart. Install this file only once.

export const reviewPlatform = v.union(
  v.literal("google"),
  v.literal("yelp"),
  v.literal("facebook"),
  v.literal("other"),
);

export const reviewStatus = v.union(
  v.literal("new"), // fetched, nothing drafted
  v.literal("drafted"), // reply written, waiting on the user
  v.literal("approved"), // user approved — the agent posts on its next run
  v.literal("posted"),
  v.literal("skipped"), // deliberately not replying
);

export const reviewsTables = {
  reviews: defineTable({
    platform: reviewPlatform,
    // Stable per-platform id so a re-fetch updates instead of duplicating.
    externalId: v.string(),
    author: v.string(),
    stars: v.number(),
    text: v.string(),
    postedAt: v.number(),
    url: v.optional(v.string()),

    status: reviewStatus,
    draft: v.optional(v.string()),
    // Yelp especially: sometimes the right move is to say nothing, and the app
    // should say so rather than manufacture a reply.
    replyAdvice: v.optional(v.string()),
    // Set when the review looks like it may be filtered/not-recommended.
    likelyFiltered: v.optional(v.boolean()),
    escalated: v.optional(v.boolean()), // 1-star service-recovery path
    internalQuestion: v.optional(v.string()), // "what happened here?"

    fetchedAt: v.number(),
    postedReplyAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_platform_and_externalId", ["platform", "externalId"]),
};
