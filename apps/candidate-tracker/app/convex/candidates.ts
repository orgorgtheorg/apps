import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { candidateStage } from "./candidatesTables";

const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const ACTIVE_STAGES = ["applied", "screening", "interview", "offer"] as const;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("candidates").collect();
    return rows.sort((a, b) => b.lastTouchedAt - a.lastTouchedAt);
  },
});

// Active candidates untouched for 3+ days — read by the daily staleness cron
// and the board's attention strip.
export const stale = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_AFTER_MS;
    const rows = await ctx.db.query("candidates").collect();
    return rows
      .filter(
        (c) =>
          (ACTIVE_STAGES as readonly string[]).includes(c.stage) &&
          c.lastTouchedAt < cutoff,
      )
      .map((c) => ({
        id: c._id,
        name: c.name,
        role: c.role,
        stage: c.stage,
        daysIdle: Math.floor((Date.now() - c.lastTouchedAt) / 86_400_000),
      }))
      .sort((a, b) => b.daysIdle - a.daysIdle);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("candidates", {
      name: args.name.trim(),
      role: args.role.trim(),
      email: args.email?.trim() || undefined,
      source: args.source?.trim() || undefined,
      stage: "applied",
      notes: args.note ? [{ text: args.note, at: now }] : [],
      createdAt: now,
      lastTouchedAt: now,
    });
  },
});

export const move = mutation({
  args: { id: v.id("candidates"), stage: candidateStage },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      stage: args.stage,
      lastTouchedAt: Date.now(),
    });
  },
});

export const addNote = mutation({
  args: { id: v.id("candidates"), text: v.string() },
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.id);
    if (!candidate) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      notes: [...candidate.notes, { text: args.text.trim(), at: now }],
      lastTouchedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("candidates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
