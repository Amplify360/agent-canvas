import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireOrgAccess, requireOrgAdmin } from "./lib/auth";
import {
  artifactStatusValidator,
  buildDepartmentSnapshot,
  buildOverviewSnapshot,
  buildServiceSnapshot,
  deleteTransformationMapCascade,
  departmentAnalysisPayloadValidator,
  listServiceAnalysesForServices,
  listMapChildren,
  normalizeSlug,
  recordTransformationHistory,
  serviceAnalysisPayloadValidator,
  serviceStatusValidator,
  sortByOrder,
} from "./lib/transformationMap";
import {
  MOCK_DEPARTMENTS,
  MOCK_DEVIATIONS,
  MOCK_FLOW_STEPS,
  MOCK_INITIATIVES,
  MOCK_OBJECTIVES,
  MOCK_PRESSURES,
  MOCK_SERVICES,
} from "../shared/transformationMapPrototype";

function buildArtifactMeta(actor: string, now: number, sourceType: "human" | "imported" | "system" | "ai_generated" | "ai_edited" = "human") {
  return {
    artifactStatus: "approved" as const,
    sourceType,
    createdBy: actor,
    updatedBy: actor,
    createdAt: now,
    updatedAt: now,
    generatedAt: sourceType === "imported" ? now : undefined,
  };
}

async function getMapWithAccess(ctx: any, mapId: Id<"transformationMaps">, auth: Awaited<ReturnType<typeof requireAuth>>) {
  const map = await ctx.db.get(mapId);
  if (!map) {
    throw new Error("NotFound: Transformation Map not found");
  }
  requireOrgAccess(auth, map.workosOrgId);
  return map;
}

async function getMapBySlugWithAccess(ctx: any, workosOrgId: string, slug: string, auth: Awaited<ReturnType<typeof requireAuth>>) {
  requireOrgAccess(auth, workosOrgId);
  const map = await ctx.db
    .query("transformationMaps")
    .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", slug))
    .first();
  if (!map) {
    throw new Error("NotFound: Transformation Map not found");
  }
  return map;
}

async function getDepartmentByKey(ctx: any, mapId: Id<"transformationMaps">, departmentKey: string) {
  const department = await findDepartmentByKey(ctx, mapId, departmentKey);
  if (!department) {
    throw new Error("NotFound: Department not found");
  }
  return department;
}

async function getPressureByKey(ctx: any, mapId: Id<"transformationMaps">, pressureKey: string) {
  const pressure = await findPressureByKey(ctx, mapId, pressureKey);
  if (!pressure) {
    throw new Error("NotFound: Pressure not found");
  }
  return pressure;
}

async function findPressureByKey(ctx: any, mapId: Id<"transformationMaps">, pressureKey: string) {
  const pressure = await ctx.db
    .query("transformationPressures")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", pressureKey))
    .first();
  return pressure;
}

async function getObjectiveByKey(ctx: any, mapId: Id<"transformationMaps">, objectiveKey: string) {
  const objective = await findObjectiveByKey(ctx, mapId, objectiveKey);
  if (!objective) {
    throw new Error("NotFound: Objective not found");
  }
  return objective;
}

async function findObjectiveByKey(ctx: any, mapId: Id<"transformationMaps">, objectiveKey: string) {
  const objective = await ctx.db
    .query("transformationObjectives")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", objectiveKey))
    .first();
  return objective;
}

async function findDepartmentByKey(ctx: any, mapId: Id<"transformationMaps">, departmentKey: string) {
  const department = await ctx.db
    .query("transformationDepartments")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", departmentKey))
    .first();
  return department;
}

async function getServiceByKey(ctx: any, mapId: Id<"transformationMaps">, serviceKey: string) {
  const service = await findServiceByKey(ctx, mapId, serviceKey);
  if (!service) {
    throw new Error("NotFound: Service not found");
  }
  return service;
}

async function findServiceByKey(ctx: any, mapId: Id<"transformationMaps">, serviceKey: string) {
  const service = await ctx.db
    .query("transformationServices")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", serviceKey))
    .first();
  return service;
}

