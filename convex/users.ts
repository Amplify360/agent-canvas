/**
 * User management for lab demos
 * Provides sample users with avatars for agent ownership
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const DEFAULT_MAX_TITLE_UPDATES = 200;

function assertAdminToken(token: string) {
  const expectedToken = process.env.MCP_ADMIN_TOKEN;
  if (!expectedToken) {
    throw new Error("Auth: MCP_ADMIN_TOKEN is not configured");
  }
  if (token !== expectedToken) {
    throw new Error("Auth: Invalid admin token");
  }
}

/**
 * Seed sample users from randomuser.me API
 * Lab environment only - creates realistic demo data
 */
export const seedSampleUsers = action({
  args: {
    workosOrgId: v.string(),
    count: v.optional(v.number()), // Default 20 users
  },
  handler: async (ctx, args): Promise<{ success: boolean; count: number; userIds: Id<"users">[]; agentsAssigned: number }> => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, args.workosOrgId);

    const count = args.count || 20;

    // Fetch random users from randomuser.me
    const response = await fetch(
      `https://randomuser.me/api/?results=${count}&inc=name,email,picture,login&nat=us`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sample users: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate API response structure
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response from randomuser.me API');
    }

    const users = data.results;

    // Store users in database
    const userIds: Id<"users">[] = [];
    for (const user of users) {
      const userId = await ctx.runMutation(internal.users.createUser, {
        workosOrgId: args.workosOrgId,
        name: `${user.name.first} ${user.name.last}`,
        email: user.login.username + '@example.com',
        avatarUrl: user.picture.large,
        title: generateRandomTitle(),
      });
      userIds.push(userId);
    }

    // Auto-assign owners to existing agents
    const agentsAssigned = await ctx.runMutation(internal.users.autoAssignOwners, {
      workosOrgId: args.workosOrgId,
      userIds,
    });

    return {
      success: true,
      count: userIds.length,
      userIds,
      agentsAssigned,
    };
  },
});

/**
 * Auto-assign owners to existing agents (internal mutation)
 * Randomly distributes users among agents in the org
 */
export const autoAssignOwners = internalMutation({
  args: {
    workosOrgId: v.string(),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userIds.length === 0) return 0;

    // Get all canvases for this org
    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_org", (q) => q.eq("workosOrgId", args.workosOrgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    if (canvases.length === 0) return 0;

    const canvasIds = canvases.map(c => c._id);

    // Get all agents for all canvases in parallel (avoid N+1 queries)
    const allAgentsArrays = await Promise.all(
      canvasIds.map(canvasId =>
        ctx.db
          .query("agents")
          .withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect()
      )
    );

    // Flatten to single array
    const allAgents = allAgentsArrays.flat();

    if (allAgents.length === 0) return 0;

    // Batch assign owners in parallel (only agents without an existing owner)
    const unassigned = allAgents.filter(agent => !agent.ownerId);
    await Promise.all(
      unassigned.map(agent => {
        const randomUserIndex = Math.floor(Math.random() * args.userIds.length);
        const ownerId = args.userIds[randomUserIndex];
        return ctx.db.patch(agent._id, { ownerId });
      })
    );

    return unassigned.length;
  },
});

/**
 * Create a new user (internal mutation called by seedSampleUsers)
 * Auth is already verified by the parent action
 */
export const createUser = internalMutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Note: Auth check removed - internal mutations are only called by authenticated actions

    // Check if user already exists within this org (scoped to prevent cross-org collisions)
    const existing = await ctx.db
      .query("users")
      .withIndex("by_org_email", (q) => q.eq("workosOrgId", args.workosOrgId).eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      workosOrgId: args.workosOrgId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      title: args.title,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal: list users for an org (used by actions that can't call public queries)
 */
export const listInternal = internalQuery({
  args: { workosOrgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("workosOrgId", args.workosOrgId))
      .collect();
  },
});

/**
 * List all users for an organization
 */
export const list = query({
  args: {
    workosOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, args.workosOrgId);

    return await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("workosOrgId", args.workosOrgId))
      .collect();
  },
});

/**
 * Get a single user by ID
 */
export const get = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    requireOrgAccess(auth, user.workosOrgId);
    return user;
  },
});

/**
 * Delete all users for an organization (cleanup)
 */
export const deleteAll = mutation({
  args: {
    workosOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, args.workosOrgId);

    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("workosOrgId", args.workosOrgId))
      .collect();

    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return { deleted: users.length };
  },
});

/**
 * Internal: get a canvas document (for auth checks in actions)
 */
