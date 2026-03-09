import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";
import {
  getAgentSnapshot,
  getCanvasWithAccess,
  getAgentWithAccess,
  recordHistory,
} from "./lib/helpers";
import {
  validateAgentData,
  validateAgentFieldValues,
  validateAgentName,
  validatePhase,
} from "./lib/validation";
import { agentFieldValidators, agentInputValidator, agentUpdateValidator, CHANGE_TYPE } from "./lib/validators";
import { AGENT_MODEL_VERSION, readAgentCoreFields } from "../shared/agentModel";

/**
 * List all agents for a canvas (excludes soft-deleted)
 */
export const list = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, { canvasId }) => {
    const auth = await requireAuth(ctx);
    await getCanvasWithAccess(ctx, auth, canvasId);

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Sort by agentOrder (phase ordering is determined by canvas.phases)
    return agents.sort((a, b) => a.agentOrder - b.agentOrder);
  },
});

/**
 * Get a single agent by ID
 */
export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);
    const { agent } = await getAgentWithAccess(ctx, auth, agentId);
    return agent;
  },
});

/**
 * Create a new agent
 */
export const create = mutation({
  args: {
    canvasId: v.id("canvases"),
    phase: v.string(),
    agentOrder: v.number(),
    name: v.string(),
    fieldValues: agentFieldValidators.fieldValues,
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    await getCanvasWithAccess(ctx, auth, args.canvasId);

    validateAgentData(args);

    const now = Date.now();

    const agentId = await ctx.db.insert("agents", {
      ...args,
      modelVersion: AGENT_MODEL_VERSION,
      createdBy: auth.workosUserId,
      updatedBy: auth.workosUserId,
      createdAt: now,
      updatedAt: now,
    });

    await recordHistory(ctx, agentId, auth.workosUserId, CHANGE_TYPE.CREATE);

    return agentId;
  },
});

/**
 * Update an agent
 */
export const update = mutation({
  args: {
    agentId: v.id("agents"),
    ...agentUpdateValidator,
  },
  handler: async (ctx, { agentId, ...updates }) => {
    const auth = await requireAuth(ctx);
    const { agent } = await getAgentWithAccess(ctx, auth, agentId);

    // Validate provided fields
    if (updates.name !== undefined) validateAgentName(updates.name);
    if (updates.phase !== undefined) validatePhase(updates.phase);
    if (updates.fieldValues !== undefined) {
      validateAgentFieldValues(updates.fieldValues);
    }

    const now = Date.now();
    const previousData = getAgentSnapshot(agent);

    // Filter out undefined values from updates
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(agentId, {
      ...definedUpdates,
      ...(updates.fieldValues !== undefined ? { modelVersion: AGENT_MODEL_VERSION } : {}),
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    await recordHistory(ctx, agentId, auth.workosUserId, CHANGE_TYPE.UPDATE, previousData);
  },
});

/**
 * Delete an agent (soft delete)
 */
export const remove = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);
    const { agent } = await getAgentWithAccess(ctx, auth, agentId);

    const now = Date.now();

    await recordHistory(ctx, agentId, auth.workosUserId, CHANGE_TYPE.DELETE, getAgentSnapshot(agent));

    // Soft delete instead of hard delete
    await ctx.db.patch(agentId, {
      deletedAt: now,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });
  },
});

/**
 * Reorder agents - update phase and order
 */
export const reorder = mutation({
  args: {
    agentId: v.id("agents"),
    phase: v.string(),
    agentOrder: v.number(),
  },
  handler: async (ctx, { agentId, phase, agentOrder }) => {
    const auth = await requireAuth(ctx);
    await getAgentWithAccess(ctx, auth, agentId);

    const now = Date.now();

    await ctx.db.patch(agentId, {
      phase,
      agentOrder,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });
  },
});

/**
 * Rename a phase by updating all agents with that phase name
 * Also updates the canvas.phases array
 */
