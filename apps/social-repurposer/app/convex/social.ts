import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { socialPlatform, variantStatus } from "./socialTables";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("social_posts").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// What the agent should act on, plus the gaps that make the calendar strip useful.
export const queue = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("social_posts").collect();
    const approved: {
      id: string;
      platform: string;
      body: string;
      imagePath?: string;
    }[] = [];
    for (const row of rows) {
      for (const variant of row.variants) {
        if (variant.status === "approved") {
          approved.push({
            id: row._id,
            platform: variant.platform,
            body: variant.body,
            imagePath: row.imagePath,
          });
        }
      }
    }
    const weekAgo = Date.now() - 7 * 86_400_000;
    const postedThisWeek = rows.flatMap((r) =>
      r.variants.filter(
        (variant) =>
          variant.status === "posted" && (variant.postedAt ?? 0) >= weekAgo,
      ),
    ).length;
    return {
      approved,
      drafts: rows.filter((r) =>
        r.variants.some((variant) => variant.status === "draft"),
      ).length,
      postedThisWeek,
    };
  },
});

export const create = mutation({
  args: {
    source: v.string(),
    imagePath: v.optional(v.string()),
    topic: v.optional(v.string()),
    variants: v.array(
      v.object({
        platform: socialPlatform,
        body: v.string(),
        hashtags: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("social_posts", {
      source: args.source.trim(),
      imagePath: args.imagePath,
      topic: args.topic,
      variants: args.variants.map((variant) => ({
        ...variant,
        status: "draft" as const,
      })),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const editVariant = mutation({
  args: {
    id: v.id("social_posts"),
    platform: socialPlatform,
    body: v.optional(v.string()),
    hashtags: v.optional(v.string()),
    status: v.optional(variantStatus),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("Post not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      updatedAt: now,
      variants: post.variants.map((variant) =>
        variant.platform === args.platform
          ? {
              ...variant,
              ...(args.body !== undefined ? { body: args.body } : {}),
              ...(args.hashtags !== undefined
                ? { hashtags: args.hashtags }
                : {}),
              ...(args.status !== undefined ? { status: args.status } : {}),
              ...(args.status === "posted" ? { postedAt: now } : {}),
            }
          : variant,
      ),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("social_posts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
