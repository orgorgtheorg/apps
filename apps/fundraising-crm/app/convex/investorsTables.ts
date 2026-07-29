import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { investorsTables } from './investorsTables';
//   export default defineSchema({ ...investorsTables, /* existing tables */ });

export const investorStage = v.union(
  v.literal("researching"),
  v.literal("introduced"),
  v.literal("met"),
  v.literal("partnerMeeting"),
  v.literal("terms"),
  v.literal("closed"),
  v.literal("passed"),
);

export const investorsTables = {
  investors: defineTable({
    firm: v.string(),
    partner: v.optional(v.string()),
    stage: investorStage,
    checkSize: v.optional(v.string()), // "$500k–1M" — a range, as founders think
    introPath: v.optional(v.string()), // who connects us, in one line
    // Auto-attached at card creation: fund size, recent deals, thesis fit.
    research: v.optional(v.string()),
    researchSourceUrl: v.optional(v.string()),

    notes: v.array(
      v.object({
        text: v.string(),
        at: v.number(),
        kind: v.optional(v.string()), // "debrief" | "email" | "note"
      }),
    ),
    // "Circle back in two weeks" parsed into a real date the cron resurfaces.
    followUpAt: v.optional(v.number()),
    followUpWhy: v.optional(v.string()),
    // Logged verbatim — pattern-surfaced across the pipeline later.
    passReason: v.optional(v.string()),

    lastTouchAt: v.number(),
    createdAt: v.number(),
  }).index("by_stage", ["stage"]),
};
