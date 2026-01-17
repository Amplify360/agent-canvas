/**
 * Reusable Convex validator components
 * Eliminates duplication in validator definitions
 */

import { v } from "convex/values";

/**
 * Shared validator components for agent fields
 */
export const agentFieldValidators = {
  // Required fields
  phase: v.string(),
  phaseOrder: v.number(),
  agentOrder: v.number(),
  name: v.string(),

  // Optional fields
  objective: v.optional(v.string()),
  description: v.optional(v.string()),
  tools: v.array(v.string()),
  journeySteps: v.array(v.string()),
  demoLink: v.optional(v.string()),
  videoLink: v.optional(v.string()),

  // Complex optional fields
  metrics: v.optional(
    v.object({
      adoption: v.number(),
      satisfaction: v.number(),
    })
  ),
  roiContribution: v.optional(
    v.union(
      v.literal("Very High"),
      v.literal("High"),
      v.literal("Medium"),
      v.literal("Low")
    )
  ),
  department: v.optional(v.string()),
  status: v.optional(v.string()),
} as const;

/**
 * Build a validator with specified required and optional fields
 */
export function buildAgentValidator(fields: Record<string, any>) {
  return v.object(fields);
}

/**
 * Create agent input validator (for bulk create)
 * All fields required except explicitly optional ones
 */
export const agentInputValidator = buildAgentValidator({
  phase: agentFieldValidators.phase,
  phaseOrder: agentFieldValidators.phaseOrder,
  agentOrder: agentFieldValidators.agentOrder,
  name: agentFieldValidators.name,
  objective: agentFieldValidators.objective,
  description: agentFieldValidators.description,
  tools: agentFieldValidators.tools,
  journeySteps: agentFieldValidators.journeySteps,
  demoLink: agentFieldValidators.demoLink,
  videoLink: agentFieldValidators.videoLink,
  metrics: agentFieldValidators.metrics,
  roiContribution: agentFieldValidators.roiContribution,
  department: agentFieldValidators.department,
  status: agentFieldValidators.status,
});

/**
 * Create agent update validator (all fields optional)
 */
export const agentUpdateValidator = {
  phase: v.optional(agentFieldValidators.phase),
  phaseOrder: v.optional(agentFieldValidators.phaseOrder),
  agentOrder: v.optional(agentFieldValidators.agentOrder),
  name: v.optional(agentFieldValidators.name),
  objective: agentFieldValidators.objective,
  description: agentFieldValidators.description,
  tools: v.optional(agentFieldValidators.tools),
  journeySteps: v.optional(agentFieldValidators.journeySteps),
  demoLink: agentFieldValidators.demoLink,
  videoLink: agentFieldValidators.videoLink,
  metrics: agentFieldValidators.metrics,
  roiContribution: agentFieldValidators.roiContribution,
  department: agentFieldValidators.department,
  status: agentFieldValidators.status,
};