async function ensureUniqueMapSlug(ctx: any, workosOrgId: string, slug: string, excludeMapId?: Id<"transformationMaps">) {
  const existing = await ctx.db
    .query("transformationMaps")
    .withIndex("by_org_slug", (q: any) => q.eq("workosOrgId", workosOrgId).eq("slug", slug))
    .first();

  if (existing && existing._id !== excludeMapId) {
    throw new Error("Validation: A transformation map with this slug already exists");
  }
}

async function ensureUniqueServiceKey(
  ctx: any,
  mapId: Id<"transformationMaps">,
  serviceKey: string,
  excludeServiceId?: Id<"transformationServices">
) {
  const existing = await ctx.db
    .query("transformationServices")
    .withIndex("by_map_key", (q: any) => q.eq("mapId", mapId).eq("key", serviceKey))
    .first();

  if (existing && existing._id !== excludeServiceId) {
    throw new Error(`Validation: Service key already exists: ${serviceKey}`);
  }
}

async function touchMap(ctx: any, mapId: Id<"transformationMaps">, actor: string, now: number) {
  await ctx.db.patch(mapId, {
    updatedBy: actor,
    updatedAt: now,
  });
}

async function syncDepartmentMandates(
  ctx: any,
  mapId: Id<"transformationMaps">,
  departmentKey: string,
  actor: string,
  now: number
) {
  const [department, objectives] = await Promise.all([
    findDepartmentByKey(ctx, mapId, departmentKey),
    ctx.db
      .query("transformationObjectives")
      .withIndex("by_map_department", (q: any) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
      .collect(),
  ]);

  if (!department) {
    return;
  }

  const sortedObjectives = [...objectives].sort((left: any, right: any) => left.order - right.order);

  await ctx.db.patch(department._id, {
    improvementMandates: sortedObjectives.map((objective: any) => objective.title),
    updatedBy: actor,
    updatedAt: now,
  });
}

async function removeServiceCascade(
  ctx: any,
  args: {
    map: any;
    service: any;
    actor: string;
    now: number;
  }
) {
  const analysis = await ctx.db
    .query("transformationServiceAnalyses")
    .withIndex("by_service", (q: any) => q.eq("serviceId", args.service._id))
    .first();

  if (analysis) {
    await ctx.db.delete(analysis._id);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "service_analysis",
      entityId: args.service.key,
      changedBy: args.actor,
      changeType: "delete",
      previousData: {
        reviewStatus: analysis.reviewStatus,
        idealFlowSteps: analysis.idealFlowSteps,
        currentFlowSteps: analysis.currentFlowSteps,
        deviations: analysis.deviations,
        initiatives: analysis.initiatives,
      },
    });
  }

  await ctx.db.delete(args.service._id);
  await recordTransformationHistory(ctx, {
    workosOrgId: args.map.workosOrgId,
    mapId: args.map._id,
    entityType: "service",
    entityId: args.service.key,
    changedBy: args.actor,
    changeType: "delete",
    previousData: {
      departmentKey: args.service.departmentKey,
      name: args.service.name,
      purpose: args.service.purpose,
      customer: args.service.customer,
      trigger: args.service.trigger,
      outcome: args.service.outcome,
      constraints: args.service.constraints,
      status: args.service.status,
      effectivenessMetric: args.service.effectivenessMetric,
      efficiencyMetric: args.service.efficiencyMetric,
    },
  });
}

