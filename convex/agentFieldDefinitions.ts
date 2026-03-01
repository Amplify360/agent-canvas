import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";
import {
  AGENT_FIELD_KIND,
  AGENT_FIELD_SECTION,
  CORE_AGENT_FIELD_DEFINITIONS,
  CORE_AGENT_FIELD_KEYS,
} from "../shared/agentModel";

const fieldKindValidator = v.union(
  v.literal(AGENT_FIELD_KIND.TEXT),
  v.literal(AGENT_FIELD_KIND.LONG_TEXT),
  v.literal(AGENT_FIELD_KIND.STRING_LIST),
  v.literal(AGENT_FIELD_KIND.URL),
  v.literal(AGENT_FIELD_KIND.OBJECT),
  v.literal(AGENT_FIELD_KIND.ENUM)
);

const fieldSectionValidator = v.union(
  v.literal(AGENT_FIELD_SECTION.BASIC),
  v.literal(AGENT_FIELD_SECTION.DETAILS),
  v.literal(AGENT_FIELD_SECTION.CAPABILITIES),
  v.literal(AGENT_FIELD_SECTION.JOURNEY),
  v.literal(AGENT_FIELD_SECTION.METRICS)
);

const fieldOptionValidator = v.object({
  value: v.string(),
  label: v.string(),
  color: v.optional(v.string()),
  icon: v.optional(v.string()),
  shortLabel: v.optional(v.string()),
});

function validateCustomKey(key: string): void {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error("Validation: key is required");
  }
  if (CORE_AGENT_FIELD_KEYS.includes(normalizedKey as any)) {
    throw new Error(`Validation: '${normalizedKey}' is a reserved core key`);
  }

  const keyPattern = /^[a-z][a-z0-9_-]*$/;
  if (!keyPattern.test(normalizedKey)) {
    throw new Error(
      "Validation: key must start with a letter and contain only lowercase letters, numbers, underscores, or hyphens"
    );
  }
}

/**
 * List all effective field definitions for an organization.
 * Includes core definitions plus custom org-level definitions.
 */
export const list = query({
  args: {
    workosOrgId: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { workosOrgId, includeArchived = false }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    const customDefinitions = await ctx.db
      .query("agentFieldDefinitions")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .collect();

    const filteredCustomDefinitions = includeArchived
      ? customDefinitions
      : customDefinitions.filter((definition) => definition.archivedAt === undefined);

    return {
      core: CORE_AGENT_FIELD_DEFINITIONS,
      custom: filteredCustomDefinitions,
    };
  },
});

/**
 * Create or update a custom field definition for an organization.
 */
export const upsert = mutation({
  args: {
    workosOrgId: v.string(),
    key: v.string(),
    label: v.string(),
    kind: fieldKindValidator,
    section: fieldSectionValidator,
    description: v.optional(v.string()),
    isRequired: v.optional(v.boolean()),
    isGroupable: v.optional(v.boolean()),
    isFilterable: v.optional(v.boolean()),
    isIndicatorEligible: v.optional(v.boolean()),
    options: v.optional(v.array(fieldOptionValidator)),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, args.workosOrgId);

    validateCustomKey(args.key);

    const now = Date.now();
    const normalizedKey = args.key.trim();

    const existing = await ctx.db
      .query("agentFieldDefinitions")
      .withIndex("by_org_key", (q) =>
        q.eq("workosOrgId", args.workosOrgId).eq("key", normalizedKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        key: normalizedKey,
        isCore: false,
        archivedAt: undefined,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("agentFieldDefinitions", {
      ...args,
      key: normalizedKey,
      isCore: false,
      createdBy: auth.workosUserId,
      updatedBy: auth.workosUserId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Archive a custom field definition.
 */
export const archive = mutation({
  args: {
    workosOrgId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, { workosOrgId, key }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    const existing = await ctx.db
      .query("agentFieldDefinitions")
      .withIndex("by_org_key", (q) =>
        q.eq("workosOrgId", workosOrgId).eq("key", key.trim())
      )
      .first();

    if (!existing) {
      throw new Error("NotFound: Field definition not found");
    }

    await ctx.db.patch(existing._id, {
      archivedAt: Date.now(),
      updatedBy: auth.workosUserId,
      updatedAt: Date.now(),
    });
  },
});
