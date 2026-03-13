import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { v } from "convex/values";

export const TRANSFORMATION_MAP_STATUS_VALUES = [
  "draft",
  "in_review",
  "active",
  "archived",
] as const;

export const TRANSFORMATION_ARTIFACT_STATUS_VALUES = [
  "draft",
  "reviewed",
  "approved",
  "archived",
] as const;

export const TRANSFORMATION_SOURCE_TYPE_VALUES = [
  "human",
  "ai_generated",
  "ai_edited",
  "imported",
  "system",
] as const;

export const TRANSFORMATION_SERVICE_STATUS_VALUES = [
  "not-analyzed",
  "analyzed",
  "has-deviations",
] as const;

export const TRANSFORMATION_FLOW_STEP_TYPE_VALUES = [
  "input",
  "process",
  "output",
  "control",
  "approval",
  "handoff",
  "rework",
  "exception",
] as const;

export const TRANSFORMATION_DEVIATION_IMPACT_VALUES = [
  "high",
  "medium",
  "low",
] as const;

export const TRANSFORMATION_DEVIATION_TREATMENT_VALUES = [
  "automate",
  "eliminate",
  "simplify",
  "accept",
] as const;

export const TRANSFORMATION_DEVIATION_CLASSIFICATION_VALUES = [
  "approval",
  "handoff",
  "rework",
  "system-constraint",
  "exception",
  "control",
] as const;

export const TRANSFORMATION_INITIATIVE_STATUS_VALUES = [
  "proposed",
  "approved",
  "in-progress",
  "done",
  "parked",
] as const;

export const artifactStatusValidator = v.union(
  ...TRANSFORMATION_ARTIFACT_STATUS_VALUES.map((value) => v.literal(value))
);

export const sourceTypeValidator = v.union(
  ...TRANSFORMATION_SOURCE_TYPE_VALUES.map((value) => v.literal(value))
);

export const serviceStatusValidator = v.union(
  ...TRANSFORMATION_SERVICE_STATUS_VALUES.map((value) => v.literal(value))
);

export const flowStepTypeValidator = v.union(
  ...TRANSFORMATION_FLOW_STEP_TYPE_VALUES.map((value) => v.literal(value))
);

export const deviationImpactValidator = v.union(
  ...TRANSFORMATION_DEVIATION_IMPACT_VALUES.map((value) => v.literal(value))
);

export const deviationTreatmentValidator = v.union(
  ...TRANSFORMATION_DEVIATION_TREATMENT_VALUES.map((value) => v.literal(value))
);

export const deviationClassificationValidator = v.union(
  ...TRANSFORMATION_DEVIATION_CLASSIFICATION_VALUES.map((value) => v.literal(value))
);

export const initiativeStatusValidator = v.union(
  ...TRANSFORMATION_INITIATIVE_STATUS_VALUES.map((value) => v.literal(value))
);

export const linkedAgentValidator = v.object({
  id: v.string(),
  canvasAgentId: v.optional(v.id("agents")),
  name: v.string(),
  role: v.string(),
});

export const flowStepValidator = v.object({
  id: v.string(),
  serviceId: v.string(),
  flowType: v.union(v.literal("ideal"), v.literal("current")),
  order: v.number(),
  description: v.string(),
  stepType: flowStepTypeValidator,
  hasDeviation: v.optional(v.boolean()),
  parallelGroup: v.optional(v.string()),
  groupLabel: v.optional(v.string()),
});

export const deviationValidator = v.object({
  id: v.string(),
  serviceId: v.string(),
  flowStepId: v.optional(v.string()),
  what: v.string(),
  why: v.string(),
  necessary: v.boolean(),
  impact: deviationImpactValidator,
  treatment: deviationTreatmentValidator,
  classification: deviationClassificationValidator,
});

