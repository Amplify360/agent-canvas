import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { AGENT_MODEL_VERSION } from "../shared/agentModel";
import { getAgentSnapshot, recordHistory } from "./lib/helpers";
import { applyCanvasStateOperation, resolveDryRun } from "./lib/mcpHelpers";
import {
  validateAgentData,
  validateAgentFieldValues,
  validateAgentName,
  validatePhase,
  validateSlug,
  validateTitle,
} from "./lib/validation";
import { CHANGE_TYPE } from "./lib/validators";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function resolveCanvas(ctx: any, workosOrgId: string, canvasId?: Id<"canvases">, canvasSlug?: string, defaultCanvasId?: Id<"canvases">) {
  if (canvasId) {
    const byId = await ctx.db.get(canvasId);
    if (!byId || byId.deletedAt || byId.workosOrgId !== workosOrgId) throw new Error("NotFound: Canvas not found");
    return byId;
  }
  if (canvasSlug) {
    const bySlug = await ctx.db
      .query("canvases")
      .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", canvasSlug))
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .first();
    if (!bySlug) throw new Error("NotFound: Canvas not found");
    return bySlug;
  }
  if (defaultCanvasId) {
    const byDefault = await ctx.db.get(defaultCanvasId);
    if (byDefault && !byDefault.deletedAt && byDefault.workosOrgId === workosOrgId) return byDefault;
  }
  throw new Error("Validation: canvasId or canvasSlug is required");
}

async function ensureUniqueCanvasSlug(
  ctx: any,
  workosOrgId: string,
  slug: string,
  excludeCanvasId?: Id<"canvases">
) {
  const existing = await ctx.db
    .query("canvases")
    .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", slug))
    .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
    .first();

  if (existing && existing._id !== excludeCanvasId) {
    throw new Error("Validation: A canvas with this slug already exists");
  }
}

function normalizeUpdateAgentOperation(op: any, existingFieldValues: Record<string, unknown>) {
  const nestedFields = op.fields && typeof op.fields === "object" ? op.fields : {};
  const name = op.name ?? nestedFields.name;
  const phase = op.phase ?? nestedFields.phase;
  const agentOrder = op.agentOrder ?? nestedFields.agentOrder;
  const fieldValuesPatch = op.fieldValues ?? nestedFields.fieldValues;

  return {
    name,
    phase,
    agentOrder,
    fieldValues:
      fieldValuesPatch !== undefined
        ? {
            ...existingFieldValues,
            ...fieldValuesPatch,
          }
        : undefined,
  };
}

async function getValidTokenByHash(ctx: any, tokenPrefix: string, tokenHash: string) {
  if (!tokenPrefix) return null;

  const candidate = await ctx.db
    .query("mcpTokens")
    .withIndex("by_prefix", (q: any) => q.eq("tokenPrefix", tokenPrefix))
    .first();

  if (!candidate || candidate.revokedAt) return null;
  if (candidate.expiresAt && candidate.expiresAt < Date.now()) return null;
  if (!constantTimeEquals(tokenHash, candidate.tokenHash)) return null;

  return candidate;
}

async function requireToken(ctx: any, tokenPrefix: string, tokenHash: string, requiredScope?: string) {
  const token = await getValidTokenByHash(ctx, tokenPrefix, tokenHash);
  if (!token) {
    throw new Error("Auth: Invalid service token");
  }
  if (requiredScope && !token.scopes.includes(requiredScope)) {
    throw new Error(`Auth: Missing required scope ${requiredScope}`);
  }
  return token;
}

export const authenticateToken = query({
  args: { tokenPrefix: v.string(), tokenHash: v.string() },
  handler: async (ctx, { tokenPrefix, tokenHash }) => {
    const token = await getValidTokenByHash(ctx, tokenPrefix, tokenHash);
    if (!token) return null;
    return {
      _id: token._id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      workosOrgId: token.workosOrgId,
      scopes: token.scopes,
      defaultCanvasId: token.defaultCanvasId,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
    };
  },
});

