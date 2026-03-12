import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { AGENT_MODEL_VERSION } from "../shared/agentModel";
import { getAgentSnapshot, recordHistory } from "./lib/helpers";
import { deepMerge } from "./lib/deepMerge";
import { applyCanvasStateOperation, resolveDryRun } from "./lib/mcpHelpers";
import {
  artifactStatusValidator,
  buildDepartmentSnapshot,
  buildOverviewSnapshot,
  buildServiceSnapshot,
  departmentAnalysisPayloadValidator,
  listMapChildren,
  normalizeSlug,
  recordTransformationHistory,
  serviceAnalysisPayloadValidator,
} from "./lib/transformationMap";
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

async function resolveTransformationMap(
  ctx: any,
  workosOrgId: string,
  mapId?: Id<"transformationMaps">,
  mapSlug?: string
) {
  if (mapId) {
    const byId = await ctx.db.get(mapId);
    if (!byId || byId.workosOrgId !== workosOrgId) {
      throw new Error("NotFound: Transformation Map not found");
    }
    return byId;
  }

  if (mapSlug) {
    const bySlug = await ctx.db
      .query("transformationMaps")
      .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", mapSlug))
      .first();
    if (!bySlug) {
      throw new Error("NotFound: Transformation Map not found");
    }
    return bySlug;
  }

  const maps = await ctx.db
    .query("transformationMaps")
    .withIndex("by_org", (q: any) => q.eq("workosOrgId", workosOrgId))
    .collect();
  const [latest] = maps.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  if (!latest) {
    throw new Error("Validation: mapId or mapSlug is required");
  }
  return latest;
}

async function ensureUniqueTransformationMapSlug(
  ctx: any,
  workosOrgId: string,
  slug: string,
  excludeMapId?: Id<"transformationMaps">
) {
  const existing = await ctx.db
    .query("transformationMaps")
    .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", slug))
    .first();

  if (existing && existing._id !== excludeMapId) {
    throw new Error("Validation: A Transformation Map with this slug already exists");
  }
}

async function getTransformationDepartmentByKey(ctx: any, mapId: Id<"transformationMaps">, departmentKey: string) {
  const department = await ctx.db
    .query("transformationDepartments")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", departmentKey))
    .first();
  if (!department) {
    throw new Error("NotFound: Department not found");
  }
  return department;
}

async function getTransformationServiceByKey(ctx: any, mapId: Id<"transformationMaps">, serviceKey: string) {
  const service = await ctx.db
    .query("transformationServices")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", serviceKey))
    .first();
  if (!service) {
    throw new Error("NotFound: Service not found");
  }
  return service;
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
        // MCP clients may send partial nested patches such as metrics.roi; merge
        // them into the existing fieldValues tree instead of replacing siblings.
        ? deepMerge(existingFieldValues, fieldValuesPatch)
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

export const createCanvas = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    title: v.string(),
    slug: v.string(),
    phases: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { tokenPrefix, tokenHash, title, slug, phases, categories }) => {
    const token = await requireToken(ctx, tokenPrefix, tokenHash, "canvas:write");
    validateTitle(title);
    validateSlug(slug);

    await ensureUniqueCanvasSlug(ctx, token.workosOrgId, slug);

    const now = Date.now();
    const canvasId = await ctx.db.insert("canvases", {
      workosOrgId: token.workosOrgId,
      title,
      slug,
      phases: phases ?? ["Backlog"],
      categories: categories ?? ["Uncategorized"],
      createdBy: `mcp_token:${token._id}`,
      updatedBy: `mcp_token:${token._id}`,
      createdAt: now,
      updatedAt: now,
    });

    return {
      canvasId,
      slug,
      title,
      phases: phases ?? ["Backlog"],
      categories: categories ?? ["Uncategorized"],
      updatedAt: now,
    };
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
      // expectedUpdatedAt is checked at canvas scope, so any successful agent
      // mutation must advance the canvas version as well.
      await ctx.db.patch(canvasState._id, {
        updatedBy: actor,
        updatedAt: now,
      });
    }

    return { ok: true, dryRun: isDryRun, summary, operationCount: args.operations.length };
  },
});

