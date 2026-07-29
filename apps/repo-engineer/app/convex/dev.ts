import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { workState } from "./devTables";

export const config = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("dev_config")
      .withIndex("by_key", (q) => q.eq("key", "repo"))
      .unique(),
});

export const work = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dev_work").collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// What's actually blocked on a human — the honest queue.
export const waitingOnHuman = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dev_work").collect();
    return rows
      .filter((w) => w.state === "review" || w.state === "changesRequested")
      .map((w) => ({
        id: w._id,
        title: w.title,
        prUrl: w.prUrl,
        state: w.state,
        ciState: w.ciState,
        daysOpen: Math.floor(
          (Date.now() - (w.startedAt ?? w.createdAt)) / 86_400_000,
        ),
      }))
      .sort((a, b) => b.daysOpen - a.daysOpen);
  },
});

export const setConfig = mutation({
  args: {
    repo: v.string(),
    defaultBranch: v.string(),
    clonePath: v.string(),
    testCommand: v.optional(v.string()),
    lintCommand: v.optional(v.string()),
    devCommand: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dev_config")
      .withIndex("by_key", (q) => q.eq("key", "repo"))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("dev_config", {
      key: "repo",
      ...args,
      updatedAt: now,
    });
  },
});

export const upsertWork = mutation({
  args: {
    title: v.string(),
    issueNumber: v.optional(v.number()),
    issueUrl: v.optional(v.string()),
    branch: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    prUrl: v.optional(v.string()),
    state: v.optional(workState),
    testsCommand: v.optional(v.string()),
    testsPassing: v.optional(v.boolean()),
    ciState: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    taskId: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("dev_work").collect();
    const existing = rows.find(
      (w) =>
        (args.issueNumber !== undefined &&
          w.issueNumber === args.issueNumber) ||
        (args.prNumber !== undefined && w.prNumber === args.prNumber) ||
        (args.branch !== undefined && w.branch === args.branch),
    );
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        state: args.state ?? existing.state,
        updatedAt: now,
      });
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("dev_work", {
      ...args,
      state: args.state ?? "queued",
      startedAt: args.branch ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
    return { id, isNew: true };
  },
});

export const setState = mutation({
  args: { id: v.id("dev_work"), state: workState },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      state: args.state,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("dev_work") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
