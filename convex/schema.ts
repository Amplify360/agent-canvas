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
    compactIndicators: v.optional(v.array(v.string())), // Deprecated UI preference stored on some legacy canvases
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
    // Deprecated runtime fields kept only until the migration window is complete.
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    journeySteps: v.optional(v.array(v.string())),
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
    category: v.optional(v.string()),
    department: v.optional(v.string()),
    ownerId: v.optional(v.string()),
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
    fieldValues: v.optional(v.record(v.string(), v.any())),
    modelVersion: v.optional(v.number()),
    // payload removed - we're Convex-native, no need for round-trip fidelity
    deletedAt: v.optional(v.number()), // Soft delete timestamp
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

  // MCP service tokens scoped to a single org
  mcpTokens: defineTable({
    name: v.string(),
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    workosOrgId: v.string(),
    scopes: v.array(v.string()),
    defaultCanvasId: v.optional(v.id("canvases")),
    createdByUserId: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_prefix", ["tokenPrefix"])
    .index("by_org", ["workosOrgId"]),

  transformationMaps: defineTable({
    workosOrgId: v.string(),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("active"),
      v.literal("archived")
    ),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["workosOrgId"])
    .index("by_slug", ["slug"])
    .index("by_org_slug", ["workosOrgId", "slug"]),

  transformationPressures: defineTable({
    mapId: v.id("transformationMaps"),
    key: v.string(),
    order: v.number(),
    type: v.union(v.literal("external"), v.literal("internal")),
    title: v.string(),
    description: v.string(),
    evidence: v.array(v.string()),
    artifactStatus: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("archived")
    ),
    sourceType: v.union(
      v.literal("human"),
      v.literal("ai_generated"),
      v.literal("ai_edited"),
      v.literal("imported"),
      v.literal("system")
    ),
    sourceRef: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    lastReviewedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map", ["mapId"])
    .index("by_map_order", ["mapId", "order"])
    .index("by_map_key", ["mapId", "key"]),

  transformationObjectives: defineTable({
    mapId: v.id("transformationMaps"),
    key: v.string(),
    order: v.number(),
    scope: v.union(v.literal("enterprise"), v.literal("department")),
    departmentKey: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    linkedPressureKeys: v.array(v.string()),
    artifactStatus: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("archived")
    ),
    sourceType: v.union(
      v.literal("human"),
      v.literal("ai_generated"),
      v.literal("ai_edited"),
      v.literal("imported"),
      v.literal("system")
    ),
    sourceRef: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    lastReviewedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map", ["mapId"])
    .index("by_map_order", ["mapId", "order"])
    .index("by_map_key", ["mapId", "key"])
    .index("by_map_scope_order", ["mapId", "scope", "order"])
    .index("by_map_department", ["mapId", "departmentKey"]),

  transformationDepartments: defineTable({
    mapId: v.id("transformationMaps"),
    key: v.string(),
    order: v.number(),
    name: v.string(),
    description: v.string(),
    keyIssues: v.array(v.string()),
    improvementMandates: v.array(v.string()),
    artifactStatus: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("archived")
    ),
    sourceType: v.union(
      v.literal("human"),
      v.literal("ai_generated"),
      v.literal("ai_edited"),
      v.literal("imported"),
      v.literal("system")
    ),
    sourceRef: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    lastReviewedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map", ["mapId"])
    .index("by_map_order", ["mapId", "order"])
    .index("by_map_key", ["mapId", "key"]),

  transformationServices: defineTable({
    mapId: v.id("transformationMaps"),
    key: v.string(),
    departmentKey: v.string(),
    order: v.number(),
    name: v.string(),
    purpose: v.string(),
    customer: v.string(),
    trigger: v.string(),
    outcome: v.string(),
    constraints: v.array(v.string()),
    status: v.union(
      v.literal("not-analyzed"),
      v.literal("analyzed"),
      v.literal("has-deviations")
    ),
    effectivenessMetric: v.string(),
    efficiencyMetric: v.string(),
    artifactStatus: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("archived")
    ),
    sourceType: v.union(
      v.literal("human"),
      v.literal("ai_generated"),
      v.literal("ai_edited"),
      v.literal("imported"),
      v.literal("system")
    ),
    sourceRef: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    lastReviewedAt: v.optional(v.number()),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map", ["mapId"])
    .index("by_map_key", ["mapId", "key"])
    .index("by_department", ["mapId", "departmentKey"])
    .index("by_department_order", ["mapId", "departmentKey", "order"]),

  transformationServiceAnalyses: defineTable({
    mapId: v.id("transformationMaps"),
    serviceId: v.id("transformationServices"),
    reviewStatus: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("archived")
    ),
    sourceType: v.union(
      v.literal("human"),
      v.literal("ai_generated"),
      v.literal("ai_edited"),
      v.literal("imported"),
      v.literal("system")
    ),
    sourceRef: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    lastReviewedAt: v.optional(v.number()),
    idealFlowSteps: v.array(
      v.object({
        id: v.string(),
        serviceId: v.string(),
        flowType: v.union(v.literal("ideal"), v.literal("current")),
        order: v.number(),
        description: v.string(),
        stepType: v.union(
          v.literal("input"),
          v.literal("process"),
          v.literal("output"),
          v.literal("control"),
          v.literal("approval"),
          v.literal("handoff"),
          v.literal("rework"),
          v.literal("exception")
        ),
        hasDeviation: v.optional(v.boolean()),
        parallelGroup: v.optional(v.string()),
        groupLabel: v.optional(v.string()),
      })
    ),
    currentFlowSteps: v.array(
      v.object({
        id: v.string(),
        serviceId: v.string(),
        flowType: v.union(v.literal("ideal"), v.literal("current")),
        order: v.number(),
        description: v.string(),
        stepType: v.union(
          v.literal("input"),
          v.literal("process"),
          v.literal("output"),
          v.literal("control"),
          v.literal("approval"),
          v.literal("handoff"),
          v.literal("rework"),
          v.literal("exception")
        ),
        hasDeviation: v.optional(v.boolean()),
        parallelGroup: v.optional(v.string()),
        groupLabel: v.optional(v.string()),
      })
    ),
    deviations: v.array(
      v.object({
        id: v.string(),
        serviceId: v.string(),
        flowStepId: v.optional(v.string()),
        what: v.string(),
        why: v.string(),
        necessary: v.boolean(),
        impact: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        treatment: v.union(
          v.literal("automate"),
          v.literal("eliminate"),
          v.literal("simplify"),
          v.literal("accept")
        ),
        classification: v.union(
          v.literal("approval"),
          v.literal("handoff"),
          v.literal("rework"),
          v.literal("system-constraint"),
          v.literal("exception"),
          v.literal("control")
        ),
      })
    ),
    initiatives: v.array(
      v.object({
        id: v.string(),
        serviceId: v.string(),
        title: v.string(),
        description: v.string(),
        status: v.union(
          v.literal("proposed"),
          v.literal("approved"),
          v.literal("in-progress"),
          v.literal("done"),
          v.literal("parked")
        ),
        linkedAgents: v.array(
          v.object({
            id: v.string(),
            canvasAgentId: v.optional(v.id("agents")),
            name: v.string(),
            role: v.string(),
          })
        ),
      })
    ),
    createdBy: v.string(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map", ["mapId"])
    .index("by_service", ["serviceId"])
    .index("by_map_service", ["mapId", "serviceId"]),

  transformationHistory: defineTable({
    workosOrgId: v.string(),
    mapId: v.id("transformationMaps"),
    entityType: v.union(
      v.literal("map"),
      v.literal("pressure"),
      v.literal("objective"),
      v.literal("department"),
      v.literal("service"),
      v.literal("service_analysis")
    ),
    entityId: v.string(),
    changedBy: v.string(),
    changedAt: v.number(),
    changeType: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete")
    ),
    previousData: v.optional(v.any()),
    nextData: v.optional(v.any()),
  })
    .index("by_map_time", ["mapId", "changedAt"])
    .index("by_entity_time", ["entityType", "entityId", "changedAt"])
    .index("by_org_time", ["workosOrgId", "changedAt"]),
});
