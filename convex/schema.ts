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
    slug: v.string(), // Document name/identifier
    phases: v.optional(v.array(v.string())), // Ordered phase names (optional for legacy data)
    categories: v.optional(v.array(v.string())), // Ordered category names (optional for legacy data)
    deletedAt: v.optional(v.number()), // Soft delete timestamp
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
    phase: v.string(), // Implementation phase: "Phase 1", "Backlog", etc.
    phaseOrder: v.optional(v.number()), // DEPRECATED: Legacy field, kept for existing data
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
        numberOfUsers: v.optional(v.number()),
        timesUsed: v.optional(v.number()),
        timeSaved: v.optional(v.number()), // hours
        roi: v.optional(v.number()), // integer currency
      })
    ),
    // Fixed tag fields for grouping and filtering (same across all orgs)
    category: v.optional(v.string()), // Visual grouping: "Recruitment", "Onboarding", etc.
    department: v.optional(v.string()), // DEPRECATED: Legacy field, use category instead
    status: v.optional(
      v.union(
        v.literal("idea"),
        v.literal("approved"),
        v.literal("wip"),
        v.literal("testing"),
        v.literal("live"),
        v.literal("shelved")
      )
    ),
    // Canonical extensible values for non-core fields and future model growth
    fieldValues: v.optional(v.record(v.string(), v.any())),
    modelVersion: v.optional(v.number()),
    // payload removed - we're Convex-native, no need for round-trip fidelity
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_canvas", ["canvasId"]),

  // Optional org-level field definitions for extensible agent attributes
  agentFieldDefinitions: defineTable({
    workosOrgId: v.string(),
    key: v.string(), // Stable key used in agents.fieldValues
    label: v.string(),
    kind: v.union(
      v.literal("text"),
      v.literal("longText"),
      v.literal("stringList"),
      v.literal("url"),
      v.literal("object"),
      v.literal("enum")
    ),
    section: v.union(
      v.literal("basic"),
      v.literal("details"),
      v.literal("capabilities"),
      v.literal("journey"),
      v.literal("metrics")
    ),
    description: v.optional(v.string()),
    isCore: v.optional(v.boolean()),
    isRequired: v.optional(v.boolean()),
    isGroupable: v.optional(v.boolean()),
    isFilterable: v.optional(v.boolean()),
    isIndicatorEligible: v.optional(v.boolean()),
    options: v.optional(
      v.array(
        v.object({
          value: v.string(),
          label: v.string(),
          color: v.optional(v.string()),
          icon: v.optional(v.string()),
          shortLabel: v.optional(v.string()),
        })
      )
    ),
    archivedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["workosOrgId"])
    .index("by_org_key", ["workosOrgId", "key"]),

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

  // User organization memberships - synced from WorkOS via webhooks, cron, and manual sync
  // This table is the source of truth for org access (not JWT claims, which can be stale)
  userOrgMemberships: defineTable({
    workosUserId: v.string(),
    workosOrgId: v.string(),
    orgName: v.optional(v.string()), // Denormalized org name for UI rendering without WorkOS round-trips
    role: v.string(), // e.g., "admin", "member"
    updatedAt: v.optional(v.number()), // Timestamp for stale data protection
    syncedAt: v.optional(v.number()), // Legacy field name, kept for backward compatibility
  })
    .index("by_user", ["workosUserId"])
    .index("by_org", ["workosOrgId"])
    .index("by_user_org", ["workosUserId", "workosOrgId"]),

  // Sync log for debugging and monitoring membership synchronization
  syncLog: defineTable({
    type: v.union(v.literal("webhook"), v.literal("cron"), v.literal("manual")),
    workosUserId: v.optional(v.string()), // null for full sync (cron)
    status: v.string(), // "success", "error", etc.
    details: v.optional(v.string()), // Additional context (e.g., counts, error message)
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  // Agent votes - one vote per user per agent (upvote or downvote)
  agentVotes: defineTable({
    agentId: v.id("agents"),
    workosUserId: v.string(),
    vote: v.union(v.literal("up"), v.literal("down")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_user_agent", ["workosUserId", "agentId"]),

  // Agent comments - flat comments (not threaded)
  agentComments: defineTable({
    agentId: v.id("agents"),
    workosUserId: v.string(),
    userEmail: v.string(), // Denormalized for display without extra lookups
    content: v.string(),
    deletedAt: v.optional(v.number()), // Soft delete timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_time", ["agentId", "createdAt"]),
});
