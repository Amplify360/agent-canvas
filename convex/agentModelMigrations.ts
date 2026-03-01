import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { AGENT_MODEL_VERSION } from "../shared/agentModel";
import { hydrateAgentReadModel, isAgentModelMigrated } from "./lib/agentModel";

type MigrationCandidate = Doc<"agents">;
type DbCtx = QueryCtx | MutationCtx;

async function getCanvasIdsForOrg(
  ctx: DbCtx,
  workosOrgId?: string
): Promise<Set<Id<"canvases">> | null> {
  if (!workosOrgId) {
    return null;
  }

  const canvases = await ctx.db
    .query("canvases")
    .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  return new Set(canvases.map((canvas) => canvas._id));
}

async function listMigrationCandidates(
  ctx: DbCtx,
  workosOrgId?: string
): Promise<MigrationCandidate[]> {
  const allowedCanvasIds = await getCanvasIdsForOrg(ctx, workosOrgId);
  const agents = await ctx.db.query("agents").collect();

  return agents.filter((agent) => {
    if (agent.deletedAt) {
      return false;
    }
    if (allowedCanvasIds && !allowedCanvasIds.has(agent.canvasId)) {
      return false;
    }
    return true;
  });
}

/**
 * Return progress for agent model migration.
 */
export const modelMigrationStatus = internalQuery({
  args: {
    workosOrgId: v.optional(v.string()),
  },
  handler: async (ctx, { workosOrgId }) => {
    const agents = await listMigrationCandidates(ctx, workosOrgId);

    let migrated = 0;
    let missingFieldValues = 0;
    let outdatedModelVersion = 0;

    for (const agent of agents) {
      if (isAgentModelMigrated(agent)) {
        migrated += 1;
        continue;
      }
      if (!agent.fieldValues) {
        missingFieldValues += 1;
      }
      if (agent.modelVersion !== AGENT_MODEL_VERSION) {
        outdatedModelVersion += 1;
      }
    }

    return {
      total: agents.length,
      migrated,
      pending: agents.length - migrated,
      missingFieldValues,
      outdatedModelVersion,
      targetModelVersion: AGENT_MODEL_VERSION,
    };
  },
});

/**
 * Backfill fieldValues/modelVersion for existing agents.
 * Defaults to dry-run mode for safety.
 */
export const migrateAgentsToFieldValues = internalMutation({
  args: {
    workosOrgId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workosOrgId, dryRun = true, limit = 1000 }) => {
    const agents = await listMigrationCandidates(ctx, workosOrgId);
    const pendingAgents = agents.filter((agent) => !isAgentModelMigrated(agent));
    const toProcess = pendingAgents.slice(0, Math.max(0, limit));

    let migrated = 0;
    for (const agent of toProcess) {
      const hydrated = hydrateAgentReadModel(agent);
      if (!dryRun) {
        await ctx.db.patch(agent._id, {
          objective: hydrated.objective,
          description: hydrated.description,
          tools: hydrated.tools,
          journeySteps: hydrated.journeySteps,
          demoLink: hydrated.demoLink,
          videoLink: hydrated.videoLink,
          metrics: hydrated.metrics,
          category: hydrated.category,
          status: hydrated.status,
          fieldValues: hydrated.fieldValues,
          modelVersion: AGENT_MODEL_VERSION,
        });
      }
      migrated += 1;
    }

    return {
      dryRun,
      scanned: agents.length,
      pending: pendingAgents.length,
      processed: toProcess.length,
      migrated,
      remaining: Math.max(0, pendingAgents.length - toProcess.length),
      targetModelVersion: AGENT_MODEL_VERSION,
    };
  },
});
