import { defineTable } from "convex/server";
import { v } from "convex/values";

// Spread into defineSchema({ ... }) in schema.ts:
//   import { devTables } from './devTables';
//   export default defineSchema({ ...devTables, /* existing tables */ });

export const workState = v.union(
  v.literal("queued"), // issue accepted, not started
  v.literal("inProgress"), // branch exists, work happening
  v.literal("review"), // PR open, waiting on a human
  v.literal("changesRequested"),
  v.literal("merged"),
  v.literal("abandoned"),
);

export const devTables = {
  // One row per piece of work — an issue the agent took on.
  dev_work: defineTable({
    title: v.string(),
    issueNumber: v.optional(v.number()),
    issueUrl: v.optional(v.string()),
    branch: v.optional(v.string()),
    prNumber: v.optional(v.number()),
    prUrl: v.optional(v.string()),
    state: workState,

    // Honest status, not optimism.
    testsCommand: v.optional(v.string()),
    testsPassing: v.optional(v.boolean()),
    ciState: v.optional(v.string()), // "passing" | "failing" | "pending" | "none"
    previewUrl: v.optional(v.string()),
    // The channel task card this work is linked to.
    taskId: v.optional(v.string()),
    summary: v.optional(v.string()),

    startedAt: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_prNumber", ["prNumber"]),

  // Single row keyed "repo".
  dev_config: defineTable({
    key: v.string(),
    repo: v.string(), // "org/name"
    defaultBranch: v.string(),
    clonePath: v.string(), // /workspace/repos/<name>
    testCommand: v.optional(v.string()),
    lintCommand: v.optional(v.string()),
    devCommand: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
};
