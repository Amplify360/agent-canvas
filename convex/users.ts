/**
 * User management for lab demos
 * Provides sample users with avatars for agent ownership
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

    // Batch assign owners in parallel
    await Promise.all(
      allAgents.map(agent => {
        const randomUserIndex = Math.floor(Math.random() * args.userIds.length);
        const ownerId = args.userIds[randomUserIndex];
        return ctx.db.patch(agent._id, { ownerId });
      })
    );

    return allAgents.length;
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

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
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
