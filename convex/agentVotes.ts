/**
 * Agent Votes - Upvote/Downvote functionality for agents
 * One vote per user per agent, toggleable
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { getAgentWithAccess } from "./lib/helpers";

/**
 * Get vote counts for a single agent
 */
export const getVoteCounts = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);
    await getAgentWithAccess(ctx, auth, agentId);

    const votes = await ctx.db
      .query("agentVotes")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    const up = votes.filter((v) => v.vote === "up").length;
    const down = votes.filter((v) => v.vote === "down").length;

    return { up, down };
  },
});

/**
 * Get the current user's vote for an agent
 */
export const getUserVote = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);
    await getAgentWithAccess(ctx, auth, agentId);

    const existingVote = await ctx.db
      .query("agentVotes")
      .withIndex("by_user_agent", (q) =>
        q.eq("workosUserId", auth.workosUserId).eq("agentId", agentId)
      )
      .first();

    return existingVote?.vote ?? null;
  },
});

/**
 * Get vote counts for all agents in a canvas (batch query for grid view)
 */
export const getVoteCountsForCanvas = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, { canvasId }) => {
    const auth = await requireAuth(ctx);

    // Get canvas and verify access
    const canvas = await ctx.db.get(canvasId);
    if (!canvas || canvas.deletedAt) {
      throw new Error("NotFound: Canvas not found");
    }

    // Check org access
    const hasAccess = auth.isSuperAdmin || auth.orgs.some((org) => org.id === canvas.workosOrgId);
    if (!hasAccess) {
      throw new Error("Auth: Organization access denied");
    }

    // Get all non-deleted agents for this canvas
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get votes for all agents
    const result: Record<string, { up: number; down: number }> = {};

    for (const agent of agents) {
      const votes = await ctx.db
        .query("agentVotes")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .collect();

      result[agent._id] = {
        up: votes.filter((v) => v.vote === "up").length,
        down: votes.filter((v) => v.vote === "down").length,
      };
    }

    return result;
  },
});

/**
 * Get user votes for all agents in a canvas (for highlighting user's votes)
 */
export const getUserVotesForCanvas = query({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, { canvasId }) => {
    const auth = await requireAuth(ctx);

    // Get canvas and verify access
    const canvas = await ctx.db.get(canvasId);
    if (!canvas || canvas.deletedAt) {
      throw new Error("NotFound: Canvas not found");
    }

    // Check org access
    const hasAccess = auth.isSuperAdmin || auth.orgs.some((org) => org.id === canvas.workosOrgId);
    if (!hasAccess) {
      throw new Error("Auth: Organization access denied");
    }

    // Get all non-deleted agents for this canvas
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get user's votes for these agents
    const result: Record<string, "up" | "down"> = {};

    for (const agent of agents) {
      const vote = await ctx.db
        .query("agentVotes")
        .withIndex("by_user_agent", (q) =>
          q.eq("workosUserId", auth.workosUserId).eq("agentId", agent._id)
        )
        .first();

      if (vote) {
        result[agent._id] = vote.vote;
      }
    }

    return result;
  },
});

/**
 * Cast or change a vote on an agent
 */
export const vote = mutation({
  args: {
    agentId: v.id("agents"),
    vote: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { agentId, vote: voteType }) => {
    const auth = await requireAuth(ctx);
    await getAgentWithAccess(ctx, auth, agentId);

    const now = Date.now();

    // Check for existing vote
    const existingVote = await ctx.db
      .query("agentVotes")
      .withIndex("by_user_agent", (q) =>
        q.eq("workosUserId", auth.workosUserId).eq("agentId", agentId)
      )
      .first();

    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        vote: voteType,
        updatedAt: now,
      });
    } else {
      // Create new vote
      await ctx.db.insert("agentVotes", {
        agentId,
        workosUserId: auth.workosUserId,
        vote: voteType,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Remove a vote from an agent
 */
export const removeVote = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const auth = await requireAuth(ctx);
    await getAgentWithAccess(ctx, auth, agentId);

    const existingVote = await ctx.db
      .query("agentVotes")
      .withIndex("by_user_agent", (q) =>
        q.eq("workosUserId", auth.workosUserId).eq("agentId", agentId)
      )
      .first();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
    }
  },
});
