import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { reviewPlatform, reviewStatus } from "./reviewsTables";

export const list = query({
  args: { platform: v.optional(reviewPlatform) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("reviews").collect();
    return rows
      .filter((r) => !args.platform || r.platform === args.platform)
      .sort((a, b) => b.postedAt - a.postedAt);
  },
});

// The agent's work list on a cron wake-up.
export const queue = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("reviews").collect();
    return {
      needsDraft: rows
        .filter((r) => r.status === "new")
        .map((r) => ({
          id: r._id,
          platform: r.platform,
          stars: r.stars,
          author: r.author,
        })),
      approvedToPost: rows
        .filter((r) => r.status === "approved")
        .map((r) => ({ id: r._id, platform: r.platform, url: r.url })),
      waitingOnUser: rows.filter((r) => r.status === "drafted").length,
    };
  },
});

// Rating trajectory: average stars per month, for the monthly digest sparkline.
export const trajectory = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("reviews").collect();
    const byMonth = new Map<string, { sum: number; n: number }>();
    for (const r of rows) {
      const key = new Date(r.postedAt).toISOString().slice(0, 7);
      const cur = byMonth.get(key) ?? { sum: 0, n: 0 };
      byMonth.set(key, { sum: cur.sum + r.stars, n: cur.n + 1 });
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, n }]) => ({
        month,
        count: n,
        average: Math.round((sum / n) * 10) / 10,
      }));
  },
});

// Insert or refresh — a re-fetch of the same review must never duplicate it.
export const upsert = mutation({
  args: {
    platform: reviewPlatform,
    externalId: v.string(),
    author: v.string(),
    stars: v.number(),
    text: v.string(),
    postedAt: v.number(),
    url: v.optional(v.string()),
    likelyFiltered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_platform_and_externalId", (q) =>
        q.eq("platform", args.platform).eq("externalId", args.externalId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, fetchedAt: now });
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("reviews", {
      ...args,
      status: "new",
      fetchedAt: now,
    });
    return { id, isNew: true };
  },
});

export const setDraft = mutation({
  args: {
    id: v.id("reviews"),
    draft: v.string(),
    replyAdvice: v.optional(v.string()),
    escalated: v.optional(v.boolean()),
    internalQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, status: "drafted" });
  },
});

export const setStatus = mutation({
  args: { id: v.id("reviews"), status: reviewStatus },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "posted" ? { postedReplyAt: Date.now() } : {}),
    });
  },
});

export const editDraft = mutation({
  args: { id: v.id("reviews"), draft: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { draft: args.draft });
  },
});
