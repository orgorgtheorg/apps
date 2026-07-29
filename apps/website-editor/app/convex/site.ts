import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const config = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("site_config")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique(),
});

export const versions = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("site_versions").collect();
    return rows.sort((a, b) => b.number - a.number);
  },
});

export const live = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("site_versions").collect();
    const published = rows
      .filter((v) => v.status === "published")
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    return published[0] ?? null;
  },
});

export const setConfig = mutation({
  args: {
    previewUrl: v.string(),
    sourceDir: v.string(),
    liveUrl: v.optional(v.string()),
    host: v.optional(v.string()),
    domain: v.optional(v.string()),
    dnsOk: v.optional(v.boolean()),
    certOk: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("site_config")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("site_config", {
      key: "site",
      ...args,
      updatedAt: now,
    });
  },
});

export const recordVersion = mutation({
  args: {
    summary: v.string(),
    plainDiff: v.array(v.string()),
    changedFiles: v.array(v.string()),
    screenshotPath: v.optional(v.string()),
    restoredFrom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("site_versions").collect();
    const number =
      rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.number)) + 1;
    return await ctx.db.insert("site_versions", {
      ...args,
      number,
      status: "preview",
      createdAt: Date.now(),
    });
  },
});

// Marks a version live and supersedes the previously published one. The agent
// calls this only AFTER the real deploy succeeded.
export const markPublished = mutation({
  args: { number: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("site_versions").collect();
    const target = rows.find((r) => r.number === args.number);
    if (!target) {
      throw new Error(`No version v${args.number}`);
    }
    const now = Date.now();
    for (const row of rows) {
      if (row.status === "published" && row._id !== target._id) {
        await ctx.db.patch(row._id, { status: "superseded" });
      }
    }
    await ctx.db.patch(target._id, { status: "published", publishedAt: now });
  },
});

export const markRolledBack = mutation({
  args: { number: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("site_versions").collect();
    const target = rows.find((r) => r.number === args.number);
    if (!target) {
      throw new Error(`No version v${args.number}`);
    }
    await ctx.db.patch(target._id, { status: "rolledBack" });
  },
});