export const listTransformationMaps = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    text: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tokenPrefix, tokenHash, text, limit }) => {
    const token = await requireToken(ctx, tokenPrefix, tokenHash, "transformation:read");
    const maps = await ctx.db
      .query("transformationMaps")
      .withIndex("by_org", (q) => q.eq("workosOrgId", token.workosOrgId))
      .collect();

    const normalized = text?.trim().toLowerCase();
    return maps
      .filter((map) => {
        if (!normalized) return true;
        return map.title.toLowerCase().includes(normalized) || map.slug.toLowerCase().includes(normalized);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit ?? 25)
      .map((map) => ({
        mapId: map._id,
        slug: map.slug,
        title: map.title,
        status: map.status,
        updatedAt: map.updatedAt,
      }));
  },
});

export const createTransformationMap = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { tokenPrefix, tokenHash, title, slug, description }) => {
    const token = await requireToken(ctx, tokenPrefix, tokenHash, "transformation:write");
    const normalizedSlug = normalizeSlug(slug ?? title);
    if (!normalizedSlug) {
      throw new Error("Validation: slug is required");
    }
    await ensureUniqueTransformationMapSlug(ctx, token.workosOrgId, normalizedSlug);
    const now = Date.now();
    const actor = `mcp_token:${token._id}`;
    const mapId = await ctx.db.insert("transformationMaps", {
      workosOrgId: token.workosOrgId,
      title,
      slug: normalizedSlug,
      description,
      status: "draft",
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
    await recordTransformationHistory(ctx, {
      workosOrgId: token.workosOrgId,
      mapId,
      entityType: "map",
      entityId: `${mapId}`,
      changedBy: actor,
      changeType: "create",
      nextData: { title, slug: normalizedSlug, description, status: "draft" },
    });
    return { mapId, slug: normalizedSlug, title, updatedAt: now };
  },
});

export const getTransformationMapSnapshot = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    view: v.optional(v.union(v.literal("compact"), v.literal("full"))),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:read");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const children = await listMapChildren(ctx, map._id);
    const snapshot = buildOverviewSnapshot({ map, ...children });
    if (args.view === "compact") {
      return snapshot;
    }
    return {
      ...snapshot,
      objectives: children.objectives
        .sort((a, b) => a.order - b.order)
        .map((objective) => ({
          id: objective.key,
          scope: objective.scope,
          departmentId: objective.departmentKey,
          title: objective.title,
          description: objective.description,
          linkedPressureIds: objective.linkedPressureKeys,
        })),
      departments: children.departments
        .sort((a, b) => a.order - b.order)
        .map((department) => ({
          id: department.key,
          name: department.name,
          description: department.description,
          keyIssues: department.keyIssues,
          improvementMandates: department.improvementMandates,
        })),
      services: children.services
        .sort((a, b) => a.order - b.order)
        .map((service) => ({
          id: service.key,
          departmentId: service.departmentKey,
          name: service.name,
          purpose: service.purpose,
          status: service.status,
          customer: service.customer,
          trigger: service.trigger,
          outcome: service.outcome,
          constraints: service.constraints,
          effectivenessMetric: service.effectivenessMetric,
          efficiencyMetric: service.efficiencyMetric,
        })),
    };
  },
});

export const getTransformationDepartmentSnapshot = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    departmentKey: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:read");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const department = await getTransformationDepartmentByKey(ctx, map._id, args.departmentKey);
    const [objectives, services, analyses] = await Promise.all([
      ctx.db
        .query("transformationObjectives")
        .withIndex("by_map_department", (q) => q.eq("mapId", map._id).eq("departmentKey", args.departmentKey))
        .collect(),
      ctx.db
        .query("transformationServices")
        .withIndex("by_department", (q) => q.eq("mapId", map._id).eq("departmentKey", args.departmentKey))
        .collect(),
      listMapChildren(ctx, map._id).then((children) => children.analyses),
    ]);
    return buildDepartmentSnapshot({ map, department, objectives, services, analyses });
  },
});