async function seedPrototypeMap(ctx: any, workosOrgId: string, actor: string) {
  const now = Date.now();
  const title = "Transformation Map";
  const slug = "transformation-map";
  const mapId = await ctx.db.insert("transformationMaps", {
    workosOrgId,
    title,
    slug,
    status: "active",
    createdBy: actor,
    updatedBy: actor,
    createdAt: now,
    updatedAt: now,
  });

  const departmentObjectiveTitles = new Map<string, string[]>();
  for (const objective of MOCK_OBJECTIVES.filter((entry) => entry.scope === "department" && entry.departmentId)) {
    const current = departmentObjectiveTitles.get(objective.departmentId!) ?? [];
    departmentObjectiveTitles.set(objective.departmentId!, [...current, objective.title]);
  }

  for (const [index, pressure] of MOCK_PRESSURES.entries()) {
    await ctx.db.insert("transformationPressures", {
      mapId,
      key: pressure.id,
      order: index,
      type: pressure.type,
      title: pressure.title,
      description: pressure.description,
      evidence: pressure.evidence,
      ...buildArtifactMeta(actor, now, "imported"),
    });
  }

  for (const [index, objective] of MOCK_OBJECTIVES.entries()) {
    await ctx.db.insert("transformationObjectives", {
      mapId,
      key: objective.id,
      order: index,
      scope: objective.scope,
      departmentKey: objective.departmentId,
      title: objective.title,
      description: objective.description,
      linkedPressureKeys: objective.linkedPressureIds,
      ...buildArtifactMeta(actor, now, "imported"),
    });
  }

  for (const [index, department] of MOCK_DEPARTMENTS.entries()) {
    await ctx.db.insert("transformationDepartments", {
      mapId,
      key: department.id,
      order: index,
      name: department.name,
      description: department.description,
      keyIssues: department.keyIssues,
      improvementMandates: departmentObjectiveTitles.get(department.id) ?? [],
      ...buildArtifactMeta(actor, now, "imported"),
    });
  }

  const serviceIds = new Map<string, Id<"transformationServices">>();
  const serviceOrderByDepartment = new Map<string, number>();
  for (const service of MOCK_SERVICES) {
    const nextOrder = serviceOrderByDepartment.get(service.departmentId) ?? 0;
    serviceOrderByDepartment.set(service.departmentId, nextOrder + 1);
    const serviceId = await ctx.db.insert("transformationServices", {
      mapId,
      key: service.id,
      departmentKey: service.departmentId,
      order: nextOrder,
      name: service.name,
      purpose: service.purpose,
      customer: service.customer,
      trigger: service.trigger,
      outcome: service.outcome,
      constraints: service.constraints,
      status: service.status,
      effectivenessMetric: service.effectivenessMetric,
      efficiencyMetric: service.efficiencyMetric,
      ...buildArtifactMeta(actor, now, "imported"),
    });
    serviceIds.set(service.id, serviceId);
  }

  for (const service of MOCK_SERVICES) {
    const serviceId = serviceIds.get(service.id);
    if (!serviceId) continue;
    await ctx.db.insert("transformationServiceAnalyses", {
      mapId,
      serviceId,
      reviewStatus: "approved",
      sourceType: "imported",
      sourceRef: "strategy-prototype-seed",
      generatedAt: now,
      idealFlowSteps: sortByOrder(
        MOCK_FLOW_STEPS.filter((step) => step.serviceId === service.id && step.flowType === "ideal")
      ),
      currentFlowSteps: sortByOrder(
        MOCK_FLOW_STEPS.filter((step) => step.serviceId === service.id && step.flowType === "current")
      ),
      deviations: MOCK_DEVIATIONS.filter((deviation) => deviation.serviceId === service.id),
      initiatives: MOCK_INITIATIVES.filter((initiative) => initiative.serviceId === service.id),
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recordTransformationHistory(ctx, {
    workosOrgId,
    mapId,
    entityType: "map",
    entityId: `${mapId}`,
    changedBy: actor,
    changeType: "create",
    nextData: { title, slug, status: "active", seededFrom: "strategy-prototype" },
  });

  return mapId;
}

export const list = query({
  args: { workosOrgId: v.string() },
  handler: async (ctx, { workosOrgId }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    const maps = await ctx.db
      .query("transformationMaps")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .collect();

    return maps.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const ensurePrototypeMap = mutation({
  args: { workosOrgId: v.string() },
  handler: async (ctx, { workosOrgId }) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth, workosOrgId);

    const existing = await ctx.db
      .query("transformationMaps")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .collect();

    if (existing.length > 0) {
      return existing.sort((a, b) => b.updatedAt - a.updatedAt)[0]._id;
    }

    return seedPrototypeMap(ctx, workosOrgId, auth.workosUserId);
  },
});

export const create = mutation({
  args: {
    workosOrgId: v.string(),
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { workosOrgId, title, slug, description }) => {
    const auth = await requireAuth(ctx);
    requireOrgAccess(auth, workosOrgId);

    const normalizedSlug = normalizeSlug(slug ?? title);
    if (!normalizedSlug) {
      throw new Error("Validation: A slug is required");
    }
    await ensureUniqueMapSlug(ctx, workosOrgId, normalizedSlug);

    const now = Date.now();
    const mapId = await ctx.db.insert("transformationMaps", {
      workosOrgId,
      title,
      slug: normalizedSlug,
      description,
      status: "draft",
      createdBy: auth.workosUserId,
      updatedBy: auth.workosUserId,
      createdAt: now,
      updatedAt: now,
    });

    await recordTransformationHistory(ctx, {
      workosOrgId,
      mapId,
      entityType: "map",
      entityId: `${mapId}`,
      changedBy: auth.workosUserId,
      changeType: "create",
      nextData: { title, slug: normalizedSlug, description, status: "draft" },
    });

    return mapId;
  },
});

export const update = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { mapId, title, slug, description }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const previousData = { title: map.title, slug: map.slug, description: map.description };
    const nextSlug = slug !== undefined ? normalizeSlug(slug) : map.slug;
    if (!nextSlug) {
      throw new Error("Validation: A slug is required");
    }
    if (nextSlug !== map.slug) {
      await ensureUniqueMapSlug(ctx, map.workosOrgId, nextSlug, mapId);
    }

    const nextData = {
      title: title ?? map.title,
      slug: nextSlug,
      description: description ?? map.description,
    };

    await ctx.db.patch(mapId, {
      ...nextData,
      updatedBy: auth.workosUserId,
      updatedAt: Date.now(),
    });

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "map",
      entityId: `${mapId}`,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData,
      nextData,
    });
  },
});

