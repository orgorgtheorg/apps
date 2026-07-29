import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { investorStage } from "./investorsTables";

const DAY = 86_400_000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("investors").collect();
    return rows.sort((a, b) => b.lastTouchAt - a.lastTouchAt);
  },
});

// The header stat founders check like a stock ticker.
export const momentum = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("investors").collect();
    const weekAgo = Date.now() - 7 * DAY;
    const active = rows.filter(
      (i) => i.stage !== "passed" && i.stage !== "closed",
    );
    const termsMoves = rows
      .filter((i) => i.stage === "terms" || i.stage === "closed")
      .map((i) => i.lastTouchAt);
    return {
      active: active.length,
      meetingsThisWeek: rows.filter(
        (i) =>
          i.lastTouchAt >= weekAgo &&
          (i.stage === "met" || i.stage === "partnerMeeting"),
      ).length,
      newIntrosThisWeek: rows.filter(
        (i) => i.stage === "introduced" && i.createdAt >= weekAgo,
      ).length,
      passes: rows.filter((i) => i.stage === "passed").length,
      daysSinceTermsMovement:
        termsMoves.length === 0
          ? null
          : Math.floor((Date.now() - Math.max(...termsMoves)) / DAY),
    };
  },
});

// Follow-ups due today or overdue — read by the daily sweep.
export const dueFollowUps = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("investors").collect();
    const now = Date.now();
    return rows
      .filter(
        (i) =>
          i.followUpAt !== undefined &&
          i.followUpAt <= now &&
          i.stage !== "passed" &&
          i.stage !== "closed",
      )
      .map((i) => ({
        id: i._id,
        firm: i.firm,
        partner: i.partner,
        why: i.followUpWhy,
        daysLate: Math.floor((now - (i.followUpAt as number)) / DAY),
        lastNote: i.notes[i.notes.length - 1]?.text,
      }))
      .sort((a, b) => b.daysLate - a.daysLate);
  },
});

// Pass reasons, verbatim — the pattern is the point ("3 passes cite market size").
export const passReasons = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("investors").collect();
    return rows
      .filter((i) => i.stage === "passed" && i.passReason)
      .map((i) => ({
        firm: i.firm,
        partner: i.partner,
        reason: i.passReason as string,
        at: i.lastTouchAt,
      }));
  },
});

export const create = mutation({
  args: {
    firm: v.string(),
    partner: v.optional(v.string()),
    stage: v.optional(investorStage),
    checkSize: v.optional(v.string()),
    introPath: v.optional(v.string()),
    research: v.optional(v.string()),
    researchSourceUrl: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { note, stage, ...fields } = args;
    return await ctx.db.insert("investors", {
      ...fields,
      stage: stage ?? "researching",
      notes: note ? [{ text: note, at: now, kind: "note" }] : [],
      lastTouchAt: now,
      createdAt: now,
    });
  },
});

export const move = mutation({
  args: {
    id: v.id("investors"),
    stage: investorStage,
    passReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      stage: args.stage,
      ...(args.passReason !== undefined ? { passReason: args.passReason } : {}),
      lastTouchAt: Date.now(),
    });
  },
});

export const addNote = mutation({
  args: {
    id: v.id("investors"),
    text: v.string(),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const investor = await ctx.db.get(args.id);
    if (!investor) {
      throw new Error("Investor not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.id, {
      notes: [
        ...investor.notes,
        { text: args.text.trim(), at: now, kind: args.kind },
      ],
      lastTouchAt: now,
    });
  },
});

export const setFollowUp = mutation({
  args: {
    id: v.id("investors"),
    followUpAt: v.optional(v.number()),
    followUpWhy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      followUpAt: args.followUpAt,
      followUpWhy: args.followUpWhy,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("investors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