export const getTransformationServiceSnapshot = query({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    serviceKey: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:read");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const service = await getTransformationServiceByKey(ctx, map._id, args.serviceKey);
    const department = await getTransformationDepartmentByKey(ctx, map._id, service.departmentKey);
    const analysis = await ctx.db
      .query("transformationServiceAnalyses")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .first();
    return buildServiceSnapshot({ map, department, service, analysis: analysis ?? null });
  },
});

export const applyTransformationMapChanges = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    expectedUpdatedAt: v.optional(v.number()),
    operations: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:write");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const isDryRun = resolveDryRun(args.dryRun);
    if (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== map.updatedAt) {
      return { ok: false, conflict: { expectedUpdatedAt: args.expectedUpdatedAt, actualUpdatedAt: map.updatedAt } };
    }

    const actor = `mcp_token:${token._id}`;
    const now = Date.now();
    const summary: string[] = [];

    for (const op of args.operations) {
      if (op.type === "update_map") {
        const nextSlug = op.slug !== undefined ? normalizeSlug(op.slug) : map.slug;
        if (!nextSlug) throw new Error("Validation: slug is required");
        if (nextSlug !== map.slug) {
          await ensureUniqueTransformationMapSlug(ctx, token.workosOrgId, nextSlug, map._id);
        }
        if (!isDryRun) {
          await ctx.db.patch(map._id, {
            ...(op.title !== undefined ? { title: op.title } : {}),
            ...(op.description !== undefined ? { description: op.description } : {}),
            ...(op.slug !== undefined ? { slug: nextSlug } : {}),
            updatedBy: actor,
            updatedAt: now,
          });
        }
        summary.push("updated map");
      } else if (op.type === "create_department") {
        if (!op.key || !op.name) throw new Error("Validation: create_department requires key and name");
        const existing = await ctx.db
          .query("transformationDepartments")
          .withIndex("by_map_key", (q) => q.eq("mapId", map._id).eq("key", op.key))
          .first();
        if (existing) throw new Error(`Validation: Department key already exists: ${op.key}`);
        if (!isDryRun) {
          await ctx.db.insert("transformationDepartments", {
            mapId: map._id,
            key: op.key,
            order: op.order ?? now,
            name: op.name,
            description: op.description ?? "",
            keyIssues: op.keyIssues ?? [],
            improvementMandates: op.improvementMandates ?? [],
            artifactStatus: "reviewed",
            sourceType: "system",
            sourceRef: "mcp.apply_transformation_map_changes",
            createdBy: actor,
            updatedBy: actor,
            createdAt: now,
            updatedAt: now,
          });
        }
        summary.push("created department");
      } else if (op.type === "update_department") {
        const department = await getTransformationDepartmentByKey(ctx, map._id, op.departmentKey);
        if (!isDryRun) {
          await ctx.db.patch(department._id, {
            ...(op.name !== undefined ? { name: op.name } : {}),
            ...(op.description !== undefined ? { description: op.description } : {}),
            ...(op.keyIssues !== undefined ? { keyIssues: op.keyIssues } : {}),
            ...(op.improvementMandates !== undefined ? { improvementMandates: op.improvementMandates } : {}),
            ...(op.order !== undefined ? { order: op.order } : {}),
            updatedBy: actor,
            updatedAt: now,
          });
        }
        summary.push("updated department");
      } else if (op.type === "reorder_departments") {
        if (!Array.isArray(op.departmentKeys)) throw new Error("Validation: reorder_departments requires departmentKeys");
        if (!isDryRun) {
          for (const [index, departmentKey] of op.departmentKeys.entries()) {
            const department = await getTransformationDepartmentByKey(ctx, map._id, departmentKey);
            await ctx.db.patch(department._id, { order: index, updatedBy: actor, updatedAt: now });
          }
        }
        summary.push("reordered departments");
      } else if (op.type === "create_service") {
        if (!op.key || !op.departmentKey || !op.name) {
          throw new Error("Validation: create_service requires key, departmentKey, and name");
        }
        if (!isDryRun) {
          await ctx.db.insert("transformationServices", {
            mapId: map._id,
            key: op.key,
            departmentKey: op.departmentKey,
            order: op.order ?? now,
            name: op.name,
            purpose: op.purpose ?? "",
            customer: op.customer ?? "",
            trigger: op.trigger ?? "",
            outcome: op.outcome ?? "",
            constraints: op.constraints ?? [],
            status: op.status ?? "not-analyzed",
            effectivenessMetric: op.effectivenessMetric ?? "Not yet assessed.",
            efficiencyMetric: op.efficiencyMetric ?? "Not yet assessed.",
            artifactStatus: "reviewed",
            sourceType: "system",
            sourceRef: "mcp.apply_transformation_map_changes",
            createdBy: actor,
            updatedBy: actor,
            createdAt: now,
            updatedAt: now,
          });
        }
        summary.push("created service");
      } else if (op.type === "update_service") {
        const service = await getTransformationServiceByKey(ctx, map._id, op.serviceKey);
        if (!isDryRun) {
          await ctx.db.patch(service._id, {
            ...(op.name !== undefined ? { name: op.name } : {}),
            ...(op.departmentKey !== undefined ? { departmentKey: op.departmentKey } : {}),
            ...(op.purpose !== undefined ? { purpose: op.purpose } : {}),
            ...(op.customer !== undefined ? { customer: op.customer } : {}),
            ...(op.trigger !== undefined ? { trigger: op.trigger } : {}),
            ...(op.outcome !== undefined ? { outcome: op.outcome } : {}),
            ...(op.constraints !== undefined ? { constraints: op.constraints } : {}),
            ...(op.status !== undefined ? { status: op.status } : {}),
            ...(op.effectivenessMetric !== undefined ? { effectivenessMetric: op.effectivenessMetric } : {}),
            ...(op.efficiencyMetric !== undefined ? { efficiencyMetric: op.efficiencyMetric } : {}),
            ...(op.order !== undefined ? { order: op.order } : {}),
            updatedBy: actor,
            updatedAt: now,
          });
        }
        summary.push("updated service");
      } else if (op.type === "reorder_services") {
        if (!op.departmentKey || !Array.isArray(op.serviceKeys)) {
          throw new Error("Validation: reorder_services requires departmentKey and serviceKeys");
        }
        if (!isDryRun) {
          for (const [index, serviceKey] of op.serviceKeys.entries()) {
            const service = await getTransformationServiceByKey(ctx, map._id, serviceKey);
            await ctx.db.patch(service._id, { order: index, departmentKey: op.departmentKey, updatedBy: actor, updatedAt: now });
          }
        }
        summary.push("reordered services");
      } else {
        throw new Error(`Validation: Unsupported operation ${op.type}`);
      }
    }

    if (!isDryRun && args.operations.length > 0) {
      await ctx.db.patch(map._id, {
        updatedBy: actor,
        updatedAt: now,
      });
    }

    return { ok: true, dryRun: isDryRun, summary, operationCount: args.operations.length };
  },
});

