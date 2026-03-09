/**
 * Reusable Convex validator components
 * Eliminates duplication in validator definitions
 */

import { v } from "convex/values";

// ============================================================================
// Constants - Single source of truth for string literals
// ============================================================================

/**
 * Organization role values
 * Must match ORG_ROLES in app/types/validationConstants.ts
 */
export const ORG_ROLES = {
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type OrgRole = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

/**
 * Membership sync type values
 */
export const SYNC_TYPE = {
  WEBHOOK: "webhook",
  CRON: "cron",
  MANUAL: "manual",
} as const;

export type SyncType = (typeof SYNC_TYPE)[keyof typeof SYNC_TYPE];

/**
 * Agent history change type values
 */
export const CHANGE_TYPE = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
} as const;

export type ChangeType = (typeof CHANGE_TYPE)[keyof typeof CHANGE_TYPE];

/**
 * Agent vote type values
 */
export const VOTE_TYPE = {
  UP: "up",
  DOWN: "down",
} as const;

export type VoteType = (typeof VOTE_TYPE)[keyof typeof VOTE_TYPE];

// ============================================================================
// Validators
// ============================================================================

/**
 * Status union type validator
 */
export const statusValidator = v.optional(
  v.union(
    v.literal("idea"),
    v.literal("approved"),
    v.literal("wip"),
    v.literal("testing"),
    v.literal("live"),
    v.literal("shelved")
  )
);

export const fieldValuesValidator = v.record(v.string(), v.any());

/**
 * Shared validator components for agent fields
 */
export const agentFieldValidators = {
  // Required fields
  phase: v.string(),
  agentOrder: v.number(),
  name: v.string(),
  fieldValues: fieldValuesValidator,
} as const;

/**
 * Create agent input validator (for bulk create)
 * All fields required except explicitly optional ones
 * Derived from agentFieldValidators to avoid duplication
 */
export const agentInputValidator = v.object(agentFieldValidators);

/**
 * Create agent update validator (all fields optional)
 */
export const agentUpdateValidator = {
  phase: v.optional(agentFieldValidators.phase),
  agentOrder: v.optional(agentFieldValidators.agentOrder),
  name: v.optional(agentFieldValidators.name),
  fieldValues: v.optional(fieldValuesValidator),
};