export const setMapStatus = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    status: v.union(v.literal("draft"), v.literal("in_review"), v.literal("active"), v.literal("archived")),
  },
  handler: async (ctx, { mapId, status }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    await ctx.db.patch(mapId, {
      status,
      updatedBy: auth.workosUserId,
      updatedAt: Date.now(),
    });
    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "map",
      entityId: `${mapId}`,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: { status: map.status },
      nextData: { status },
    });
  },
});

export const removeMap = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    confirmDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, { mapId, confirmDelete }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);

    if (!confirmDelete) {
      throw new Error("Validation: confirmDelete is required");
    }

    await deleteTransformationMapCascade(ctx, {
      map,
      changedBy: auth.workosUserId,
    });

    return { ok: true };
  },
});

export const updatePressure = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    pressureKey: v.string(),
    type: v.optional(v.union(v.literal("external"), v.literal("internal"))),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    evidence: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { mapId, pressureKey, type, title, description, evidence }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const pressure = await getPressureByKey(ctx, mapId, pressureKey);
    const now = Date.now();
    const nextData = {
      type: type ?? pressure.type,
      title: title ?? pressure.title,
      description: description ?? pressure.description,
      evidence: evidence ?? pressure.evidence,
      sourceType: "human" as const,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    await ctx.db.patch(pressure._id, nextData);
    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "pressure",
      entityId: pressure.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: {
        type: pressure.type,
        title: pressure.title,
        description: pressure.description,
        evidence: pressure.evidence,
      },
      nextData,
    });

    return { ok: true };
  },
});

