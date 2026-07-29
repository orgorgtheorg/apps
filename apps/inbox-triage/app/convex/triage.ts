import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { triageBucket, triageStatus } from "./triageTables";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("triage_emails").collect();
    return rows.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const rules = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("triage_rules").collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// The 7am digest, and the agent's own work list.
export const digest = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("triage_emails").collect();
    const active = rows.filter((r) => r.status !== "archived");
    const needsYou = active.filter((r) => r.bucket === "needsYou");
    return {
      needsYou: needsYou.length,
      handled: active.filter((r) => r.bucket === "handled").length,
      fyi: active.filter((r) => r.bucket === "fyi").length,
      approvedToSend: active
        .filter((r) => r.status === "approved")
        .map((r) => ({ id: r._id, threadId: r.threadId, to: r.fromEmail })),
      // The one that actually matters: oldest unanswered in needsYou.
      oldest: needsYou
        .filter((r) => r.status !== "sent")
        .sort((a, b) => a.receivedAt - b.receivedAt)
        .slice(0, 1)
        .map((r) => ({
          id: r._id,
          from: r.from,
          subject: r.subject,
          reason: r.reason,
        }))[0],
    };
  },
});

export const upsert = mutation({
  args: {
    threadId: v.string(),
    from: v.string(),
    fromEmail: v.optional(v.string()),
    subject: v.string(),
    snippet: v.string(),
    receivedAt: v.number(),
    category: v.string(),
    bucket: triageBucket,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("triage_emails")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("triage_emails", {
      ...args,
      status: "new",
      updatedAt: now,
    });
    return { id, isNew: true };
  },
});

export const setDraft = mutation({
  args: { id: v.id("triage_emails"), draft: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      draft: args.draft,
      status: "drafted",
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id("triage_emails"), status: triageStatus },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "sent" ? { sentAt: now } : {}),
      updatedAt: now,
    });
  },
});

export const move = mutation({
  args: {
    id: v.id("triage_emails"),
    bucket: triageBucket,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      bucket: args.bucket,
      ...(args.reason ? { reason: args.reason } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const upsertRule = mutation({
  args: {
    name: v.string(),
    matches: v.array(v.string()),
    bucket: triageBucket,
    autoSend: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("triage_rules")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        // Never silently grant send permission on an update.
        autoSend: args.autoSend ?? existing.autoSend,
      });
      return existing._id;
    }
    return await ctx.db.insert("triage_rules", {
      ...args,
      autoSend: args.autoSend ?? false,
      createdAt: Date.now(),
    });
  },
});

export const setRuleAutoSend = mutation({
  args: { id: v.id("triage_rules"), autoSend: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { autoSend: args.autoSend });
  },
});

export const removeRule = mutation({
  args: { id: v.id("triage_rules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