export const touchLastUsed = mutation({
  args: { tokenPrefix: v.string(), tokenHash: v.string(), minIntervalMs: v.optional(v.number()) },
  handler: async (ctx, { tokenPrefix, tokenHash, minIntervalMs }) => {
    const token = await getValidTokenByHash(ctx, tokenPrefix, tokenHash);
    if (!token) return;
    const now = Date.now();
    const interval = minIntervalMs ?? 60_000;
    if (token.lastUsedAt && now - token.lastUsedAt < interval) return;
    await ctx.db.patch(token._id, { lastUsedAt: now });
  },
});

export const whoami = query({
  args: { tokenPrefix: v.string(), tokenHash: v.string() },
  handler: async (ctx, { tokenPrefix, tokenHash }) => {
    const token = await requireToken(ctx, tokenPrefix, tokenHash, "canvas:read");
    return {
      tokenId: token._id,
      tokenName: token.name,
      tokenPrefix: token.tokenPrefix,
      workosOrgId: token.workosOrgId,
      scopes: token.scopes,
      defaultCanvasId: token.defaultCanvasId,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
    };
  },
});

export const listCanvases = query({
  args: { tokenPrefix: v.string(), tokenHash: v.string(), text: v.optional(v.string()), updatedSince: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { tokenPrefix, tokenHash, text, updatedSince, limit }) => {
    const token = await requireToken(ctx, tokenPrefix, tokenHash, "canvas:read");
    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_org", (q) => q.eq("workosOrgId", token.workosOrgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const normalized = text?.trim().toLowerCase();
    const filtered = canvases.filter((canvas) => {
      if (updatedSince && canvas.updatedAt < updatedSince) return false;
      if (!normalized) return true;
      return canvas.title.toLowerCase().includes(normalized) || canvas.slug.toLowerCase().includes(normalized);
    }).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit ?? 25);

    return Promise.all(filtered.map(async (canvas) => {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      return {
        canvasId: canvas._id,
        slug: canvas.slug,
        title: canvas.title,
        updatedAt: canvas.updatedAt,
        phaseCount: (canvas.phases ?? []).length,
        categoryCount: (canvas.categories ?? []).length,
        agentCount: agents.length,
      };
    }));
  },
});

export const getCanvasSnapshot = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    canvasId: v.optional(v.id("canvases")),
    canvasSlug: v.optional(v.string()),
    view: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "canvas:read");
    const canvas = await resolveCanvas(ctx, token.workosOrgId, args.canvasId, args.canvasSlug, token.defaultCanvasId);
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      canvas: {
        canvasId: canvas._id,
        slug: canvas.slug,
        title: canvas.title,
        phases: canvas.phases ?? [],
        categories: canvas.categories ?? [],
        updatedAt: canvas.updatedAt,
      },
      view: args.view ?? "compact",
      agents: agents.map((agent) => ({
        agentId: agent._id,
        name: agent.name,
        phase: agent.phase,
        agentOrder: agent.agentOrder,
        fieldValues: args.view === "full" ? agent.fieldValues : undefined,
        updatedAt: agent.updatedAt,
      })),
    };
  },
});

