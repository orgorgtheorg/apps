import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DAY = 86_400_000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("contracts").collect();
    return rows.sort((a, b) => a.noticeBy - b.noticeBy);
  },
});

export const totals = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("contracts").collect();
    const active = rows.filter((c) => c.status === "active");
    const annual = active.reduce(
      (sum, c) => sum + (c.annualCost ?? (c.monthlyCost ?? 0) * 12),
      0,
    );
    return {
      count: active.length,
      annualCommitment: annual,
      needsReview: rows.filter((c) => c.status === "needsReview").length,
    };
  },
});

// What the daily cron warns about: 60 / 30 / 7 days before the notice deadline.
export const dueWarnings = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("contracts").collect();
    return rows
      .filter((c) => c.status === "active")
      .map((c) => ({
        id: c._id,
        party: c.party,
        type: c.type,
        noticeBy: c.noticeBy,
        renewsAt: c.renewsAt,
        daysToNotice: Math.ceil((c.noticeBy - now) / DAY),
        citation: c.citation,
        citationQuote: c.citationQuote,
        annualCost: c.annualCost ?? (c.monthlyCost ?? 0) * 12,
      }))
      .filter(
        (c) =>
          c.daysToNotice === 60 ||
          c.daysToNotice === 30 ||
          c.daysToNotice === 7 ||
          (c.daysToNotice < 7 && c.daysToNotice >= 0),
      )
      .sort((a, b) => a.daysToNotice - b.daysToNotice);
  },
});

export const upsert = mutation({
  args: {
    party: v.string(),
    type: v.string(),
    startAt: v.optional(v.number()),
    renewsAt: v.number(),
    noticeDays: v.number(),
    autoRenews: v.boolean(),
    monthlyCost: v.optional(v.number()),
    annualCost: v.optional(v.number()),
    citation: v.optional(v.string()),
    citationQuote: v.optional(v.string()),
    filePath: v.optional(v.string()),
    ambiguityNote: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("noticeGiven"),
        v.literal("ended"),
        v.literal("needsReview"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("contracts").collect();
    const existing = rows.find(
      (c) =>
        c.party.toLowerCase() === args.party.trim().toLowerCase() &&
        c.type.toLowerCase() === args.type.trim().toLowerCase(),
    );
    const now = Date.now();
    const fields = {
      ...args,
      // The number that actually matters, derived — never typed by hand.
      noticeBy: args.renewsAt - args.noticeDays * DAY,
      status: args.status ?? (args.ambiguityNote ? "needsReview" : "active"),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("contracts", { ...fields, createdAt: now });
    return { id, isNew: true };
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("contracts"),
    status: v.union(
      v.literal("active"),
      v.literal("noticeGiven"),
      v.literal("ended"),
      v.literal("needsReview"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const setCalendarEvent = mutation({
  args: { id: v.id("contracts"), calendarEventId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      calendarEventId: args.calendarEventId,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("contracts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
