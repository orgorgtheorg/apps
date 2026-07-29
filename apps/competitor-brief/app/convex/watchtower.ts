import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Past this, a second project is a better idea than a wider watchlist.
export const MAX_COMPETITORS = 6;

export const competitors = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("competitors").collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const briefs = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("competitor_briefs").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addCompetitor = mutation({
  args: {
    name: v.string(),
    siteUrl: v.string(),
    pricingUrl: v.optional(v.string()),
    careersUrl: v.optional(v.string()),
    gbpUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("competitors").collect();
    const existing = rows.find(
      (r) => r.name.toLowerCase() === args.name.trim().toLowerCase(),
    );
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { id: existing._id, isNew: false, count: rows.length };
    }
    const id = await ctx.db.insert("competitors", {
      ...args,
      pricePoints: [],
      createdAt: Date.now(),
    });
    return { id, isNew: true, count: rows.length + 1 };
  },
});

export const recordCheck = mutation({
  args: {
    id: v.id("competitors"),
    screenshotPath: v.optional(v.string()),
    pricePoints: v.optional(
      v.array(v.object({ label: v.string(), value: v.string() })),
    ),
    openRoles: v.optional(v.number()),
    hiringSignal: v.optional(v.string()),
    changeSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new Error("Competitor not found");
    }
    const now = Date.now();
    const changed = Boolean(args.changeSummary);
    await ctx.db.patch(args.id, {
      lastCheckedAt: now,
      ...(args.pricePoints ? { pricePoints: args.pricePoints } : {}),
      ...(args.openRoles !== undefined ? { openRoles: args.openRoles } : {}),
      ...(args.hiringSignal !== undefined
        ? { hiringSignal: args.hiringSignal }
        : {}),
      ...(args.screenshotPath
        ? {
            screenshotPath: args.screenshotPath,
            // Keep the previous shot so the brief can show a before/after pair.
            previousScreenshotPath: row.screenshotPath,
          }
        : {}),
      ...(changed
        ? { lastChangeAt: now, lastChangeSummary: args.changeSummary }
        : {}),
    });
  },
});

export const removeCompetitor = mutation({
  args: { id: v.id("competitors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const saveBrief = mutation({
  args: {
    weekOf: v.string(),
    summary: v.string(),
    changeCount: v.number(),
    docId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("competitor_briefs")
      .withIndex("by_weekOf", (q) => q.eq("weekOf", args.weekOf))
      .collect();
    if (rows.length > 0) {
      await ctx.db.patch(rows[0]._id, args);
      return rows[0]._id;
    }
    return await ctx.db.insert("competitor_briefs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