export const applyCanvasChanges = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    canvasId: v.optional(v.id("canvases")),
    canvasSlug: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    expectedUpdatedAt: v.optional(v.number()),
    operations: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "canvas:write");
    const isDryRun = resolveDryRun(args.dryRun);
    const canvas = await resolveCanvas(ctx, token.workosOrgId, args.canvasId, args.canvasSlug, token.defaultCanvasId);
    if (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== canvas.updatedAt) {
      return { ok: false, conflict: { expectedUpdatedAt: args.expectedUpdatedAt, actualUpdatedAt: canvas.updatedAt } };
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_canvas", (q) => q.eq("canvasId", canvas._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    let canvasState = canvas;
    const byId = new Map(agents.map((a) => [a._id, a]));
    const now = Date.now();
    const actor = `mcp_token:${token._id}`;
    const summary: string[] = [];

    for (const op of args.operations) {
      if (op.type === "update_canvas") {
        if (op.title !== undefined) validateTitle(op.title);
        if (op.slug !== undefined) {
          validateSlug(op.slug);
          if (op.slug !== canvasState.slug) {
            await ensureUniqueCanvasSlug(ctx, token.workosOrgId, op.slug, canvasState._id);
          }
        }
        const nextCanvasState = applyCanvasStateOperation(canvasState, op);
        if (!isDryRun) {
          await ctx.db.patch(canvasState._id, {
            title: nextCanvasState.title,
            slug: nextCanvasState.slug,
            updatedBy: actor,
            updatedAt: now,
          });
        }
        canvasState = { ...canvasState, ...nextCanvasState, updatedAt: now };
        summary.push("updated canvas");
      } else if (op.type === "rename_phase") {
        validatePhase(op.fromPhase);
        validatePhase(op.toPhase);
        const nextCanvasState = applyCanvasStateOperation(canvasState, op);
        if (!isDryRun) {
          await ctx.db.patch(canvasState._id, { phases: nextCanvasState.phases, updatedBy: actor, updatedAt: now });
          for (const agent of Array.from(byId.values()).filter((entry) => entry.phase === op.fromPhase)) {
            await recordHistory(ctx, agent._id, actor, CHANGE_TYPE.UPDATE, getAgentSnapshot(agent));
            await ctx.db.patch(agent._id, { phase: op.toPhase, updatedBy: actor, updatedAt: now });
          }
        }
        for (const agent of Array.from(byId.values()).filter((entry) => entry.phase === op.fromPhase)) {
          byId.set(agent._id, { ...agent, phase: op.toPhase, updatedBy: actor, updatedAt: now } as Doc<"agents">);
        }
        canvasState = { ...canvasState, ...nextCanvasState, updatedAt: now };
        summary.push("renamed phase");
      } else if (op.type === "reorder_phases") {
        const nextCanvasState = applyCanvasStateOperation(canvasState, op);
        if (!isDryRun) {
          await ctx.db.patch(canvasState._id, { phases: nextCanvasState.phases, updatedBy: actor, updatedAt: now });
        }
        canvasState = { ...canvasState, ...nextCanvasState, updatedAt: now };
        summary.push("reordered phases");
      } else if (op.type === "reorder_categories") {
        const nextCanvasState = applyCanvasStateOperation(canvasState, op);
        if (!isDryRun) {
          await ctx.db.patch(canvasState._id, { categories: nextCanvasState.categories, updatedBy: actor, updatedAt: now });
        }
        canvasState = { ...canvasState, ...nextCanvasState, updatedAt: now };
        summary.push("reordered categories");
      } else if (op.type === "create_agent") {
        validateAgentData({
          name: op.name,
          phase: op.phase,
          fieldValues: op.fieldValues ?? {},
        });
        if (!isDryRun) {
          const agentId = await ctx.db.insert("agents", {
            canvasId: canvasState._id,
            phase: op.phase,
            agentOrder: op.agentOrder ?? byId.size,
            name: op.name,
            fieldValues: op.fieldValues ?? {},
            modelVersion: AGENT_MODEL_VERSION,
            createdBy: actor,
            updatedBy: actor,
            createdAt: now,
            updatedAt: now,
          });
          await recordHistory(ctx, agentId, actor, CHANGE_TYPE.CREATE);
          byId.set(agentId, {
            _id: agentId,
            _creationTime: now,
            canvasId: canvasState._id,
            phase: op.phase,
            agentOrder: op.agentOrder ?? byId.size,
            name: op.name,
            fieldValues: op.fieldValues ?? {},
            modelVersion: AGENT_MODEL_VERSION,
            createdBy: actor,
            updatedBy: actor,
            createdAt: now,
            updatedAt: now,
          } as Doc<"agents">);
        } else {
          byId.set(`dryrun-${summary.length}` as Id<"agents">, {
            _id: `dryrun-${summary.length}` as Id<"agents">,
            _creationTime: now,
            canvasId: canvasState._id,
            phase: op.phase,
            agentOrder: op.agentOrder ?? byId.size,
            name: op.name,
            fieldValues: op.fieldValues ?? {},
            modelVersion: AGENT_MODEL_VERSION,
            createdBy: actor,
            updatedBy: actor,
            createdAt: now,
            updatedAt: now,
          } as Doc<"agents">);
        }
        summary.push("created agent");
      } else if (op.type === "update_agent") {
        const agent = byId.get(op.agentId as Id<"agents">);
        if (!agent) throw new Error("Validation: agentId not in canvas");
        const normalized = normalizeUpdateAgentOperation(op, agent.fieldValues ?? {});
        if (normalized.name !== undefined) validateAgentName(normalized.name);
        if (normalized.phase !== undefined) validatePhase(normalized.phase);
        if (normalized.fieldValues !== undefined) validateAgentFieldValues(normalized.fieldValues);
        const definedUpdates = Object.fromEntries(
          Object.entries({
            name: normalized.name,
            phase: normalized.phase,
            agentOrder: normalized.agentOrder,
            fieldValues: normalized.fieldValues,
          }).filter(([, value]) => value !== undefined)
        );
        if (Object.keys(definedUpdates).length === 0) {
          throw new Error("Validation: update_agent requires at least one field to update");
        }
        if (!isDryRun) {
          await recordHistory(ctx, agent._id, actor, CHANGE_TYPE.UPDATE, getAgentSnapshot(agent));
          await ctx.db.patch(op.agentId, {
            ...definedUpdates,
            ...(normalized.fieldValues !== undefined ? { modelVersion: AGENT_MODEL_VERSION } : {}),
            updatedBy: actor,
            updatedAt: now,
          });
        }
        byId.set(agent._id, {
          ...agent,
          ...definedUpdates,
          ...(normalized.fieldValues !== undefined ? { modelVersion: AGENT_MODEL_VERSION } : {}),
          updatedBy: actor,
          updatedAt: now,
        } as Doc<"agents">);
        summary.push("updated agent");
      } else if (op.type === "move_agent") {
        const agent = byId.get(op.agentId as Id<"agents">);
        if (!agent) throw new Error("Validation: agentId not in canvas");
        validatePhase(op.phase);
        if (!isDryRun) {
          await ctx.db.patch(op.agentId, { phase: op.phase, agentOrder: op.agentOrder, updatedBy: actor, updatedAt: now });
        }
        byId.set(agent._id, { ...agent, phase: op.phase, agentOrder: op.agentOrder, updatedBy: actor, updatedAt: now } as Doc<"agents">);
        summary.push("moved agent");
      } else if (op.type === "delete_agent") {
        const agent = byId.get(op.agentId as Id<"agents">);
        if (!agent) throw new Error("Validation: agentId not in canvas");
        if (!isDryRun) {
          await recordHistory(ctx, agent._id, actor, CHANGE_TYPE.DELETE, getAgentSnapshot(agent));
          await ctx.db.patch(op.agentId, { deletedAt: now, updatedBy: actor, updatedAt: now });
        }
        byId.delete(agent._id);
        summary.push("deleted agent");
      } else {
        throw new Error(`Validation: Unsupported operation ${op.type}`);
      }
    }

    if (!isDryRun && args.operations.length > 0) {
      await ctx.db.patch(canvasState._id, {
        updatedBy: actor,
        updatedAt: now,
      });
    }

    return { ok: true, dryRun: isDryRun, summary, operationCount: args.operations.length };
  },
});