export const initiativeValidator = v.object({
  id: v.string(),
  serviceId: v.string(),
  title: v.string(),
  description: v.string(),
  status: initiativeStatusValidator,
  linkedAgents: v.array(linkedAgentValidator),
});

export const provenanceFields = {
  sourceType: sourceTypeValidator,
  sourceRef: v.optional(v.string()),
  generatedAt: v.optional(v.number()),
  lastReviewedBy: v.optional(v.string()),
  lastReviewedAt: v.optional(v.number()),
} as const;

export const serviceAnalysisPayloadValidator = v.object({
  service: v.object({
    name: v.string(),
    purpose: v.string(),
    customer: v.string(),
    trigger: v.string(),
    outcome: v.string(),
    constraints: v.array(v.string()),
    status: serviceStatusValidator,
    effectivenessMetric: v.string(),
    efficiencyMetric: v.string(),
  }),
  idealFlowSteps: v.array(flowStepValidator),
  currentFlowSteps: v.array(flowStepValidator),
  deviations: v.array(deviationValidator),
  initiatives: v.array(initiativeValidator),
  reviewStatus: v.optional(artifactStatusValidator),
  sourceType: v.optional(sourceTypeValidator),
  sourceRef: v.optional(v.string()),
});

export const departmentAnalysisPayloadValidator = v.object({
  description: v.string(),
  keyIssues: v.optional(v.array(v.string())),
  improvementMandates: v.array(
    v.object({
      key: v.string(),
      title: v.string(),
      description: v.string(),
      linkedPressureKeys: v.array(v.string()),
    })
  ),
  services: v.array(
    v.object({
      key: v.string(),
      name: v.string(),
      purpose: v.string(),
      customer: v.string(),
      trigger: v.string(),
      outcome: v.string(),
      constraints: v.array(v.string()),
      status: serviceStatusValidator,
      effectivenessMetric: v.string(),
      efficiencyMetric: v.string(),
    })
  ),
  sourceType: v.optional(sourceTypeValidator),
  sourceRef: v.optional(v.string()),
});

export type ServiceAnalysisDocument = Doc<"transformationServiceAnalyses">;
export type DepartmentDocument = Doc<"transformationDepartments">;
export type ObjectiveDocument = Doc<"transformationObjectives">;
export type PressureDocument = Doc<"transformationPressures">;
export type ServiceDocument = Doc<"transformationServices">;

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

export function countUniqueLinkedAgents(initiatives: Array<{ linkedAgents: Array<{ id: string }> }>) {
  return new Set(
    initiatives.flatMap((initiative) => initiative.linkedAgents.map((agent) => agent.id))
  ).size;
}

function mapPressure(pressure: PressureDocument) {
  return {
    id: pressure.key,
    type: pressure.type,
    title: pressure.title,
    description: pressure.description,
    evidence: pressure.evidence,
  };
}

function mapObjective(objective: ObjectiveDocument) {
  return {
    id: objective.key,
    scope: objective.scope,
    title: objective.title,
    description: objective.description,
    departmentId: objective.departmentKey,
    linkedPressureIds: objective.linkedPressureKeys,
  };
}

function mapDepartment(department: DepartmentDocument) {
  return {
    id: department.key,
    name: department.name,
    description: department.description,
    keyIssues: department.keyIssues,
  };
}