export const removePressure = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    pressureKey: v.string(),
  },
  handler: async (ctx, { mapId, pressureKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const pressure = await getPressureByKey(ctx, mapId, pressureKey);
    const now = Date.now();

    const objectives = await ctx.db
      .query("transformationObjectives")
      .withIndex("by_map", (q) => q.eq("mapId", mapId))
      .collect();

    for (const objective of objectives) {
      if (!objective.linkedPressureKeys.includes(pressureKey)) {
        continue;
      }

      const nextLinkedPressureKeys = objective.linkedPressureKeys.filter((key) => key !== pressureKey);
      await ctx.db.patch(objective._id, {
        linkedPressureKeys: nextLinkedPressureKeys,
        sourceType: "human",
        updatedBy: auth.workosUserId,
        updatedAt: now,
      });

      await recordTransformationHistory(ctx, {
        workosOrgId: map.workosOrgId,
        mapId,
        entityType: "objective",
        entityId: objective.key,
        changedBy: auth.workosUserId,
        changeType: "update",
        previousData: { linkedPressureKeys: objective.linkedPressureKeys },
        nextData: { linkedPressureKeys: nextLinkedPressureKeys },
      });
    }

    await ctx.db.delete(pressure._id);
    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "pressure",
      entityId: pressure.key,
      changedBy: auth.workosUserId,
      changeType: "delete",
      previousData: {
        type: pressure.type,
        title: pressure.title,
        description: pressure.description,
        evidence: pressure.evidence,
      },
    });

    return { ok: true };
  },
});

export const updateObjective = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    objectiveKey: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    linkedPressureKeys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { mapId, objectiveKey, title, description, linkedPressureKeys }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const objective = await getObjectiveByKey(ctx, mapId, objectiveKey);
    const now = Date.now();
    const nextData = {
      title: title ?? objective.title,
      description: description ?? objective.description,
      linkedPressureKeys: linkedPressureKeys ?? objective.linkedPressureKeys,
      sourceType: "human" as const,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    await ctx.db.patch(objective._id, nextData);

    if (objective.scope === "department" && objective.departmentKey) {
      await syncDepartmentMandates(ctx, mapId, objective.departmentKey, auth.workosUserId, now);
    }

    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "objective",
      entityId: objective.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: {
        title: objective.title,
        description: objective.description,
        linkedPressureKeys: objective.linkedPressureKeys,
      },
      nextData,
    });

    return { ok: true };
  },
});

export const removeObjective = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    objectiveKey: v.string(),
  },
  handler: async (ctx, { mapId, objectiveKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const objective = await getObjectiveByKey(ctx, mapId, objectiveKey);
    const now = Date.now();

    await ctx.db.delete(objective._id);

    if (objective.scope === "department" && objective.departmentKey) {
      await syncDepartmentMandates(ctx, mapId, objective.departmentKey, auth.workosUserId, now);
    }

    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "objective",
      entityId: objective.key,
      changedBy: auth.workosUserId,
      changeType: "delete",
      previousData: {
        scope: objective.scope,
        departmentKey: objective.departmentKey,
        title: objective.title,
        description: objective.description,
        linkedPressureKeys: objective.linkedPressureKeys,
      },
    });

    return { ok: true };
  },
});

export const updateDepartment = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    departmentKey: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    keyIssues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { mapId, departmentKey, name, description, keyIssues }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const department = await getDepartmentByKey(ctx, mapId, departmentKey);
    const now = Date.now();
    const nextData = {
      name: name ?? department.name,
      description: description ?? department.description,
      keyIssues: keyIssues ?? department.keyIssues,
      sourceType: "human" as const,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    await ctx.db.patch(department._id, nextData);
    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "department",
      entityId: department.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: {
        name: department.name,
        description: department.description,
        keyIssues: department.keyIssues,
      },
      nextData,
    });

    return { ok: true };
  },
});

