import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const months = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("close_months").collect();
    return rows.sort((a, b) => b.month.localeCompare(a.month));
  },
});

export const rules = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("close_rules").collect();
    return rows.sort((a, b) => b.timesApplied - a.timesApplied);
  },
});

// Rules the agent applies before asking the user anything.
export const activeRules = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("close_rules").collect();
    return rows
      .sort((a, b) => (a.origin === "user" ? -1 : 1))
      .map((r) => ({ match: r.match, category: r.category, origin: r.origin }));
  },
});

export const upsertMonth = mutation({
  args: {
    month: v.string(),
    transactions: v.number(),
    categorized: v.number(),
    receiptsExpected: v.number(),
    receiptsMatched: v.number(),
    docPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("close_months")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("close_months", {
      ...args,
      flags: [],
      updatedAt: now,
    });
  },
});

export const setFlags = mutation({
  args: {
    month: v.string(),
    flags: v.array(
      v.object({
        text: v.string(),
        merchant: v.optional(v.string()),
        date: v.optional(v.string()),
        amount: v.optional(v.number()),
        resolved: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("close_months")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .unique();
    if (!row) {
      throw new Error(`No close row for ${args.month}`);
    }
    await ctx.db.patch(row._id, {
      flags: args.flags,
      updatedAt: Date.now(),
    });
  },
});

export const resolveFlag = mutation({
  args: { month: v.string(), index: v.number(), resolved: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("close_months")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .unique();
    if (!row) {
      throw new Error(`No close row for ${args.month}`);
    }
    await ctx.db.patch(row._id, {
      flags: row.flags.map((f, i) =>
        i === args.index ? { ...f, resolved: args.resolved } : f,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const closeMonth = mutation({
  args: { month: v.string(), docPath: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("close_months")
      .withIndex("by_month", (q) => q.eq("month", args.month))
      .unique();
    if (!row) {
      throw new Error(`No close row for ${args.month}`);
    }
    await ctx.db.patch(row._id, {
      closedAt: Date.now(),
      ...(args.docPath ? { docPath: args.docPath } : {}),
      updatedAt: Date.now(),
    });
  },
});

// A correction lands here once and holds forever — that stickiness is the app.
export const learnRule = mutation({
  args: {
    match: v.string(),
    category: v.string(),
    origin: v.union(v.literal("user"), v.literal("agent")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("close_rules").collect();
    const existing = rows.find(
      (r) => r.match.toLowerCase() === args.match.trim().toLowerCase(),
    );
    if (existing) {
      // A user correction always overrides an agent guess.
      if (existing.origin === "user" && args.origin === "agent") {
        return existing._id;
      }
      await ctx.db.patch(existing._id, {
        category: args.category,
        origin: args.origin,
        note: args.note,
      });
      return existing._id;
    }
    return await ctx.db.insert("close_rules", {
      ...args,
      match: args.match.trim(),
      createdAt: Date.now(),
      timesApplied: 0,
    });
  },
});

export const recordRuleUse = mutation({
  args: { match: v.string(), times: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("close_rules").collect();
    const rule = rows.find(
      (r) => r.match.toLowerCase() === args.match.toLowerCase(),
    );
    if (!rule) {
      return;
    }
    await ctx.db.patch(rule._id, {
      timesApplied: rule.timesApplied + args.times,
      lastAppliedAt: Date.now(),
    });
  },
});

export const removeRule = mutation({
  args: { id: v.id("close_rules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