export const applyTransformationDepartmentAnalysis = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    expectedUpdatedAt: v.optional(v.number()),
    departmentKey: v.string(),
    payload: departmentAnalysisPayloadValidator,
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:write");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const isDryRun = resolveDryRun(args.dryRun);
    if (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== map.updatedAt) {
      return { ok: false, conflict: { expectedUpdatedAt: args.expectedUpdatedAt, actualUpdatedAt: map.updatedAt } };
    }

    const department = await getTransformationDepartmentByKey(ctx, map._id, args.departmentKey);
    const actor = `mcp_token:${token._id}`;
    const now = Date.now();

    if (!isDryRun) {
      await ctx.db.patch(department._id, {
        description: args.payload.description,
        keyIssues: args.payload.keyIssues ?? department.keyIssues,
        improvementMandates: args.payload.improvementMandates.map((objective) => objective.title),
        sourceType: args.payload.sourceType ?? "ai_generated",
        sourceRef: args.payload.sourceRef,
        updatedBy: actor,
        updatedAt: now,
      });

      const existingObjectives = await ctx.db
        .query("transformationObjectives")
        .withIndex("by_map_department", (q) => q.eq("mapId", map._id).eq("departmentKey", args.departmentKey))
        .collect();
      const objectiveByKey = new Map(existingObjectives.map((objective) => [objective.key, objective]));
      for (const [index, objective] of args.payload.improvementMandates.entries()) {
        const existing = objectiveByKey.get(objective.key);
        const patch = {
          mapId: map._id,
          key: objective.key,
          order: index,
          scope: "department" as const,
          departmentKey: args.departmentKey,
          title: objective.title,
          description: objective.description,
          linkedPressureKeys: objective.linkedPressureKeys,
          artifactStatus: "reviewed" as const,
          sourceType: args.payload.sourceType ?? "ai_generated",
          sourceRef: args.payload.sourceRef,
          updatedBy: actor,
          updatedAt: now,
        };
        if (existing) {
          await ctx.db.patch(existing._id, patch);
        } else {
          await ctx.db.insert("transformationObjectives", {
            ...patch,
            createdBy: actor,
            createdAt: now,
          });
        }
      }

      const existingServices = await ctx.db
        .query("transformationServices")
        .withIndex("by_department", (q) => q.eq("mapId", map._id).eq("departmentKey", args.departmentKey))
        .collect();
      const serviceByKey = new Map(existingServices.map((service) => [service.key, service]));
      for (const [index, service] of args.payload.services.entries()) {
        const existing = serviceByKey.get(service.key);
        const patch = {
          mapId: map._id,
          key: service.key,
          departmentKey: args.departmentKey,
          order: index,
          name: service.name,
          purpose: service.purpose,
          customer: service.customer,
          trigger: service.trigger,
          outcome: service.outcome,
          constraints: service.constraints,
          status: service.status,
          effectivenessMetric: service.effectivenessMetric,
          efficiencyMetric: service.efficiencyMetric,
          artifactStatus: "reviewed" as const,
          sourceType: args.payload.sourceType ?? "ai_generated",
          sourceRef: args.payload.sourceRef,
          updatedBy: actor,
          updatedAt: now,
        };
        if (existing) {
          await ctx.db.patch(existing._id, patch);
        } else {
          await ctx.db.insert("transformationServices", {
            ...patch,
            createdBy: actor,
            createdAt: now,
          });
        }
      }

      await ctx.db.patch(map._id, { updatedBy: actor, updatedAt: now });
      await recordTransformationHistory(ctx, {
        workosOrgId: token.workosOrgId,
        mapId: map._id,
        entityType: "department",
        entityId: args.departmentKey,
        changedBy: actor,
        changeType: "update",
        previousData: { description: department.description, keyIssues: department.keyIssues },
        nextData: args.payload,
      });
    }

    return { ok: true, dryRun: isDryRun, summary: ["applied department analysis"] };
  },
});