export const getCanvasForAssignment = internalQuery({
  args: { canvasId: v.id("canvases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.canvasId);
  },
});

/**
 * Internal: assign owners to unassigned agents in a single canvas
 */
export const assignMissingOwnersForCanvas = internalMutation({
  args: {
    canvasId: v.id("canvases"),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userIds.length === 0) return 0;

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const unassigned = agents.filter(agent => !agent.ownerId);
    await Promise.all(
      unassigned.map(agent => {
        const ownerId = args.userIds[Math.floor(Math.random() * args.userIds.length)];
        return ctx.db.patch(agent._id, { ownerId });
      })
    );

    return unassigned.length;
  },
});

/**
 * Assign owners to agents missing one in the selected canvas only.
 * Used when users already exist but a new canvas has been imported.
 */
export const assignMissingOwners = action({
  args: {
    canvasId: v.id("canvases"),
  },
  handler: async (ctx, args): Promise<{ agentsAssigned: number }> => {
    const auth = await requireAuth(ctx);

    const canvas = await ctx.runQuery(internal.users.getCanvasForAssignment, { canvasId: args.canvasId });
    if (!canvas || canvas.deletedAt) throw new Error('Canvas not found');
    requireOrgAccess(auth, canvas.workosOrgId);

    const users = await ctx.runQuery(internal.users.listInternal, { workosOrgId: canvas.workosOrgId });
    if (users.length === 0) throw new Error('No users found. Seed demo users first.');

    const userIds = users.map((u: { _id: Id<"users"> }) => u._id);
    const agentsAssigned = await ctx.runMutation(internal.users.assignMissingOwnersForCanvas, {
      canvasId: args.canvasId,
      userIds,
    });

    return { agentsAssigned };
  },
});

/**
 * Batch update user titles (internal mutation for admin use via MCP)
 */
export const batchUpdateTitles = internalMutation({
  args: {
    token: v.string(),
    workosOrgId: v.string(),
    dryRun: v.optional(v.boolean()),
    confirm: v.optional(v.boolean()),
    maxUsers: v.optional(v.number()),
    updates: v.array(v.object({
      userId: v.id("users"),
      title: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    assertAdminToken(args.token);

    const dryRun = args.dryRun ?? true;
    if (!dryRun && args.confirm !== true) {
      throw new Error("Validation: confirm=true is required when dryRun=false");
    }

    if (args.updates.length === 0) {
      throw new Error("Validation: updates cannot be empty");
    }

    const maxUsers = Math.max(1, args.maxUsers ?? DEFAULT_MAX_TITLE_UPDATES);
    if (args.updates.length > maxUsers) {
      throw new Error(`Validation: received ${args.updates.length} updates, above maxUsers=${maxUsers}`);
    }

    const seenUserIds = new Set<string>();
    for (const { userId, title } of args.updates) {
      const key = String(userId);
      if (seenUserIds.has(key)) {
        throw new Error(`Validation: duplicate userId in updates: ${key}`);
      }
      seenUserIds.add(key);
      if (!title.trim()) {
        throw new Error(`Validation: title cannot be empty for userId ${key}`);
      }
    }

    const results = await Promise.all(
      args.updates.map(async ({ userId, title }) => {
        const user = await ctx.db.get(userId);
        if (!user) {
          return { userId, success: false, reason: "not_found" as const };
        }
        if (user.workosOrgId !== args.workosOrgId) {
          return { userId, success: false, reason: "org_mismatch" as const };
        }

        const nextTitle = title.trim();
        const oldTitle = user.title ?? null;
        const changed = oldTitle !== nextTitle;

        if (!dryRun && changed) {
          await ctx.db.patch(userId, { title: nextTitle });
        }

        return {
          userId,
          success: true,
          name: user.name,
          oldTitle,
          newTitle: nextTitle,
          changed,
        };
      })
    );

    return {
      dryRun,
      requested: args.updates.length,
      updated: results.filter((r) => r.success && r.changed).length,
      unchanged: results.filter((r) => r.success && !r.changed).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Generate random job titles for demo users
 */
function generateRandomTitle(): string {
  const titles = [
    "Product Manager",
    "Software Engineer",
    "UX Designer",
    "Data Analyst",
    "Marketing Manager",
    "Sales Director",
    "Customer Success Manager",
    "DevOps Engineer",
    "QA Engineer",
    "Business Analyst",
    "Technical Writer",
    "HR Manager",
    "Finance Manager",
    "Operations Manager",
    "Project Manager",
  ];

  return titles[Math.floor(Math.random() * titles.length)];
}