export const getRecentActivity = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    canvasId: v.optional(v.id("canvases")),
    canvasSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
    updatedSince: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "canvas:read");
    const targetCanvas =
      args.canvasId || args.canvasSlug || token.defaultCanvasId
        ? await resolveCanvas(ctx, token.workosOrgId, args.canvasId, args.canvasSlug, token.defaultCanvasId)
        : null;
    const entries = await ctx.db
      .query("agentHistory")
      .collect();

    const tokenEntries = await ctx.db.query("mcpTokens").collect();
    const tokenNameById = new Map(tokenEntries.map((token) => [`mcp_token:${token._id}`, token.name]));

    const activity = [] as any[];
    for (const entry of entries) {
      const agent = await ctx.db.get(entry.agentId);
      if (!agent) continue;
      const canvas = await ctx.db.get(agent.canvasId);
      if (!canvas || canvas.deletedAt || canvas.workosOrgId !== token.workosOrgId) continue;
      if (args.updatedSince && entry.changedAt < args.updatedSince) continue;
      if (targetCanvas && canvas._id !== targetCanvas._id) continue;

      activity.push({
        activityId: `${entry._id}`,
        changedAt: entry.changedAt,
        changeType: entry.changeType,
        actor: tokenNameById.get(entry.changedBy) ?? entry.changedBy,
        canvas: { canvasId: canvas._id, slug: canvas.slug, title: canvas.title },
        agent: { agentId: agent._id, name: agent.name },
      });
    }

    return activity.sort((a, b) => b.changedAt - a.changedAt).slice(0, args.limit ?? 25);
  },
});