export const applyTransformationServiceAnalysis = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    expectedUpdatedAt: v.optional(v.number()),
    serviceKey: v.string(),
    payload: serviceAnalysisPayloadValidator,
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:write");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const isDryRun = resolveDryRun(args.dryRun);
    if (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== map.updatedAt) {
      return { ok: false, conflict: { expectedUpdatedAt: args.expectedUpdatedAt, actualUpdatedAt: map.updatedAt } };
    }

    const service = await getTransformationServiceByKey(ctx, map._id, args.serviceKey);
    const actor = `mcp_token:${token._id}`;
    const now = Date.now();
    const existingAnalysis = await ctx.db
      .query("transformationServiceAnalyses")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .first();

    if (!isDryRun) {
      await ctx.db.patch(service._id, {
        ...args.payload.service,
        artifactStatus: args.payload.reviewStatus ?? "reviewed",
        sourceType: args.payload.sourceType ?? "ai_generated",
        sourceRef: args.payload.sourceRef,
        updatedBy: actor,
        updatedAt: now,
      });

      const analysisPatch = {
        mapId: map._id,
        serviceId: service._id,
        reviewStatus: args.payload.reviewStatus ?? "reviewed",
        sourceType: args.payload.sourceType ?? "ai_generated",
        sourceRef: args.payload.sourceRef,
        generatedAt: args.payload.sourceType && args.payload.sourceType !== "human" ? now : existingAnalysis?.generatedAt,
        idealFlowSteps: args.payload.idealFlowSteps,
        currentFlowSteps: args.payload.currentFlowSteps,
        deviations: args.payload.deviations,
        initiatives: args.payload.initiatives,
        updatedBy: actor,
        updatedAt: now,
      };

      if (existingAnalysis) {
        await ctx.db.patch(existingAnalysis._id, analysisPatch);
      } else {
        await ctx.db.insert("transformationServiceAnalyses", {
          ...analysisPatch,
          createdBy: actor,
          createdAt: now,
        });
      }

      await ctx.db.patch(map._id, { updatedBy: actor, updatedAt: now });
      await recordTransformationHistory(ctx, {
        workosOrgId: token.workosOrgId,
        mapId: map._id,
        entityType: "service_analysis",
        entityId: args.serviceKey,
        changedBy: actor,
        changeType: existingAnalysis ? "update" : "create",
        previousData: existingAnalysis
          ? {
              reviewStatus: existingAnalysis.reviewStatus,
              idealFlowSteps: existingAnalysis.idealFlowSteps,
              currentFlowSteps: existingAnalysis.currentFlowSteps,
              deviations: existingAnalysis.deviations,
              initiatives: existingAnalysis.initiatives,
            }
          : undefined,
        nextData: args.payload,
      });
    }

    return { ok: true, dryRun: isDryRun, summary: ["applied service analysis"] };
  },
});

