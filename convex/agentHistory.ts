import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";

/**
 * List history for an agent
 */
export const list = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);

    // Get the agent to verify access
    const agent = await ctx.db.get(agentId);
    if (!agent) {
      // Agent might be deleted, try to get history anyway if super admin
      if (!auth.isSuperAdmin) {
        throw new Error("Agent not found");
      }
    } else {
      // Verify access via canvas
      const canvas = await ctx.db.get(agent.canvasId);
      if (!canvas) {
        throw new Error("Canvas not found");
      }
      requireOrgAccess(auth, canvas.workosOrgId);
    }

    const history = await ctx.db
      .query("agentHistory")
      .withIndex("by_agent_time", (q) => q.eq("agentId", agentId))
      .order("desc")
      .collect();

    return history;
  },
});

/**
 * Get history for all agents in a canvas
 */
export const listByCanvas = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, { canvasId }) => {
    const auth = await requireAuth(ctx);

    // Verify access to the canvas's org
    const canvas = await ctx.db.get(canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    requireOrgAccess(auth, canvas.workosOrgId);

    // Get all agents in this canvas
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .collect();

    // Get history for all agents
    const allHistory = [];
    for (const agent of agents) {
      const history = await ctx.db
        .query("agentHistory")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .collect();
      allHistory.push(...history);
    }

    // Sort by time descending
    allHistory.sort((a, b) => b.changedAt - a.changedAt);

    return allHistory;
  },
});

/**
 * Get recent history across all canvases in an org
 */
export const listRecent = query({
  args: {
    workosOrgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workosOrgId, limit = 50 }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    // Get all canvases in this org
    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .collect();

    // Get all agents in these canvases
    const allHistory = [];
    for (const canvas of canvases) {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
        .collect();

      for (const agent of agents) {
        const history = await ctx.db
          .query("agentHistory")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .collect();
        allHistory.push(
          ...history.map((h) => ({
            ...h,
            canvasId: canvas._id,
            canvasTitle: canvas.title,
            agentName: agent.name,
          }))
        );
      }
    }

    // Sort by time descending and limit
    allHistory.sort((a, b) => b.changedAt - a.changedAt);
    return allHistory.slice(0, limit);
  },
});
