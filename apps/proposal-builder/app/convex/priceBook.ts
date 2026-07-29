import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const STALE_RATE_DAYS = 180;

export const items = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("price_items").collect();
    return rows.sort(
      (a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "") ||
        a.name.localeCompare(b.name),
    );
  },
});

export const terms = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("proposal_terms").collect(),
});

export const quotes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("quotes").collect();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Rates the agent should ask about before quoting off them again.
export const staleRates = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_RATE_DAYS * 86_400_000;
    const rows = await ctx.db.query("price_items").collect();
    return rows
      .filter((r) => r.updatedAt < cutoff)
      .map((r) => ({
        name: r.name,
        rate: r.rate,
        monthsOld: Math.floor((Date.now() - r.updatedAt) / (30 * 86_400_000)),
      }));
  },
});

export const upsertItem = mutation({
  args: {
    id: v.optional(v.id("price_items")),
    name: v.string(),
    unit: v.string(),
    rate: v.number(),
    floorRate: v.optional(v.number()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const now = Date.now();
    if (id) {
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      return id;
    }
    const existing = await ctx.db.query("price_items").collect();
    const match = existing.find(
      (r) => r.name.toLowerCase() === args.name.trim().toLowerCase(),
    );
    if (match) {
      await ctx.db.patch(match._id, { ...fields, updatedAt: now });
      return match._id;
    }
    return await ctx.db.insert("price_items", { ...fields, updatedAt: now });
  },
});

export const removeItem = mutation({
  args: { id: v.id("price_items") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const setTerm = mutation({
  args: {
    key: v.string(),
    body: v.string(),
    attachmentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("proposal_terms").collect();
    const existing = rows.find((r) => r.key === args.key);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("proposal_terms", { ...args, updatedAt: now });
  },
});

const lineArg = v.object({
  label: v.string(),
  unit: v.string(),
  quantity: v.number(),
  rate: v.number(),
  priceItemName: v.optional(v.string()),
});

// Creates v1, or the next version for the same client + title. Versions are
// never overwritten — "Oakridge v2" must remain distinguishable from v1.
export const saveQuote = mutation({
  args: {
    client: v.string(),
    title: v.string(),
    lines: v.array(lineArg),
    assumptions: v.array(v.string()),
    marginFlag: v.optional(v.string()),
    pdfPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("quotes")
      .withIndex("by_client", (q) => q.eq("client", args.client))
      .collect();
    const sameTitle = existing.filter((q) => q.title === args.title);
    const version =
      sameTitle.length === 0
        ? 1
        : Math.max(...sameTitle.map((q) => q.version)) + 1;
    const total = args.lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);
    return await ctx.db.insert("quotes", {
      ...args,
      version,
      total,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setQuoteStatus = mutation({
  args: {
    id: v.id("quotes"),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("won"),
      v.literal("lost"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