export const removeDepartment = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    departmentKey: v.string(),
  },
  handler: async (ctx, { mapId, departmentKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const department = await getDepartmentByKey(ctx, mapId, departmentKey);
    const now = Date.now();

    const [objectives, services] = await Promise.all([
      ctx.db
        .query("transformationObjectives")
        .withIndex("by_map_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
        .collect(),
      ctx.db
        .query("transformationServices")
        .withIndex("by_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
        .collect(),
    ]);

    for (const objective of objectives) {
      await ctx.db.delete(objective._id);
      await recordTransformationHistory(ctx, {
        workosOrgId: map.workosOrgId,
        mapId,
        entityType: "objective",
        entityId: objective.key,
        changedBy: auth.workosUserId,
        changeType: "delete",
        previousData: {
          scope: objective.scope,
          departmentKey: objective.departmentKey,
          title: objective.title,
          description: objective.description,
          linkedPressureKeys: objective.linkedPressureKeys,
        },
      });
    }

    for (const service of services) {
      await removeServiceCascade(ctx, {
        map,
        service,
        actor: auth.workosUserId,
        now,
      });
    }

    await ctx.db.delete(department._id);
    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "department",
      entityId: department.key,
      changedBy: auth.workosUserId,
      changeType: "delete",
      previousData: {
        name: department.name,
        description: department.description,
        keyIssues: department.keyIssues,
        improvementMandates: department.improvementMandates,
      },
    });

    return { ok: true };
  },
});

export const updateService = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    serviceKey: v.string(),
    name: v.optional(v.string()),
    purpose: v.optional(v.string()),
    customer: v.optional(v.string()),
    trigger: v.optional(v.string()),
    outcome: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
    status: v.optional(serviceStatusValidator),
    effectivenessMetric: v.optional(v.string()),
    efficiencyMetric: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { mapId, serviceKey, name, purpose, customer, trigger, outcome, constraints, status, effectivenessMetric, efficiencyMetric }
  ) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const service = await getServiceByKey(ctx, mapId, serviceKey);
    const now = Date.now();
    const nextData = {
      name: name ?? service.name,
      purpose: purpose ?? service.purpose,
      customer: customer ?? service.customer,
      trigger: trigger ?? service.trigger,
      outcome: outcome ?? service.outcome,
      constraints: constraints ?? service.constraints,
      status: status ?? service.status,
      effectivenessMetric: effectivenessMetric ?? service.effectivenessMetric,
      efficiencyMetric: efficiencyMetric ?? service.efficiencyMetric,
      sourceType: "human" as const,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    await ctx.db.patch(service._id, nextData);
    await touchMap(ctx, mapId, auth.workosUserId, now);

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "service",
      entityId: service.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: {
        name: service.name,
        purpose: service.purpose,
        customer: service.customer,
        trigger: service.trigger,
        outcome: service.outcome,
        constraints: service.constraints,
        status: service.status,
        effectivenessMetric: service.effectivenessMetric,
        efficiencyMetric: service.efficiencyMetric,
      },
      nextData,
    });

    return { ok: true };
  },
});

export const removeService = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    serviceKey: v.string(),
  },
  handler: async (ctx, { mapId, serviceKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const service = await getServiceByKey(ctx, mapId, serviceKey);
    const now = Date.now();

    await removeServiceCascade(ctx, {
      map,
      service,
      actor: auth.workosUserId,
      now,
    });
    await touchMap(ctx, mapId, auth.workosUserId, now);

    return { ok: true };
  },
});

export const getOverviewSnapshot = query({
  args: { mapId: v.id("transformationMaps") },
  handler: async (ctx, { mapId }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const children = await listMapChildren(ctx, mapId);
    return buildOverviewSnapshot({ map, ...children });
  },
});