export const setTransformationReviewStatus = mutation({
  args: {
    tokenPrefix: v.string(),
    tokenHash: v.string(),
    mapId: v.optional(v.id("transformationMaps")),
    mapSlug: v.optional(v.string()),
    serviceKey: v.string(),
    reviewStatus: artifactStatusValidator,
  },
  handler: async (ctx, args) => {
    const token = await requireToken(ctx, args.tokenPrefix, args.tokenHash, "transformation:review");
    const map = await resolveTransformationMap(ctx, token.workosOrgId, args.mapId, args.mapSlug);
    const service = await getTransformationServiceByKey(ctx, map._id, args.serviceKey);
    const analysis = await ctx.db
      .query("transformationServiceAnalyses")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .first();
    if (!analysis) {
      throw new Error("NotFound: Service analysis not found");
    }

    const actor = `mcp_token:${token._id}`;
    const now = Date.now();
    await ctx.db.patch(analysis._id, {
      reviewStatus: args.reviewStatus,
      lastReviewedBy: actor,
      lastReviewedAt: now,
      updatedBy: actor,
      updatedAt: now,
    });
    await ctx.db.patch(map._id, { updatedBy: actor, updatedAt: now });
    await recordTransformationHistory(ctx, {
      workosOrgId: token.workosOrgId,
      mapId: map._id,
      entityType: "service_analysis",
      entityId: args.serviceKey,
      changedBy: actor,
      changeType: "update",
      previousData: { reviewStatus: analysis.reviewStatus },
      nextData: { reviewStatus: args.reviewStatus },
    });

    return { ok: true, reviewStatus: args.reviewStatus, changedAt: now };
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
