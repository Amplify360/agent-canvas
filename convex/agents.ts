import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * List all agents for a canvas
 */
export const list = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, { canvasId }) => {
    const auth = await requireAuth(ctx);

    // Verify access to the canvas's org
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .collect();

    // Sort by phaseOrder, then agentOrder
    agents.sort((a, b) => {
      if (a.phaseOrder !== b.phaseOrder) {
        return a.phaseOrder - b.phaseOrder;
      }
      return a.agentOrder - b.agentOrder;
    });

    return agents;
  },
});

/**
 * Get a single agent by ID
 */
export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);

    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Verify access via canvas
    const canvas = await ctx.db.get(agent.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

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
    phaseOrder: v.number(),
    agentOrder: v.number(),
    name: v.string(),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    tools: v.array(v.string()),
    journeySteps: v.array(v.string()),
    demoLink: v.optional(v.string()),
    videoLink: v.optional(v.string()),
    metrics: v.optional(
      v.object({
        adoption: v.number(),
        satisfaction: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Verify access to the canvas's org
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    const now = Date.now();

    const agentId = await ctx.db.insert("agents", {
      canvasId: args.canvasId,
      phase: args.phase,
      phaseOrder: args.phaseOrder,
      agentOrder: args.agentOrder,
      name: args.name,
      objective: args.objective,
      description: args.description,
      tools: args.tools,
      journeySteps: args.journeySteps,
      demoLink: args.demoLink,
      videoLink: args.videoLink,
      metrics: args.metrics,
      createdBy: auth.workosUserId,
      updatedBy: auth.workosUserId,
      createdAt: now,
      updatedAt: now,
    });

    // Record history
    await ctx.db.insert("agentHistory", {
      agentId,
      changedBy: auth.workosUserId,
      changedAt: now,
      changeType: "create",
      previousData: undefined,
    });

    return agentId;
  },
});

/**
 * Update an agent
 */
export const update = mutation({
  args: {
    agentId: v.id("agents"),
    phase: v.optional(v.string()),
    phaseOrder: v.optional(v.number()),
    agentOrder: v.optional(v.number()),
    name: v.optional(v.string()),
    objective: v.optional(v.string()),
    description: v.optional(v.string()),
    tools: v.optional(v.array(v.string())),
    journeySteps: v.optional(v.array(v.string())),
    demoLink: v.optional(v.string()),
    videoLink: v.optional(v.string()),
    metrics: v.optional(
      v.object({
        adoption: v.number(),
        satisfaction: v.number(),
      })
    ),
  },
  handler: async (ctx, { agentId, ...updates }) => {
    const auth = await requireAuth(ctx);

    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Verify access via canvas
    const canvas = await ctx.db.get(agent.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    const now = Date.now();

    // Store previous data for history
    const previousData = { ...agent };
    delete (previousData as any)._id;
    delete (previousData as any)._creationTime;

    // Build update object, only including defined values
    const updateData: Record<string, any> = {
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    if (updates.phase !== undefined) updateData.phase = updates.phase;
    if (updates.phaseOrder !== undefined) updateData.phaseOrder = updates.phaseOrder;
    if (updates.agentOrder !== undefined) updateData.agentOrder = updates.agentOrder;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.objective !== undefined) updateData.objective = updates.objective;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tools !== undefined) updateData.tools = updates.tools;
    if (updates.journeySteps !== undefined) updateData.journeySteps = updates.journeySteps;
    if (updates.demoLink !== undefined) updateData.demoLink = updates.demoLink;
    if (updates.videoLink !== undefined) updateData.videoLink = updates.videoLink;
    if (updates.metrics !== undefined) updateData.metrics = updates.metrics;

    await ctx.db.patch(agentId, updateData);

    // Record history
    await ctx.db.insert("agentHistory", {
      agentId,
      changedBy: auth.workosUserId,
      changedAt: now,
      changeType: "update",
      previousData,
    });
  },
});

/**
 * Delete an agent
 */
export const remove = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);

    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Verify access via canvas
    const canvas = await ctx.db.get(agent.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    const now = Date.now();

    // Store previous data for history
    const previousData = { ...agent };
    delete (previousData as any)._id;
    delete (previousData as any)._creationTime;

    // Record history before deletion
    await ctx.db.insert("agentHistory", {
      agentId,
      changedBy: auth.workosUserId,
      changedAt: now,
      changeType: "delete",
      previousData,
    });

    // Delete associated history (optional - you might want to keep it)
    // For now, we keep history even after agent deletion

    // Delete the agent
    await ctx.db.delete(agentId);
  },
});

/**
 * Reorder agents - update phase and order
 */
export const reorder = mutation({
  args: {
    agentId: v.id("agents"),
    phase: v.string(),
    phaseOrder: v.number(),
    agentOrder: v.number(),
  },
  handler: async (ctx, { agentId, phase, phaseOrder, agentOrder }) => {
    const auth = await requireAuth(ctx);

    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Verify access via canvas
    const canvas = await ctx.db.get(agent.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    await ctx.db.patch(agentId, {
      phase,
      phaseOrder,
      agentOrder,
      updatedBy: auth.workosUserId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Bulk create agents (for import)
 */
export const bulkCreate = mutation({
  args: {
    canvasId: v.id("canvases"),
    agents: v.array(
      v.object({
        phase: v.string(),
        phaseOrder: v.number(),
        agentOrder: v.number(),
        name: v.string(),
        objective: v.optional(v.string()),
        description: v.optional(v.string()),
        tools: v.array(v.string()),
        journeySteps: v.array(v.string()),
        demoLink: v.optional(v.string()),
        videoLink: v.optional(v.string()),
        metrics: v.optional(
          v.object({
            adoption: v.number(),
            satisfaction: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { canvasId, agents }) => {
    const auth = await requireAuth(ctx);

    // Verify access to the canvas's org
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    const now = Date.now();
    const createdIds: Id<"agents">[] = [];

    for (const agentData of agents) {
      const agentId = await ctx.db.insert("agents", {
        canvasId,
        phase: agentData.phase,
        phaseOrder: agentData.phaseOrder,
        agentOrder: agentData.agentOrder,
        name: agentData.name,
        objective: agentData.objective,
        description: agentData.description,
        tools: agentData.tools,
        journeySteps: agentData.journeySteps,
        demoLink: agentData.demoLink,
        videoLink: agentData.videoLink,
        metrics: agentData.metrics,
        createdBy: auth.workosUserId,
        updatedBy: auth.workosUserId,
        createdAt: now,
        updatedAt: now,
      });

      // Record history
      await ctx.db.insert("agentHistory", {
        agentId,
        changedBy: auth.workosUserId,
        changedAt: now,
        changeType: "create",
        previousData: undefined,
      });

      createdIds.push(agentId);
    }

    return createdIds;
  },
});