export const renamePhase = mutation({
  args: {
    canvasId: v.id("canvases"),
    fromPhase: v.string(),
    toPhase: v.string(),
  },
  handler: async (ctx, { canvasId, fromPhase, toPhase }) => {
    const auth = await requireAuth(ctx);
    const canvas = await getCanvasWithAccess(ctx, auth, canvasId);

    validatePhase(fromPhase);
    validatePhase(toPhase);

    if (fromPhase === toPhase) {
      return { updatedCount: 0 };
    }

    const now = Date.now();

    // Update canvas.phases - replace fromPhase with toPhase
    const canvasPhases = canvas.phases ?? ["Backlog"];
    const phaseIndex = canvasPhases.indexOf(fromPhase);
    if (phaseIndex !== -1) {
      const newPhases = [...canvasPhases];
      newPhases[phaseIndex] = toPhase;
      await ctx.db.patch(canvasId, {
        phases: newPhases,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const toRename = agents.filter((a) => a.phase === fromPhase);
    if (toRename.length === 0) {
      return { updatedCount: 0 };
    }

    // Apply phase rename with history tracking
    for (const agent of toRename) {
      await recordHistory(ctx, agent._id, auth.workosUserId, CHANGE_TYPE.UPDATE, getAgentSnapshot(agent));

      await ctx.db.patch(agent._id, {
        phase: toPhase,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });
    }

    return { updatedCount: toRename.length };
  },
});

/**
 * Bulk create agents (for import)
 */
export const bulkCreate = mutation({
  args: {
    canvasId: v.id("canvases"),
    agents: v.array(agentInputValidator),
  },
  handler: async (ctx, { canvasId, agents }) => {
    const auth = await requireAuth(ctx);
    const canvas = await getCanvasWithAccess(ctx, auth, canvasId);

    // Validate all agents before inserting any
    agents.forEach(validateAgentData);

    const now = Date.now();
    const createdIds: Id<"agents">[] = [];

    // Extract unique phases and categories from agents
    const newPhases = new Set<string>();
    const newCategories = new Set<string>();
    for (const agent of agents) {
      newPhases.add(agent.phase);
      const category = readAgentCoreFields(agent.fieldValues).category;
      if (category) newCategories.add(category);
    }

    // Append only NEW phases/categories not already in canvas
    // (ImportYamlModal passes phases/categories at canvas creation, so we only add extras here)
    const canvasPhases = canvas.phases ?? ["Backlog"];
    const canvasCategories = canvas.categories ?? ["Uncategorized"];
    const phasesToAdd = [...newPhases].filter(p => !canvasPhases.includes(p));
    const categoriesToAdd = [...newCategories].filter(c => !canvasCategories.includes(c));

    if (phasesToAdd.length > 0 || categoriesToAdd.length > 0) {
      await ctx.db.patch(canvasId, {
        phases: [...canvasPhases, ...phasesToAdd],
        categories: [...canvasCategories, ...categoriesToAdd],
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });
    }

    for (const agentData of agents) {
      const agentId = await ctx.db.insert("agents", {
        canvasId,
        ...agentData,
        modelVersion: AGENT_MODEL_VERSION,
        createdBy: auth.workosUserId,
        updatedBy: auth.workosUserId,
        createdAt: now,
        updatedAt: now,
      });

      await recordHistory(ctx, agentId, auth.workosUserId, CHANGE_TYPE.CREATE);

      createdIds.push(agentId);
    }

    return createdIds;
  },
});

/**
 * Atomically replace all agents for a canvas
 * Soft-deletes existing agents and creates new ones in a single transaction
 * Also updates canvas phases/categories based on imported agents
 */
export const bulkReplace = mutation({
  args: {
    canvasId: v.id("canvases"),
    agents: v.array(agentInputValidator),
  },
  handler: async (ctx, { canvasId, agents }) => {
    const auth = await requireAuth(ctx);
    await getCanvasWithAccess(ctx, auth, canvasId);

    // Validate all agents before making any changes
    agents.forEach(validateAgentData);

    const now = Date.now();

    // Extract unique phases and categories from new agents (preserve order)
    const newPhases: string[] = [];
    const newCategories: string[] = [];
    const seenPhases = new Set<string>();
    const seenCategories = new Set<string>();
    for (const agent of agents) {
      if (!seenPhases.has(agent.phase)) {
        seenPhases.add(agent.phase);
        newPhases.push(agent.phase);
      }
      const category = readAgentCoreFields(agent.fieldValues).category;
      if (category && !seenCategories.has(category)) {
        seenCategories.add(category);
        newCategories.push(category);
      }
    }

    // Update canvas with new phases/categories from import
    await ctx.db.patch(canvasId, {
      phases: newPhases.length > 0 ? newPhases : ["Backlog"],
      categories: newCategories.length > 0 ? newCategories : ["Uncategorized"],
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    // Get existing non-deleted agents
    const existingAgents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Record history and soft-delete existing agents
    for (const agent of existingAgents) {
      await recordHistory(ctx, agent._id, auth.workosUserId, CHANGE_TYPE.DELETE, getAgentSnapshot(agent));

      // Soft delete instead of hard delete
      await ctx.db.patch(agent._id, {
        deletedAt: now,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });
    }

    // Create new agents
    const createdIds: Id<"agents">[] = [];
    for (const agentData of agents) {
      const agentId = await ctx.db.insert("agents", {
        canvasId,
        ...agentData,
        modelVersion: AGENT_MODEL_VERSION,
        createdBy: auth.workosUserId,
        updatedBy: auth.workosUserId,
        createdAt: now,
        updatedAt: now,
      });

      await recordHistory(ctx, agentId, auth.workosUserId, CHANGE_TYPE.CREATE);

      createdIds.push(agentId);
    }

    return createdIds;
  },
});

/**
 * Get distinct categories across all agents in an organization
 * Used for autocomplete suggestions in the agent form
 */
export const getDistinctCategories = query({
  args: { workosOrgId: v.string() },
  handler: async (ctx, { workosOrgId }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    // Get all canvases for this org
    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Collect all categories from agents across all canvases
    const categories = new Set<string>();

    for (const canvas of canvases) {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      for (const agent of agents) {
        const category = readAgentCoreFields(agent.fieldValues).category;
        if (category && category.trim()) {
          categories.add(category.trim());
        }
      }
    }

    // Return sorted array
    return Array.from(categories).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  },
});
