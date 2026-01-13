import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Org-level settings and configuration
  orgSettings: defineTable({
    workosOrgId: v.string(),
    toolDefinitions: v.optional(v.any()), // {name, icon, color} per tool
    colorScheme: v.optional(v.any()), // Branding, theme colors
    sectionDefaults: v.optional(v.any()), // Default section formatting
    // Future: logo, feature flags, etc.
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_org", ["workosOrgId"]),

  // Canvas containers belonging to an org
  canvases: defineTable({
    workosOrgId: v.string(),
    title: v.string(),
    slug: v.string(),
    createdBy: v.string(), // WorkOS user ID
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["workosOrgId"])
    .index("by_slug", ["slug"])
    .index("by_org_slug", ["workosOrgId", "slug"]),

  // Individual agents within canvases
  agents: defineTable({
    canvasId: v.id("canvases"),
    phase: v.string(), // Grouping: "Sales", "Design", etc.
    phaseOrder: v.number(), // Sort order for phases
    agentOrder: v.number(), // Sort order within phase
    name: v.string(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    tools: v.array(v.string()), // Tool names
    journeySteps: v.array(v.string()),
    demoLink: v.optional(v.string()),
    videoLink: v.optional(v.string()),
    metrics: v.optional(
      v.object({
        adoption: v.number(),
        satisfaction: v.number(),
      })
    ),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_canvas", ["canvasId"]),

  // Audit trail for agent changes
  agentHistory: defineTable({
    agentId: v.id("agents"),
    changedBy: v.string(), // WorkOS user ID
    changedAt: v.number(),
    changeType: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete")
    ),
    previousData: v.optional(v.any()), // Snapshot before change
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_time", ["agentId", "changedAt"]),
});
