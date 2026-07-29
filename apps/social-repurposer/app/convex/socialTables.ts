import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { socialTables } from './socialTables';
//   export default defineSchema({ ...socialTables, /* existing tables */ });

export const socialPlatform = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("gbp"), // Google Business Profile post
);

export const variantStatus = v.union(
  v.literal("draft"),
  v.literal("approved"), // the agent may post it (browser) on its next run
  v.literal("posted"),
  v.literal("copied"), // user took the text and posted it themselves
  v.literal("skipped"),
);

export const socialTables = {
  // One row per INPUT (a photo, a sentence, a job that finished). The variants
  // fan out from it — which is what stops the same input being posted twice to
  // one platform.
  social_posts: defineTable({
    source: v.string(), // what the user gave you, verbatim
    imagePath: v.optional(v.string()), // /workspace/... path, if any
    topic: v.optional(v.string()), // drives remembered hashtag sets
    variants: v.array(
      v.object({
        platform: socialPlatform,
        body: v.string(),
        hashtags: v.optional(v.string()),
        status: variantStatus,
        postedAt: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
};