export const getDepartmentSnapshot = query({
  args: {
    mapId: v.id("transformationMaps"),
    departmentKey: v.string(),
  },
  handler: async (ctx, { mapId, departmentKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const department = await findDepartmentByKey(ctx, mapId, departmentKey);
    if (!department) {
      return null;
    }
    const [objectives, services] = await Promise.all([
      ctx.db
        .query("transformationObjectives")
        .withIndex("by_map_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
        .collect(),
      ctx.db
        .query("transformationServices")
        .withIndex("by_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
        .collect(),
    ]);
    const analyses = await listServiceAnalysesForServices(ctx, services);

    return buildDepartmentSnapshot({ map, department, objectives, services, analyses });
  },
});

export const getServiceSnapshot = query({
  args: {
    mapId: v.id("transformationMaps"),
    serviceKey: v.string(),
  },
  handler: async (ctx, { mapId, serviceKey }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const service = await findServiceByKey(ctx, mapId, serviceKey);
    if (!service) {
      return null;
    }
    const department = await findDepartmentByKey(ctx, mapId, service.departmentKey);
    if (!department) {
      return null;
    }
    const analysis =
      (await ctx.db
        .query("transformationServiceAnalyses")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .first()) ?? null;

    return buildServiceSnapshot({ map, department, service, analysis });
  },
});

export const applyDepartmentAnalysis = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    departmentKey: v.string(),
    payload: departmentAnalysisPayloadValidator,
  },
  handler: async (ctx, { mapId, departmentKey, payload }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const department = await getDepartmentByKey(ctx, mapId, departmentKey);
    const now = Date.now();
    const seenObjectiveKeys = new Set<string>();
    for (const objective of payload.improvementMandates) {
      if (seenObjectiveKeys.has(objective.key)) {
        throw new Error(`Validation: Duplicate improvement mandate key in payload: ${objective.key}`);
      }
      seenObjectiveKeys.add(objective.key);
    }
    const seenServiceKeys = new Set<string>();
    for (const service of payload.services) {
      if (seenServiceKeys.has(service.key)) {
        throw new Error(`Validation: Duplicate service key in payload: ${service.key}`);
      }
      seenServiceKeys.add(service.key);
    }

    await ctx.db.patch(department._id, {
      description: payload.description,
      keyIssues: payload.keyIssues ?? department.keyIssues,
      improvementMandates: payload.improvementMandates.map((objective) => objective.title),
      sourceType: payload.sourceType ?? "human",
      sourceRef: payload.sourceRef,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    const existingObjectives = await ctx.db
      .query("transformationObjectives")
      .withIndex("by_map_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
      .collect();
    const objectiveByKey = new Map(existingObjectives.map((objective) => [objective.key, objective]));

    for (const [index, objective] of payload.improvementMandates.entries()) {
      const current = objectiveByKey.get(objective.key);
      const nextData = {
        mapId,
        key: objective.key,
        order: index,
        scope: "department" as const,
        departmentKey,
        title: objective.title,
        description: objective.description,
        linkedPressureKeys: objective.linkedPressureKeys,
        artifactStatus: "reviewed" as const,
        sourceType: payload.sourceType ?? "human",
        sourceRef: payload.sourceRef,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      };

      if (current) {
        await ctx.db.patch(current._id, nextData);
      } else {
        await ctx.db.insert("transformationObjectives", {
          ...nextData,
          createdBy: auth.workosUserId,
          createdAt: now,
        });
      }
    }

    const existingServices = await ctx.db
      .query("transformationServices")
      .withIndex("by_department", (q) => q.eq("mapId", mapId).eq("departmentKey", departmentKey))
      .collect();
    const serviceByKey = new Map(existingServices.map((service) => [service.key, service]));

    for (const [index, service] of payload.services.entries()) {
      const current = serviceByKey.get(service.key);
      await ensureUniqueServiceKey(ctx, mapId, service.key, current?._id);
      const nextData = {
        mapId,
        key: service.key,
        departmentKey,
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
        sourceType: payload.sourceType ?? "human",
        sourceRef: payload.sourceRef,
        updatedBy: auth.workosUserId,
        updatedAt: now,
      };

      if (current) {
        await ctx.db.patch(current._id, nextData);
      } else {
        await ctx.db.insert("transformationServices", {
          ...nextData,
          createdBy: auth.workosUserId,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(mapId, {
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "department",
      entityId: department.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: { description: department.description, keyIssues: department.keyIssues },
      nextData: payload,
    });

    return { ok: true };
  },
});

export const applyServiceAnalysis = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    serviceKey: v.string(),
    payload: serviceAnalysisPayloadValidator,
  },
  handler: async (ctx, { mapId, serviceKey, payload }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const service = await getServiceByKey(ctx, mapId, serviceKey);
    const now = Date.now();
    const previousService = {
      name: service.name,
      purpose: service.purpose,
      customer: service.customer,
      trigger: service.trigger,
      outcome: service.outcome,
      constraints: service.constraints,
      status: service.status,
      effectivenessMetric: service.effectivenessMetric,
      efficiencyMetric: service.efficiencyMetric,
    };

    await ctx.db.patch(service._id, {
      ...payload.service,
      artifactStatus: payload.reviewStatus ?? "reviewed",
      sourceType: payload.sourceType ?? "human",
      sourceRef: payload.sourceRef,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    const existingAnalysis = await ctx.db
      .query("transformationServiceAnalyses")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .first();

    const nextAnalysisData = {
      mapId,
      serviceId: service._id,
      reviewStatus: payload.reviewStatus ?? "reviewed",
      sourceType: payload.sourceType ?? "human",
      sourceRef: payload.sourceRef,
      generatedAt: payload.sourceType && payload.sourceType !== "human" ? now : existingAnalysis?.generatedAt,
      idealFlowSteps: payload.idealFlowSteps,
      currentFlowSteps: payload.currentFlowSteps,
      deviations: payload.deviations,
      initiatives: payload.initiatives,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    };

    if (existingAnalysis) {
      await ctx.db.patch(existingAnalysis._id, nextAnalysisData);
    } else {
      await ctx.db.insert("transformationServiceAnalyses", {
        ...nextAnalysisData,
        createdBy: auth.workosUserId,
        createdAt: now,
      });
    }

    await ctx.db.patch(mapId, {
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "service_analysis",
      entityId: service.key,
      changedBy: auth.workosUserId,
      changeType: existingAnalysis ? "update" : "create",
      previousData: existingAnalysis
        ? {
            reviewStatus: existingAnalysis.reviewStatus,
            idealFlowSteps: existingAnalysis.idealFlowSteps,
            currentFlowSteps: existingAnalysis.currentFlowSteps,
            deviations: existingAnalysis.deviations,
            initiatives: existingAnalysis.initiatives,
          }
        : previousService,
      nextData: {
        service: payload.service,
        reviewStatus: nextAnalysisData.reviewStatus,
        idealFlowSteps: payload.idealFlowSteps,
        currentFlowSteps: payload.currentFlowSteps,
        deviations: payload.deviations,
        initiatives: payload.initiatives,
      },
    });

    return { ok: true };
  },
});

export const setServiceAnalysisReviewStatus = mutation({
  args: {
    mapId: v.id("transformationMaps"),
    serviceKey: v.string(),
    reviewStatus: artifactStatusValidator,
  },
  handler: async (ctx, { mapId, serviceKey, reviewStatus }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapWithAccess(ctx, mapId, auth);
    const service = await getServiceByKey(ctx, mapId, serviceKey);
    const now = Date.now();
    const analysis = await ctx.db
      .query("transformationServiceAnalyses")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .first();
    if (!analysis) {
      throw new Error("NotFound: Service analysis not found");
    }

    await ctx.db.patch(analysis._id, {
      reviewStatus,
      lastReviewedBy: auth.workosUserId,
      lastReviewedAt: now,
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    await ctx.db.patch(mapId, {
      updatedBy: auth.workosUserId,
      updatedAt: now,
    });

    await recordTransformationHistory(ctx, {
      workosOrgId: map.workosOrgId,
      mapId,
      entityType: "service_analysis",
      entityId: service.key,
      changedBy: auth.workosUserId,
      changeType: "update",
      previousData: { reviewStatus: analysis.reviewStatus },
      nextData: { reviewStatus },
    });
  },
});

export const getBySlug = query({
  args: { workosOrgId: v.string(), slug: v.string() },
  handler: async (ctx, { workosOrgId, slug }) => {
    const auth = await requireAuth(ctx);
    const map = await getMapBySlugWithAccess(ctx, workosOrgId, slug, auth);
    return map;
  },
});
