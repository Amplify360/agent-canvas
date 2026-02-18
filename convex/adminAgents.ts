import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { CHANGE_TYPE, statusValidator } from "./lib/validators";
import { getAgentSnapshot, recordHistory } from "./lib/helpers";
import {
  validateAgentName,
  validateDescription,
  validateObjective,
  validatePhase,
  validateOptionalUrl,
} from "./lib/validation";

const ADMIN_CHANGED_BY = "mcp_admin";
const DEFAULT_MAX_AGENTS = 200;
const DEFAULT_PREVIEW_LIMIT = 100;

const statusValueValidator = v.union(
  v.literal("idea"),
  v.literal("approved"),
  v.literal("wip"),
  v.literal("testing"),
  v.literal("live"),
  v.literal("shelved")
);

const arrayFieldValidator = v.union(v.literal("tools"), v.literal("journeySteps"));

const unsettableFieldValidator = v.union(
  v.literal("objective"),
  v.literal("description"),
  v.literal("category"),
  v.literal("status"),
  v.literal("ownerId"),
  v.literal("demoLink"),
  v.literal("videoLink"),
  v.literal("deletedAt")
);

const setFieldsValidator = v.object({
  name: v.optional(v.string()),
  objective: v.optional(v.string()),
  description: v.optional(v.string()),
  phase: v.optional(v.string()),
  category: v.optional(v.string()),
  status: v.optional(statusValueValidator),
  ownerId: v.optional(v.id("users")),
  demoLink: v.optional(v.string()),
  videoLink: v.optional(v.string()),
});

const selectionArgsValidator = {
  token: v.string(),
  workosOrgId: v.string(),
  canvasId: v.id("canvases"),
  ids: v.optional(v.array(v.id("agents"))),
  nameIncludes: v.optional(v.string()),
  phase: v.optional(v.string()),
  category: v.optional(v.string()),
  status: statusValidator,
  includeDeleted: v.optional(v.boolean()),
};

type SelectionArgs = {
  token: string;
  workosOrgId: string;
  canvasId: Id<"canvases">;
  ids?: Id<"agents">[];
  nameIncludes?: string;
  phase?: string;
  category?: string;
  status?: Doc<"agents">["status"];
  includeDeleted?: boolean;
};

type MutableAgentData = Omit<Doc<"agents">, "_id" | "_creationTime">;

function assertAdminToken(token: string) {
  const expectedToken = process.env.MCP_ADMIN_TOKEN;
  if (!expectedToken) {
    throw new Error("Auth: MCP_ADMIN_TOKEN is not configured");
  }
  if (token !== expectedToken) {
    throw new Error("Auth: Invalid admin token");
  }
}

async function assertCanvasScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  canvasId: Id<"canvases">,
  workosOrgId: string
): Promise<Doc<"canvases">> {
  const canvas = await ctx.db.get(canvasId);
  if (!canvas || canvas.deletedAt) {
    throw new Error("NotFound: Canvas not found");
  }
  if (canvas.workosOrgId !== workosOrgId) {
    throw new Error("Auth: Canvas does not belong to requested org");
  }
  return canvas;
}

function normalizeName(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function agentMatchesSelection(agent: Doc<"agents">, args: SelectionArgs): boolean {
  const includeDeleted = args.includeDeleted ?? false;
  if (!includeDeleted && agent.deletedAt !== undefined) return false;

  if (args.ids && args.ids.length > 0 && !args.ids.includes(agent._id)) return false;

  if (args.nameIncludes) {
    const needle = normalizeName(args.nameIncludes);
    if (!agent.name.toLowerCase().includes(needle)) return false;
  }

  if (args.phase !== undefined && agent.phase !== args.phase) return false;
  if (args.category !== undefined && agent.category !== args.category) return false;
  if (args.status !== undefined && agent.status !== args.status) return false;

  return true;
}

async function selectAgents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: SelectionArgs
): Promise<Doc<"agents">[]> {
  const agents: Doc<"agents">[] = await ctx.db
    .query("agents")
    .withIndex("by_canvas", (q: any) => q.eq("canvasId", args.canvasId))
    .collect();

  return agents.filter((agent: Doc<"agents">) => agentMatchesSelection(agent, args));
}

