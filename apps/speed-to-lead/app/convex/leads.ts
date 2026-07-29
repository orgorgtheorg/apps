import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { leadIntent, leadStatus } from "./leadsTables";

const OPEN_STATUSES = ["new", "drafted", "approved", "held"] as const;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("leads").collect();
    return rows.sort((a, b) => b.arrivedAt - a.arrivedAt);
  },
});

// Everything the agent needs on a cron wake-up, in one read.
export const queue = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("leads").collect();
    const open = rows.filter((l) =>
      (OPEN_STATUSES as readonly string[]).includes(l.status),
    );
    return {
      needsDraft: open
        .filter((l) => l.status === "new")
        .map((l) => ({ id: l._id, name: l.name, excerpt: l.excerpt })),
      approvedToSend: open
        .filter((l) => l.status === "approved")
        .map((l) => ({ id: l._id, name: l.name, email: l.email })),
      waitingOnUser: open.filter((l) => l.status === "drafted").length,
      oldestOpenMinutes:
        open.length === 0
          ? 0
          : Math.floor(
              (Date.now() - Math.min(...open.map((l) => l.arrivedAt))) / 60_000,
            ),
    };
  },
});

// Median minutes-to-first-reply over answered leads — the number the owner brags about.
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("leads").collect();
    const answered = rows.filter((l) => l.answeredAt !== undefined);
    const times = answered
      .map((l) => Math.max(0, (l.answeredAt as number) - l.arrivedAt) / 60_000)
      .sort((a, b) => a - b);
    const median =
      times.length === 0
        ? null
        : times.length % 2 === 1
          ? times[(times.length - 1) / 2]
          : (times[times.length / 2 - 1] + times[times.length / 2]) / 2;
    const weekAgo = Date.now() - 7 * 86_400_000;
    return {
      answered: answered.length,
      open: rows.filter((l) =>
        (OPEN_STATUSES as readonly string[]).includes(l.status),
      ).length,
      thisWeek: rows.filter((l) => l.arrivedAt >= weekAgo).length,
      medianMinutes: median === null ? null : Math.round(median),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.string(),
    subject: v.optional(v.string()),
    excerpt: v.string(),
    intent: v.optional(leadIntent),
    hot: v.optional(v.boolean()),
    hotReason: v.optional(v.string()),
    // Arrival time of the original message, not of this insert — the SLA clock
    // starts when the customer wrote, not when the agent noticed.
    arrivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("leads", {
      name: args.name.trim(),
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      source: args.source.trim(),
      subject: args.subject?.trim() || undefined,
      excerpt: args.excerpt.trim(),
      intent: args.intent ?? "other",
      status: "new",
      arrivedAt: args.arrivedAt ?? now,
      hot: args.hot ?? false,
      hotReason: args.hotReason,
      notes: [],
      lastTouchedAt: now,
    });
  },
});

export const setDraft = mutation({
  args: {
    id: v.id("leads"),
    draft: v.string(),
    intent: v.optional(leadIntent),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      draft: args.draft,
      status: "drafted",
      ...(args.intent ? { intent: args.intent } : {}),
      lastTouchedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: leadStatus },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      lastTouchedAt: now,
      // The clock stops the first time a reply actually goes out.
      ...(args.status === "answered" && lead.answeredAt === undefined
        ? { answeredAt: now }
        : {}),
    });
  },
});

export const addNote = mutation({
  args: { id: v.id("leads"), text: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      notes: [...lead.notes, { text: args.text.trim(), at: now }],
      lastTouchedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