function mapService(service: ServiceDocument) {
  return {
    id: service.key,
    departmentId: service.departmentKey,
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
}

export function buildOverviewSnapshot(args: {
  map: Doc<"transformationMaps">;
  pressures: PressureDocument[];
  objectives: ObjectiveDocument[];
  departments: DepartmentDocument[];
  services: ServiceDocument[];
  analyses: ServiceAnalysisDocument[];
}) {
  const pressures = sortByOrder(args.pressures).map(mapPressure);
  const objectives = sortByOrder(args.objectives).map(mapObjective);
  const departments = sortByOrder(args.departments).map(mapDepartment);
  const analysisByServiceId = new Map(args.analyses.map((analysis) => [`${analysis.serviceId}`, analysis]));

  const departmentSummaries = departments.map((department) => {
    const departmentServices = args.services.filter((service) => service.departmentKey === department.id);
    const improvementMandates = objectives.filter(
      (objective) => objective.scope === "department" && objective.departmentId === department.id
    );
    const deviationCount = departmentServices.reduce((count, service) => {
      const analysis = analysisByServiceId.get(`${service._id}`);
      return count + (analysis?.deviations.length ?? 0);
    }, 0);

    return {
      ...department,
      improvementMandates,
      serviceCount: departmentServices.length,
      analyzedCount: departmentServices.filter(
        (service) => service.status === "analyzed" || service.status === "has-deviations"
      ).length,
      deviationCount,
    };
  });

  return {
    map: {
      mapId: args.map._id,
      slug: args.map.slug,
      title: args.map.title,
      status: args.map.status,
      updatedAt: args.map.updatedAt,
    },
    pressures,
    enterpriseObjectives: objectives.filter((objective) => objective.scope === "enterprise"),
    departmentSummaries,
  };
}

export function buildDepartmentSnapshot(args: {
  map: Doc<"transformationMaps">;
  department: DepartmentDocument;
  objectives: ObjectiveDocument[];
  services: ServiceDocument[];
  analyses: ServiceAnalysisDocument[];
}) {
  const department = mapDepartment(args.department);
  const services = sortByOrder(args.services).map(mapService);
  const analysisByServiceId = new Map(args.analyses.map((analysis) => [`${analysis.serviceId}`, analysis]));

  return {
    map: {
      mapId: args.map._id,
      slug: args.map.slug,
      title: args.map.title,
      status: args.map.status,
      updatedAt: args.map.updatedAt,
    },
    department,
    objectives: sortByOrder(args.objectives).map(mapObjective),
    services,
    agentCountsByService: Object.fromEntries(
      args.services.map((service) => {
        const analysis = analysisByServiceId.get(`${service._id}`);
        return [service.key, countUniqueLinkedAgents(analysis?.initiatives ?? [])];
      })
    ),
  };
}

export function buildServiceSnapshot(args: {
  map: Doc<"transformationMaps">;
  department: DepartmentDocument;
  service: ServiceDocument;
  analysis: ServiceAnalysisDocument | null;
}) {
  return {
    map: {
      mapId: args.map._id,
      slug: args.map.slug,
      title: args.map.title,
      status: args.map.status,
      updatedAt: args.map.updatedAt,
    },
    department: mapDepartment(args.department),
    service: mapService(args.service),
    reviewStatus: args.analysis?.reviewStatus ?? "draft",
    idealSteps: [...(args.analysis?.idealFlowSteps ?? [])].sort((a, b) => a.order - b.order),
    currentSteps: [...(args.analysis?.currentFlowSteps ?? [])].sort((a, b) => a.order - b.order),
    deviations: [...(args.analysis?.deviations ?? [])].sort((a, b) => a.what.localeCompare(b.what)),
    initiatives: [...(args.analysis?.initiatives ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    updatedAt: args.analysis?.updatedAt ?? args.service.updatedAt,
  };
}

export async function recordTransformationHistory(
  ctx: MutationCtx,
  args: {
    workosOrgId: string;
    mapId: Id<"transformationMaps">;
    entityType: "map" | "pressure" | "objective" | "department" | "service" | "service_analysis";
    entityId: string;
    changedBy: string;
    changeType: "create" | "update" | "delete";
    previousData?: unknown;
    nextData?: unknown;
  }
) {
  await ctx.db.insert("transformationHistory", {
    workosOrgId: args.workosOrgId,
    mapId: args.mapId,
    entityType: args.entityType,
    entityId: args.entityId,
    changedBy: args.changedBy,
    changedAt: Date.now(),
    changeType: args.changeType,
    previousData: args.previousData,
    nextData: args.nextData,
  });
}

export async function deleteTransformationMapCascade(
  ctx: MutationCtx,
  args: {
    map: Doc<"transformationMaps">;
    changedBy: string;
    deletedAt?: number;
  }
) {
  const deletedAt = args.deletedAt ?? Date.now();
  const children = await listMapChildren(ctx, args.map._id);

  for (const analysis of children.analyses) {
    await ctx.db.delete(analysis._id);
    const service = children.services.find((entry) => `${entry._id}` === `${analysis.serviceId}`);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "service_analysis",
      entityId: service?.key ?? `${analysis.serviceId}`,
      changedBy: args.changedBy,
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

  for (const service of children.services) {
    await ctx.db.delete(service._id);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "service",
      entityId: service.key,
      changedBy: args.changedBy,
      changeType: "delete",
      previousData: {
        departmentKey: service.departmentKey,
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
    });
  }

  for (const objective of children.objectives) {
    await ctx.db.delete(objective._id);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "objective",
      entityId: objective.key,
      changedBy: args.changedBy,
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

  for (const department of children.departments) {
    await ctx.db.delete(department._id);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "department",
      entityId: department.key,
      changedBy: args.changedBy,
      changeType: "delete",
      previousData: {
        name: department.name,
        description: department.description,
        keyIssues: department.keyIssues,
        improvementMandates: department.improvementMandates,
      },
    });
  }

  for (const pressure of children.pressures) {
    await ctx.db.delete(pressure._id);
    await recordTransformationHistory(ctx, {
      workosOrgId: args.map.workosOrgId,
      mapId: args.map._id,
      entityType: "pressure",
      entityId: pressure.key,
      changedBy: args.changedBy,
      changeType: "delete",
      previousData: {
        type: pressure.type,
        title: pressure.title,
        description: pressure.description,
        evidence: pressure.evidence,
      },
    });
  }

  await ctx.db.delete(args.map._id);

  await recordTransformationHistory(ctx, {
    workosOrgId: args.map.workosOrgId,
    mapId: args.map._id,
    entityType: "map",
    entityId: `${args.map._id}`,
    changedBy: args.changedBy,
    changeType: "delete",
    previousData: {
      title: args.map.title,
      slug: args.map.slug,
      description: args.map.description,
      status: args.map.status,
      updatedAt: args.map.updatedAt,
      deletedAt,
    },
  });

  return {
    analyses: children.analyses.length,
    services: children.services.length,
    objectives: children.objectives.length,
    departments: children.departments.length,
    pressures: children.pressures.length,
  };
}

export async function listMapChildren(ctx: QueryCtx | MutationCtx, mapId: Id<"transformationMaps">) {
  const [pressures, objectives, departments, services, analyses] = await Promise.all([
    ctx.db.query("transformationPressures").withIndex("by_map", (q) => q.eq("mapId", mapId)).collect(),
    ctx.db.query("transformationObjectives").withIndex("by_map", (q) => q.eq("mapId", mapId)).collect(),
    ctx.db.query("transformationDepartments").withIndex("by_map", (q) => q.eq("mapId", mapId)).collect(),
    ctx.db.query("transformationServices").withIndex("by_map", (q) => q.eq("mapId", mapId)).collect(),
    ctx.db.query("transformationServiceAnalyses").withIndex("by_map", (q) => q.eq("mapId", mapId)).collect(),
  ]);

  return { pressures, objectives, departments, services, analyses };
}

export async function listServiceAnalysesForServices(
  ctx: QueryCtx | MutationCtx,
  services: Array<{ _id: Id<"transformationServices"> }>
) {
  const analyses = await Promise.all(
    services.map((service) =>
      ctx.db
        .query("transformationServiceAnalyses")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .first()
    )
  );

  return analyses.filter((analysis): analysis is ServiceAnalysisDocument => analysis !== null);
}