function sanitizeAgentData(data: MutableAgentData): MutableAgentData {
  const sanitized = {} as MutableAgentData;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sanitized as any)[key] = value;
    }
  }
  return sanitized;
}

function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changed.push(key);
    }
  }
  return changed.sort();
}

function ensureOperationApplied(operation: { op: string }, didChange: boolean) {
  if (!didChange) return;
  return operation.op;
}

function validateSetFields(fields: {
  name?: string;
  objective?: string;
  description?: string;
  phase?: string;
  demoLink?: string;
  videoLink?: string;
}) {
  if (fields.name !== undefined) validateAgentName(fields.name);
  if (fields.objective !== undefined) validateObjective(fields.objective);
  if (fields.description !== undefined) validateDescription(fields.description);
  if (fields.phase !== undefined) validatePhase(fields.phase);
  if (fields.demoLink !== undefined) validateOptionalUrl(fields.demoLink, "demoLink");
  if (fields.videoLink !== undefined) validateOptionalUrl(fields.videoLink, "videoLink");
}

function applyOperation(
  data: MutableAgentData,
  operation:
    | { op: "setFields"; fields: Record<string, unknown> }
    | { op: "unsetFields"; fields: string[] }
    | { op: "arrayAdd"; field: "tools" | "journeySteps"; values: string[] }
    | { op: "arrayRemove"; field: "tools" | "journeySteps"; values: string[] }
    | { op: "nameTransform"; prefix?: string; suffix?: string; find?: string; replace?: string }
    | { op: "softDelete" }
    | { op: "restore" },
  now: number
): string | undefined {
  if (operation.op === "setFields") {
    const nextFields = operation.fields as {
      name?: string;
      objective?: string;
      description?: string;
      phase?: string;
      category?: string;
      status?: MutableAgentData["status"];
      ownerId?: MutableAgentData["ownerId"];
      demoLink?: string;
      videoLink?: string;
    };
    validateSetFields(nextFields);

    let changed = false;
    for (const [key, value] of Object.entries(nextFields)) {
      if (value === undefined) continue;
      const previous = (data as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(previous) !== JSON.stringify(value)) {
        (data as unknown as Record<string, unknown>)[key] = value;
        changed = true;
      }
    }
    return ensureOperationApplied(operation, changed);
  }

  if (operation.op === "unsetFields") {
    let changed = false;
    for (const field of operation.fields) {
      if (field in data) {
        delete (data as unknown as Record<string, unknown>)[field];
        changed = true;
      }
    }
    return ensureOperationApplied(operation, changed);
  }

  if (operation.op === "arrayAdd") {
    const current = [...data[operation.field]];
    const merged = Array.from(new Set([...current, ...operation.values]));
    const changed = JSON.stringify(current) !== JSON.stringify(merged);
    if (changed) {
      data[operation.field] = merged;
    }
    return ensureOperationApplied(operation, changed);
  }

  if (operation.op === "arrayRemove") {
    const removeSet = new Set(operation.values);
    const current = [...data[operation.field]];
    const filtered = current.filter((value) => !removeSet.has(value));
    const changed = JSON.stringify(current) !== JSON.stringify(filtered);
    if (changed) {
      data[operation.field] = filtered;
    }
    return ensureOperationApplied(operation, changed);
  }

  if (operation.op === "nameTransform") {
    const original = data.name;
    let nextName = original;
    if (operation.find !== undefined && operation.find.length > 0) {
      nextName = nextName.split(operation.find).join(operation.replace ?? "");
    }
    if (operation.prefix) {
      nextName = `${operation.prefix}${nextName}`;
    }
    if (operation.suffix) {
      nextName = `${nextName}${operation.suffix}`;
    }
    if (nextName !== original) {
      validateAgentName(nextName);
      data.name = nextName;
      return operation.op;
    }
    return undefined;
  }

  if (operation.op === "softDelete") {
    if (data.deletedAt === undefined) {
      data.deletedAt = now;
      return operation.op;
    }
    return undefined;
  }

  if (operation.op === "restore") {
    if (data.deletedAt !== undefined) {
      delete data.deletedAt;
      return operation.op;
    }
  }

  return undefined;
}

