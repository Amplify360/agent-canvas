import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { MutationCtx, QueryCtx } from "./_generated/server";
import {
  AGENT_FIELD_KEY,
  AGENT_MODEL_VERSION,
  AgentFieldValues,
} from "../shared/agentModel";

type DbCtx = QueryCtx | MutationCtx;
type LegacyAgent = Doc<"agents"> & {
  objective?: string;
  description?: string;
  tools?: string[];
  journeySteps?: string[];
  demoLink?: string;
  videoLink?: string;
  metrics?: {
    numberOfUsers?: number;
    timesUsed?: number;
    timeSaved?: number;
    roi?: number;
  };
  category?: string;
  status?: string;
};

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

async function listAgents(
  ctx: DbCtx,
  workosOrgId?: string
): Promise<LegacyAgent[]> {
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
  }) as LegacyAgent[];
}

function buildFieldValuesFromLegacyAgent(agent: LegacyAgent): AgentFieldValues {
  const fieldValues: AgentFieldValues = {};

  if (agent.objective?.trim()) {
    fieldValues[AGENT_FIELD_KEY.OBJECTIVE] = agent.objective.trim();
  }
  if (agent.description?.trim()) {
    fieldValues[AGENT_FIELD_KEY.DESCRIPTION] = agent.description.trim();
  }
  if (Array.isArray(agent.tools) && agent.tools.length > 0) {
    fieldValues[AGENT_FIELD_KEY.TOOLS] = agent.tools;
  }
  if (Array.isArray(agent.journeySteps) && agent.journeySteps.length > 0) {
    fieldValues[AGENT_FIELD_KEY.JOURNEY_STEPS] = agent.journeySteps;
  }
  if (agent.demoLink?.trim()) {
    fieldValues[AGENT_FIELD_KEY.DEMO_LINK] = agent.demoLink.trim();
  }
  if (agent.videoLink?.trim()) {
    fieldValues[AGENT_FIELD_KEY.VIDEO_LINK] = agent.videoLink.trim();
  }
  if (agent.metrics && Object.keys(agent.metrics).length > 0) {
    fieldValues[AGENT_FIELD_KEY.METRICS] = agent.metrics;
  }
  if (agent.category?.trim()) {
    fieldValues[AGENT_FIELD_KEY.CATEGORY] = agent.category.trim();
  }
  if (agent.status) {
    fieldValues[AGENT_FIELD_KEY.STATUS] = agent.status;
  }

  return fieldValues;
}

function isMigrated(agent: LegacyAgent): boolean {
  return agent.modelVersion === AGENT_MODEL_VERSION && !!agent.fieldValues;
}

export const modelMigrationStatus = internalQuery({
  args: {
    workosOrgId: v.optional(v.string()),
  },
  handler: async (ctx, { workosOrgId }) => {
    const agents = await listAgents(ctx, workosOrgId);
    const migrated = agents.filter(isMigrated).length;

    return {
      total: agents.length,
      migrated,
      pending: agents.length - migrated,
      targetModelVersion: AGENT_MODEL_VERSION,
    };
  },
});

export const migrateAgentsToFieldValues = internalMutation({
  args: {
    workosOrgId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { workosOrgId, dryRun = true, limit = 1000 }) => {
    const agents = await listAgents(ctx, workosOrgId);
    const pendingAgents = agents.filter((agent) => !isMigrated(agent));
    const toProcess = pendingAgents.slice(0, Math.max(0, limit));

    if (!dryRun) {
      for (const agent of toProcess) {
        await ctx.db.patch(agent._id, {
          fieldValues: buildFieldValuesFromLegacyAgent(agent),
          modelVersion: AGENT_MODEL_VERSION,
          objective: undefined,
          description: undefined,
          tools: undefined,
          journeySteps: undefined,
          demoLink: undefined,
          videoLink: undefined,
          metrics: undefined,
          category: undefined,
          status: undefined,
          department: undefined,
          ownerId: undefined,
        });
      }
    }

    return {
      dryRun,
      scanned: agents.length,
      pending: pendingAgents.length,
      processed: toProcess.length,
      migrated: toProcess.length,
      remaining: Math.max(0, pendingAgents.length - toProcess.length),
      targetModelVersion: AGENT_MODEL_VERSION,
    };
  },
});
