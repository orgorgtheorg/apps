import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { solicitationDecision } from "./solicitationsTables";

const DAY = 86_400_000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("solicitations").collect();
    // Deadline order: the only order that matters when bidding.
    return rows.sort((a, b) => a.dueAt - b.dueAt);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("solicitations").collect();
    const decided = rows.filter(
      (s) => s.decision === "won" || s.decision === "lost",
    );
    return {
      open: rows.filter((s) => s.decision === "new" || s.decision === "go")
        .length,
      dueThisWeek: rows.filter(
        (s) =>
          s.decision !== "noGo" &&
          s.dueAt > Date.now() &&
          s.dueAt < Date.now() + 7 * DAY,
      ).length,
      won: decided.filter((s) => s.decision === "won").length,
      lost: decided.filter((s) => s.decision === "lost").length,
    };
  },
});

// Bids in flight whose deadline is close — the daily sweep nags on these.
export const dueSoon = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("solicitations").collect();
    return rows
      .filter(
        (s) =>
          (s.decision === "go" || s.decision === "new") &&
          s.dueAt > now &&
          s.dueAt < now + 10 * DAY,
      )
      .map((s) => ({
        id: s._id,
        agency: s.agency,
        title: s.title,
        daysLeft: Math.ceil((s.dueAt - now) / DAY),
        decision: s.decision,
        fitScore: s.fitScore,
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  },
});

export const upsert = mutation({
  args: {
    externalId: v.string(),
    source: v.string(),
    agency: v.string(),
    title: v.string(),
    url: v.string(),
    dueAt: v.number(),
    estimatedValue: v.optional(v.string()),
    naics: v.optional(v.string()),
    setAside: v.optional(v.string()),
    summary: v.string(),
    fitScore: v.number(),
    fitReasons: v.array(v.string()),
    recommendation: v.string(),
    reusedFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("solicitations")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    const now = Date.now();
    if (existing) {
      // Never clobber a decision the user made.
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("solicitations", {
      ...args,
      decision: "new",
      foundAt: now,
      updatedAt: now,
    });
    return { id, isNew: true };
  },
});

export const setDecision = mutation({
  args: {
    id: v.id("solicitations"),
    decision: solicitationDecision,
    outcomeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      decision: args.decision,
      ...(args.outcomeNote !== undefined
        ? { outcomeNote: args.outcomeNote }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const setResponseDoc = mutation({
  args: { id: v.id("solicitations"), responseDocPath: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      responseDocPath: args.responseDocPath,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("solicitations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