function getRequiredFieldFallback(
  snapshot: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> {
  const required = [
    "canvasId",
    "phase",
    "agentOrder",
    "name",
    "tools",
    "journeySteps",
    "createdBy",
    "createdAt",
  ];

  const merged = { ...snapshot };
  for (const field of required) {
    if (merged[field] === undefined) {
      merged[field] = current[field];
    }
  }
  return merged;
}

export const previewSelection = internalQuery({
  args: {
    ...selectionArgsValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertAdminToken(args.token);
    await assertCanvasScope(ctx, args.canvasId, args.workosOrgId);

    const selected = await selectAgents(ctx, args);
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_PREVIEW_LIMIT, 1000));
    const preview = selected
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((agent) => ({
        agentId: agent._id,
        name: agent.name,
        phase: agent.phase,
        category: agent.category ?? null,
        status: agent.status ?? null,
        deletedAt: agent.deletedAt ?? null,
      }));

    return {
      totalMatched: selected.length,
      returned: preview.length,
      truncated: selected.length > preview.length,
      agents: preview,
    };
  },
});

export const runBatch = internalMutation({
  args: {
    ...selectionArgsValidator,
    dryRun: v.optional(v.boolean()),
    confirm: v.optional(v.boolean()),
    maxAgents: v.optional(v.number()),
    operations: v.array(v.union(
      v.object({ op: v.literal("setFields"), fields: setFieldsValidator }),
      v.object({ op: v.literal("unsetFields"), fields: v.array(unsettableFieldValidator) }),
      v.object({ op: v.literal("arrayAdd"), field: arrayFieldValidator, values: v.array(v.string()) }),
      v.object({ op: v.literal("arrayRemove"), field: arrayFieldValidator, values: v.array(v.string()) }),
      v.object({
        op: v.literal("nameTransform"),
        prefix: v.optional(v.string()),
        suffix: v.optional(v.string()),
        find: v.optional(v.string()),
        replace: v.optional(v.string()),
      }),
      v.object({ op: v.literal("softDelete") }),
      v.object({ op: v.literal("restore") })
    )),
  },
  handler: async (ctx, args) => {
    assertAdminToken(args.token);
    await assertCanvasScope(ctx, args.canvasId, args.workosOrgId);

    const dryRun = args.dryRun ?? true;
    if (!dryRun && args.confirm !== true) {
      throw new Error("Validation: confirm=true is required when dryRun=false");
    }

    if (args.operations.length === 0) {
      throw new Error("Validation: operations cannot be empty");
    }

    const selected = await selectAgents(ctx, args);
    const maxAgents = Math.max(1, args.maxAgents ?? DEFAULT_MAX_AGENTS);
    if (selected.length > maxAgents) {
      throw new Error(`Validation: matched ${selected.length} agents, above maxAgents=${maxAgents}`);
    }

    const now = Date.now();
    const changes: Array<{
      agentId: Id<"agents">;
      name: string;
      changedFields: string[];
      appliedOps: string[];
    }> = [];

    for (const agent of selected) {
      const beforeSnapshot = getAgentSnapshot(agent);
      const nextData: MutableAgentData = {
        ...beforeSnapshot,
      } as MutableAgentData;
      const appliedOps: string[] = [];

      for (const operation of args.operations as Array<{
        op: "setFields" | "unsetFields" | "arrayAdd" | "arrayRemove" | "nameTransform" | "softDelete" | "restore";
      } & Record<string, unknown>>) {
        const applied = applyOperation(
          nextData,
          operation as
            | { op: "setFields"; fields: Record<string, unknown> }
            | { op: "unsetFields"; fields: string[] }
            | { op: "arrayAdd"; field: "tools" | "journeySteps"; values: string[] }
            | { op: "arrayRemove"; field: "tools" | "journeySteps"; values: string[] }
            | { op: "nameTransform"; prefix?: string; suffix?: string; find?: string; replace?: string }
            | { op: "softDelete" }
            | { op: "restore" },
          now
        );
        if (applied) {
          appliedOps.push(applied);
        }
      }

      const changedByOperations = diffFields(beforeSnapshot, sanitizeAgentData(nextData));
      if (changedByOperations.length === 0) continue;

      nextData.updatedAt = now;
      nextData.updatedBy = ADMIN_CHANGED_BY;
      const sanitizedNext = sanitizeAgentData(nextData);
      const changedFields = diffFields(beforeSnapshot, sanitizedNext);

      changes.push({
        agentId: agent._id,
        name: agent.name,
        changedFields,
        appliedOps,
      });

      if (!dryRun) {
        await ctx.db.replace(agent._id, sanitizedNext as Doc<"agents">);
        const beforeDeleted = (beforeSnapshot as Record<string, unknown>).deletedAt !== undefined;
        const afterDeleted = (sanitizedNext as Record<string, unknown>).deletedAt !== undefined;
        const changeType = !beforeDeleted && afterDeleted ? CHANGE_TYPE.DELETE : CHANGE_TYPE.UPDATE;
        await recordHistory(
          ctx,
          agent._id,
          ADMIN_CHANGED_BY,
          changeType,
          beforeSnapshot
        );
      }
    }

    return {
      dryRun,
      matchedAgents: selected.length,
      changedAgents: changes.length,
      unchangedAgents: selected.length - changes.length,
      changes,
    };
  },
});

