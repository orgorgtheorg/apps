import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { chaseTone, invoiceStatus } from "./receivablesTables";

const DAY = 86_400_000;

// Days overdue -> where on the politeness gradient the next chase sits.
const toneFor = (daysOverdue: number) =>
  daysOverdue < 7
    ? "gentle"
    : daysOverdue < 21
      ? "direct"
      : daysOverdue < 45
        ? "firm"
        : "phoneCall";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("invoices").collect();
    return rows.sort((a, b) => a.dueAt - b.dueAt);
  },
});

// Aging buckets + the month's collections — the header numbers.
export const aging = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("invoices").collect();
    const now = Date.now();
    const open = rows.filter(
      (i) => i.status !== "paid" && i.status !== "writtenOff",
    );
    const bucket = (min: number, max: number) =>
      open.filter((i) => {
        const days = Math.floor((now - i.dueAt) / DAY);
        return days >= min && days < max;
      });
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).getTime();
    const sum = (list: typeof rows) => list.reduce((t, i) => t + i.amount, 0);
    return {
      current: sum(open.filter((i) => i.dueAt > now)),
      d0: sum(bucket(0, 30)),
      d30: sum(bucket(30, 60)),
      d60: sum(bucket(60, 90)),
      d90: sum(bucket(90, 100_000)),
      totalOpen: sum(open),
      collectedThisMonth: sum(
        rows.filter(
          (i) => i.status === "paid" && (i.paidAt ?? 0) >= monthStart,
        ),
      ),
    };
  },
});

// The chase pass: which invoices are due a nudge today, and at what tone.
export const dueForChase = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("invoices").collect();
    const now = Date.now();
    return rows
      .filter((i) => {
        if (i.status === "paid" || i.status === "writtenOff") return false;
        if (i.status === "disputed") return false; // frozen — never chase
        if (i.promisedFor !== undefined && i.promisedFor > now) return false;
        if (i.dueAt > now) return false;
        const last = i.chases[i.chases.length - 1];
        // At most one chase a week per invoice.
        return !last || now - last.at > 7 * DAY;
      })
      .map((i) => {
        const daysOverdue = Math.floor((now - i.dueAt) / DAY);
        return {
          id: i._id,
          client: i.client,
          email: i.email,
          number: i.number,
          amount: i.amount,
          daysOverdue,
          suggestedTone: toneFor(daysOverdue),
          chaseCount: i.chases.length,
          autoSend: i.autoSend ?? false,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

export const upsert = mutation({
  args: {
    client: v.string(),
    number: v.string(),
    amount: v.number(),
    issuedAt: v.number(),
    dueAt: v.number(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(invoiceStatus),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("invoices").collect();
    const existing = rows.find(
      (i) =>
        i.number === args.number &&
        i.client.toLowerCase() === args.client.toLowerCase(),
    );
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        status: args.status ?? existing.status,
        updatedAt: now,
      });
      return { id: existing._id, isNew: false };
    }
    const id = await ctx.db.insert("invoices", {
      ...args,
      status: args.status ?? "open",
      chases: [],
      updatedAt: now,
    });
    return { id, isNew: true };
  },
});

export const setDraft = mutation({
  args: { id: v.id("invoices"), draft: v.string(), tone: chaseTone },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      nextDraft: args.draft,
      nextTone: args.tone,
      updatedAt: Date.now(),
    });
  },
});

export const recordChase = mutation({
  args: {
    id: v.id("invoices"),
    tone: chaseTone,
    sent: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      chases: [
        ...invoice.chases,
        { at: now, tone: args.tone, sent: args.sent, note: args.note },
      ],
      nextDraft: undefined,
      updatedAt: now,
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: invoiceStatus,
    promisedFor: v.optional(v.number()),
    disputeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.promisedFor !== undefined
        ? { promisedFor: args.promisedFor }
        : {}),
      ...(args.disputeNote !== undefined
        ? { disputeNote: args.disputeNote }
        : {}),
      ...(args.status === "paid" ? { paidAt: now } : {}),
      updatedAt: now,
    });
  },
});

export const setAutoSend = mutation({
  args: { id: v.id("invoices"), autoSend: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      autoSend: args.autoSend,
      updatedAt: Date.now(),
    });
  },
});
