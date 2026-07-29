import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { prospectStatus } from "./prospectsTables";

const sourcedArg = v.object({
  value: v.string(),
  sourceUrl: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospects").collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const progress = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospects").collect();
    const scored = rows.filter((r) => typeof r.fitScore === "number");
    return {
      total: rows.length,
      done: rows.filter((r) => r.status === "done").length,
      pending: rows.filter((r) => r.status === "pending").length,
      unverified: rows.filter((r) => r.status === "unverified").length,
      batches: [...new Set(rows.map((r) => r.batch))],
      topFit: scored
        .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
        .slice(0, 5)
        .map((r) => ({
          id: r._id,
          name: r.rawName,
          company: r.company?.value ?? r.rawCompany ?? "",
          fitScore: r.fitScore,
          fitReason: r.fitReason,
        })),
    };
  },
});

// The agent's work queue: rows still to research, oldest first.
export const nextBatch = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("prospects")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, args.limit ?? 10)
      .map((r) => ({
        id: r._id,
        name: r.rawName,
        company: r.rawCompany,
        email: r.rawEmail,
      }));
  },
});

export const importRows = mutation({
  args: {
    batch: v.string(),
    rows: v.array(
      v.object({
        rawName: v.string(),
        rawCompany: v.optional(v.string()),
        rawEmail: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("prospects").collect();
    const seen = new Set(
      existing.map((r) =>
        `${r.rawName}|${r.rawCompany ?? ""}|${r.rawEmail ?? ""}`.toLowerCase(),
      ),
    );
    const now = Date.now();
    let inserted = 0;
    for (const row of args.rows) {
      const key =
        `${row.rawName}|${row.rawCompany ?? ""}|${row.rawEmail ?? ""}`.toLowerCase();
      if (seen.has(key)) {
        continue; // re-importing the same CSV must not duplicate rows
      }
      seen.add(key);
      await ctx.db.insert("prospects", {
        ...row,
        batch: args.batch,
        status: "pending",
        createdAt: now,
      });
      inserted += 1;
    }
    return { inserted, skipped: args.rows.length - inserted };
  },
});

export const claim = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "enriching" });
  },
});

export const setEnrichment = mutation({
  args: {
    id: v.id("prospects"),
    company: v.optional(sourcedArg),
    title: v.optional(sourcedArg),
    linkedin: v.optional(sourcedArg),
    news: v.optional(sourcedArg),
    email: v.optional(sourcedArg),
    fitScore: v.optional(v.number()),
    fitReason: v.optional(v.string()),
    confidence: v.optional(v.number()),
    researchSeconds: v.optional(v.number()),
    status: prospectStatus,
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, enrichedAt: Date.now() });
  },
});

// Mark researched rows stale so a re-run only re-does what's old.
export const markStale = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanDays * 86_400_000;
    const rows = await ctx.db.query("prospects").collect();
    let reset = 0;
    for (const row of rows) {
      if (row.enrichedAt !== undefined && row.enrichedAt < cutoff) {
        await ctx.db.patch(row._id, { status: "pending" });
        reset += 1;
      }
    }
    return { reset };
  },
});

export const remove = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