export const resequence = internalMutation({
  args: {
    token: v.string(),
    workosOrgId: v.string(),
    canvasId: v.id("canvases"),
    phase: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
    startAt: v.optional(v.number()),
    strategy: v.union(
      v.literal("nameAsc"),
      v.literal("nameDesc"),
      v.literal("createdAtAsc"),
      v.literal("createdAtDesc"),
      v.literal("currentOrderAsc"),
      v.literal("currentOrderDesc")
    ),
    dryRun: v.optional(v.boolean()),
    confirm: v.optional(v.boolean()),
    maxAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertAdminToken(args.token);
    await assertCanvasScope(ctx, args.canvasId, args.workosOrgId);

    const dryRun = args.dryRun ?? true;
    if (!dryRun && args.confirm !== true) {
      throw new Error("Validation: confirm=true is required when dryRun=false");
    }

    const selected = await selectAgents(ctx, {
      token: args.token,
      workosOrgId: args.workosOrgId,
      canvasId: args.canvasId,
      phase: args.phase,
      includeDeleted: args.includeDeleted,
    });

    const maxAgents = Math.max(1, args.maxAgents ?? DEFAULT_MAX_AGENTS);
    if (selected.length > maxAgents) {
      throw new Error(`Validation: matched ${selected.length} agents, above maxAgents=${maxAgents}`);
    }

    const sorted = [...selected].sort((a, b) => {
      switch (args.strategy) {
        case "nameAsc":
          return a.name.localeCompare(b.name);
        case "nameDesc":
          return b.name.localeCompare(a.name);
        case "createdAtAsc":
          return a.createdAt - b.createdAt;
        case "createdAtDesc":
          return b.createdAt - a.createdAt;
        case "currentOrderDesc":
          return b.agentOrder - a.agentOrder;
        case "currentOrderAsc":
        default:
          return a.agentOrder - b.agentOrder;
      }
    });

    const startAt = Math.max(0, args.startAt ?? 0);
    const now = Date.now();
    const changes: Array<{
      agentId: Id<"agents">;
      name: string;
      beforeOrder: number;
      afterOrder: number;
    }> = [];

    sorted.forEach((agent, index) => {
      const nextOrder = startAt + index;
      if (agent.agentOrder === nextOrder) return;
      changes.push({
        agentId: agent._id,
        name: agent.name,
        beforeOrder: agent.agentOrder,
        afterOrder: nextOrder,
      });
    });

    if (!dryRun) {
      for (const change of changes) {
        const current = sorted.find((agent) => agent._id === change.agentId);
        if (!current) continue;

        const beforeSnapshot = getAgentSnapshot(current);
        await ctx.db.patch(change.agentId, {
          agentOrder: change.afterOrder,
          updatedAt: now,
          updatedBy: ADMIN_CHANGED_BY,
        });
        await recordHistory(ctx, change.agentId, ADMIN_CHANGED_BY, CHANGE_TYPE.UPDATE, beforeSnapshot);
      }
    }

    return {
      dryRun,
      matchedAgents: selected.length,
      resequencedAgents: changes.length,
      changes,
    };
  },
});

export const rollbackFromHistory = internalMutation({
  args: {
    token: v.string(),
    workosOrgId: v.string(),
    canvasId: v.id("canvases"),
    beforeTimestamp: v.number(),
    ids: v.optional(v.array(v.id("agents"))),
    includeDeleted: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
    confirm: v.optional(v.boolean()),
    maxAgents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertAdminToken(args.token);
    await assertCanvasScope(ctx, args.canvasId, args.workosOrgId);

    const dryRun = args.dryRun ?? true;
    if (!dryRun && args.confirm !== true) {
      throw new Error("Validation: confirm=true is required when dryRun=false");
    }

    const selected = await selectAgents(ctx, {
      token: args.token,
      workosOrgId: args.workosOrgId,
      canvasId: args.canvasId,
      ids: args.ids,
      includeDeleted: args.includeDeleted ?? true,
    });

    const maxAgents = Math.max(1, args.maxAgents ?? DEFAULT_MAX_AGENTS);
    if (selected.length > maxAgents) {
      throw new Error(`Validation: matched ${selected.length} agents, above maxAgents=${maxAgents}`);
    }

    const now = Date.now();
    const rolledBack: Array<{
      agentId: Id<"agents">;
      name: string;
      changedFields: string[];
      sourceHistoryTimestamp: number;
    }> = [];
    const skipped: Array<{ agentId: Id<"agents">; reason: string }> = [];

    for (const agent of selected) {
      const history = await ctx.db
        .query("agentHistory")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
        .collect();

      const candidate = history
        .filter((entry) => entry.changedAt <= args.beforeTimestamp && entry.previousData !== undefined)
        .sort((a, b) => b.changedAt - a.changedAt)[0];

      if (!candidate || !candidate.previousData) {
        skipped.push({ agentId: agent._id, reason: "No snapshot available before timestamp" });
        continue;
      }

      const beforeSnapshot = getAgentSnapshot(agent);
      const snapshotData = getRequiredFieldFallback(
        candidate.previousData as Record<string, unknown>,
        beforeSnapshot
      );
      const restoredData = sanitizeAgentData(snapshotData as MutableAgentData);

      if ((restoredData as Record<string, unknown>).canvasId !== args.canvasId) {
        skipped.push({ agentId: agent._id, reason: "Snapshot canvas mismatch" });
        continue;
      }

      const changedByRollback = diffFields(beforeSnapshot, restoredData as Record<string, unknown>);
      if (changedByRollback.length === 0) {
        skipped.push({ agentId: agent._id, reason: "Already at snapshot state" });
        continue;
      }

      const nextData = sanitizeAgentData({
        ...restoredData,
        updatedAt: now,
        updatedBy: ADMIN_CHANGED_BY,
      });
      const changedFields = diffFields(beforeSnapshot, nextData as Record<string, unknown>);

      rolledBack.push({
        agentId: agent._id,
        name: agent.name,
        changedFields,
        sourceHistoryTimestamp: candidate.changedAt,
      });

      if (!dryRun) {
        await ctx.db.replace(agent._id, nextData as Doc<"agents">);
        await recordHistory(ctx, agent._id, ADMIN_CHANGED_BY, CHANGE_TYPE.UPDATE, beforeSnapshot);
      }
    }

    return {
      dryRun,
      matchedAgents: selected.length,
      rolledBackAgents: rolledBack.length,
      skippedAgents: skipped.length,
      rolledBack,
      skipped,
    };
  },
});
