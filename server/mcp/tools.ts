import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";
import { AGENT_STATUS_VALUES } from "../../shared/agentModel";
import {
  TRANSFORMATION_ARTIFACT_STATUS_VALUES,
  TRANSFORMATION_DEVIATION_CLASSIFICATION_VALUES,
  TRANSFORMATION_DEVIATION_IMPACT_VALUES,
  TRANSFORMATION_DEVIATION_TREATMENT_VALUES,
  TRANSFORMATION_FLOW_STEP_TYPE_VALUES,
  TRANSFORMATION_INITIATIVE_STATUS_VALUES,
  TRANSFORMATION_SERVICE_STATUS_VALUES,
  TRANSFORMATION_SOURCE_TYPE_VALUES,
} from "../../convex/lib/transformationMap";

const agentFieldValuesSchema = {
  type: "object",
  description: `Common keys: objective, description, tools[], journeySteps[], category, status (${AGENT_STATUS_VALUES.join(", ")}), metrics{numberOfUsers,timesUsed,timeSaved,roi}. Additional custom keys are allowed.`,
  additionalProperties: true,
} as const;

const updateAgentFieldsSchema = {
  type: "object",
  description: "For update_agent only. Same shape as top-level name, phase, agentOrder, and fieldValues.",
  additionalProperties: true,
} as const;

const transformationModelDescription = [
  "Concept model: a Transformation Map contains top-level pressures and objectives, plus departments; departments contain services.",
  "Use stable keys for references: mapSlug identifies the map, department `key` / `departmentKey` identifies a department, and service `key` / `serviceKey` identifies a service.",
  "Names and descriptions are display fields and may change; keys are the durable identifiers for future mutations.",
].join(" ");

const mapConcurrencyDescription = [
  "`expectedUpdatedAt` is optional optimistic concurrency.",
  "If supplied and stale, the tool returns `{ ok: false, conflict: { expectedUpdatedAt, actualUpdatedAt } }` and applies nothing.",
].join(" ");

const mapDryRunDescription = [
  "`dryRun` defaults to true.",
  "When true, the tool validates the request and returns a summary without persisting changes or advancing `updatedAt`.",
].join(" ");

const transformationWriteCapabilitiesDescription = [
  "Current MCP write support covers map metadata, top-level pressures, departments, services, objectives, department-scoped objective upserts via `apply_department_analysis`, and service analyses.",
  "Use `create_pressure` / `update_pressure` / `delete_pressure` for top-level external pressures or internal pain points, and `create_objective` / `update_objective` / `delete_objective` for enterprise or department objectives.",
].join(" ");

const transformationOperationUsageDescription = [
  "Validation is operation-specific and rejects unrelated fields for a given operation type.",
  "For each operation, send only the fields used by that operation type. Do not include blank, null, or placeholder values for unrelated fields.",
  "Create operations use `key`. Update/delete operations use the existing identifier field such as `pressureKey`, `objectiveKey`, `departmentKey`, or `serviceKey`.",
  "Operation-specific allowed fields:",
  "- `create_pressure`: `type`, `key`, `pressureType`, `title`, `description`, `evidence`, `order`.",
  "- `update_pressure`: `type`, `pressureKey`, `pressureType`, `title`, `description`, `evidence`, `order`.",
  "- `delete_pressure`: `type`, `pressureKey`.",
  "- `create_objective` with `scope: \"enterprise\"`: `type`, `key`, `scope`, `title`, `description`, `linkedPressureKeys`, `order`.",
  "- `create_objective` with `scope: \"department\"`: `type`, `key`, `scope`, `departmentKey`, `title`, `description`, `linkedPressureKeys`, `order`.",
  "- `update_objective`: `type`, `objectiveKey`, `title`, `description`, `linkedPressureKeys`, `order`.",
  "- `delete_objective`: `type`, `objectiveKey`.",
  "- `create_department`: `type`, `key`, `name`, `description`, `keyIssues`, `improvementMandates`, `order`.",
  "- `update_department`: `type`, `departmentKey`, `name`, `description`, `keyIssues`, `improvementMandates`, `order`.",
  "- `reorder_departments`: `type`, `departmentKeys`.",
  "- `create_service`: `type`, `key`, `departmentKey`, `name`, `purpose`, `customer`, `trigger`, `outcome`, `constraints`, `status`, `effectivenessMetric`, `efficiencyMetric`, `order`.",
  "- `update_service`: `type`, `serviceKey`, `departmentKey`, `name`, `purpose`, `customer`, `trigger`, `outcome`, `constraints`, `status`, `effectivenessMetric`, `efficiencyMetric`, `order`.",
  "- `reorder_services`: `type`, `departmentKey`, `serviceKeys`.",
  "Minimal per-operation examples:",
  '{"type":"create_pressure","key":"payment-timing-pressure","pressureType":"external","title":"Suppliers expect faster payment visibility","description":"Suppliers increasingly expect predictable payment timing and status transparency.","evidence":["More inbound payment status queries"],"order":0}',
  '{"type":"create_objective","key":"improve-payment-transparency","scope":"enterprise","title":"Improve payment transparency","description":"Provide clearer invoice and payment status visibility.","linkedPressureKeys":["payment-timing-pressure"],"order":0}',
  '{"type":"update_pressure","pressureKey":"payment-timing-pressure","title":"Suppliers expect clearer payment visibility"}',
  '{"type":"delete_objective","objectiveKey":"improve-payment-transparency"}',
].join("\n");

type TransformationOperationType =
  | "update_map"
  | "create_pressure"
  | "update_pressure"
  | "delete_pressure"
  | "create_objective"
  | "update_objective"
  | "delete_objective"
  | "create_department"
  | "update_department"
  | "reorder_departments"
  | "create_service"
  | "update_service"
  | "reorder_services";

function transformationOperationTypeField(
  operationType: TransformationOperationType,
  description: string
) {
  return {
    type: "string",
    enum: [operationType],
    description,
  } as const;
}

function transformationStringField(description: string) {
  return { type: "string", description } as const;
}

function transformationNumberField(description: string) {
  return { type: "number", description } as const;
}

function transformationStringArrayField(description: string) {
  return {
    type: "array",
    description,
    items: { type: "string" },
  } as const;
}

function transformationEnumField<T extends readonly string[]>(values: T, description: string) {
  return {
    type: "string",
    enum: [...values],
    description,
  } as const;
}

const updateMapOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `title`, `slug`, `description`. Updates the map record; `slug` is optional but must normalize to a non-empty unique slug when supplied.",
  properties: {
    type: transformationOperationTypeField("update_map", "Operation type."),
    title: transformationStringField("Optional new map title."),
    slug: transformationStringField("Optional new map slug."),
    description: transformationStringField("Optional new map description."),
  },
  required: ["type"],
  additionalProperties: false,
} as const;

const createPressureOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `key`, `pressureType`, `title`, `description`, `evidence`, `order`. Creates one top-level pressure or internal pain point.",
  properties: {
    type: transformationOperationTypeField("create_pressure", "Operation type."),
    key: transformationStringField("Required new pressure key."),
    pressureType: transformationEnumField(
      ["external", "internal"] as const,
      "Required pressure classification."
    ),
    title: transformationStringField("Required pressure title."),
    description: transformationStringField("Optional pressure description."),
    evidence: transformationStringArrayField("Optional evidence statements."),
    order: transformationNumberField("Optional explicit sort order."),
  },
  required: ["type", "key", "pressureType", "title"],
  additionalProperties: false,
} as const;

const updatePressureOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `pressureKey`, `pressureType`, `title`, `description`, `evidence`, `order`. Updates one existing pressure.",
  properties: {
    type: transformationOperationTypeField("update_pressure", "Operation type."),
    pressureKey: transformationStringField("Required existing pressure key."),
    pressureType: transformationEnumField(
      ["external", "internal"] as const,
      "Optional replacement pressure classification."
    ),
    title: transformationStringField("Optional replacement title."),
    description: transformationStringField("Optional replacement description."),
    evidence: transformationStringArrayField("Optional replacement evidence list."),
    order: transformationNumberField("Optional replacement sort order."),
  },
  required: ["type", "pressureKey"],
  additionalProperties: false,
} as const;

const deletePressureOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `pressureKey`. Deletes one pressure and removes it from any linked objectives.",
  properties: {
    type: transformationOperationTypeField("delete_pressure", "Operation type."),
    pressureKey: transformationStringField("Required existing pressure key."),
  },
  required: ["type", "pressureKey"],
  additionalProperties: false,
} as const;

const createEnterpriseObjectiveOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `key`, `scope`, `title`, `description`, `linkedPressureKeys`, `order`. Creates one enterprise-scoped objective.",
  properties: {
    type: transformationOperationTypeField("create_objective", "Operation type."),
    key: transformationStringField("Required new objective key."),
    scope: transformationEnumField(["enterprise"] as const, "Required objective scope."),
    title: transformationStringField("Required objective title."),
    description: transformationStringField("Required objective description."),
    linkedPressureKeys: transformationStringArrayField("Optional linked pressure keys."),
    order: transformationNumberField("Optional explicit sort order."),
  },
  required: ["type", "key", "scope", "title", "description"],
  additionalProperties: false,
} as const;

const createDepartmentObjectiveOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `key`, `scope`, `departmentKey`, `title`, `description`, `linkedPressureKeys`, `order`. Creates one department-scoped objective.",
  properties: {
    type: transformationOperationTypeField("create_objective", "Operation type."),
    key: transformationStringField("Required new objective key."),
    scope: transformationEnumField(["department"] as const, "Required objective scope."),
    departmentKey: transformationStringField("Required parent department key."),
    title: transformationStringField("Required objective title."),
    description: transformationStringField("Required objective description."),
    linkedPressureKeys: transformationStringArrayField("Optional linked pressure keys."),
    order: transformationNumberField("Optional explicit sort order."),
  },
  required: ["type", "key", "scope", "departmentKey", "title", "description"],
  additionalProperties: false,
} as const;

const updateObjectiveOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `objectiveKey`, `title`, `description`, `linkedPressureKeys`, `order`. Updates one existing objective. Scope and department cannot be changed here.",
  properties: {
    type: transformationOperationTypeField("update_objective", "Operation type."),
    objectiveKey: transformationStringField("Required existing objective key."),
    title: transformationStringField("Optional replacement title."),
    description: transformationStringField("Optional replacement description."),
    linkedPressureKeys: transformationStringArrayField("Optional replacement linked pressure keys."),
    order: transformationNumberField("Optional replacement sort order."),
  },
  required: ["type", "objectiveKey"],
  additionalProperties: false,
} as const;

const deleteObjectiveOperationSchema = {
  type: "object",
  description: "Allowed fields: `type`, `objectiveKey`. Deletes one existing objective.",
  properties: {
    type: transformationOperationTypeField("delete_objective", "Operation type."),
    objectiveKey: transformationStringField("Required existing objective key."),
  },
  required: ["type", "objectiveKey"],
  additionalProperties: false,
} as const;

const createDepartmentOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `key`, `name`, `description`, `keyIssues`, `improvementMandates`, `order`. Creates one department.",
  properties: {
    type: transformationOperationTypeField("create_department", "Operation type."),
    key: transformationStringField("Required new department key."),
    name: transformationStringField("Required department display name."),
    description: transformationStringField("Optional department description."),
    keyIssues: transformationStringArrayField("Optional department issue list."),
    improvementMandates: transformationStringArrayField("Optional department mandate titles."),
    order: transformationNumberField("Optional explicit sort order."),
  },
  required: ["type", "key", "name"],
  additionalProperties: false,
} as const;

const updateDepartmentOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `departmentKey`, `name`, `description`, `keyIssues`, `improvementMandates`, `order`. Updates one existing department.",
  properties: {
    type: transformationOperationTypeField("update_department", "Operation type."),
    departmentKey: transformationStringField("Required existing department key."),
    name: transformationStringField("Optional replacement department name."),
    description: transformationStringField("Optional replacement department description."),
    keyIssues: transformationStringArrayField("Optional replacement department issue list."),
    improvementMandates: transformationStringArrayField(
      "Optional replacement department mandate titles."
    ),
    order: transformationNumberField("Optional replacement sort order."),
  },
  required: ["type", "departmentKey"],
  additionalProperties: false,
} as const;

const reorderDepartmentsOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `departmentKeys`. Replaces the full department order with the supplied keys.",
  properties: {
    type: transformationOperationTypeField("reorder_departments", "Operation type."),
    departmentKeys: transformationStringArrayField("Required ordered department key list."),
  },
  required: ["type", "departmentKeys"],
  additionalProperties: false,
} as const;

const createServiceOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `key`, `departmentKey`, `name`, `purpose`, `customer`, `trigger`, `outcome`, `constraints`, `status`, `effectivenessMetric`, `efficiencyMetric`, `order`. Creates one service under an existing department.",
  properties: {
    type: transformationOperationTypeField("create_service", "Operation type."),
    key: transformationStringField("Required new service key."),
    departmentKey: transformationStringField("Required parent department key."),
    name: transformationStringField("Required service display name."),
    purpose: transformationStringField("Optional service purpose."),
    customer: transformationStringField("Optional service customer."),
    trigger: transformationStringField("Optional service trigger."),
    outcome: transformationStringField("Optional service outcome."),
    constraints: transformationStringArrayField("Optional service constraints."),
    status: transformationEnumField(
      TRANSFORMATION_SERVICE_STATUS_VALUES,
      `Optional service status. Allowed values: ${TRANSFORMATION_SERVICE_STATUS_VALUES.join(", ")}.`
    ),
    effectivenessMetric: transformationStringField("Optional effectiveness metric."),
    efficiencyMetric: transformationStringField("Optional efficiency metric."),
    order: transformationNumberField("Optional explicit sort order."),
  },
  required: ["type", "key", "departmentKey", "name"],
  additionalProperties: false,
} as const;

const updateServiceOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `serviceKey`, `departmentKey`, `name`, `purpose`, `customer`, `trigger`, `outcome`, `constraints`, `status`, `effectivenessMetric`, `efficiencyMetric`, `order`. Updates one service and may relocate it by changing `departmentKey`.",
  properties: {
    type: transformationOperationTypeField("update_service", "Operation type."),
    serviceKey: transformationStringField("Required existing service key."),
    departmentKey: transformationStringField("Optional target department key for relocation."),
    name: transformationStringField("Optional replacement service name."),
    purpose: transformationStringField("Optional replacement service purpose."),
    customer: transformationStringField("Optional replacement service customer."),
    trigger: transformationStringField("Optional replacement service trigger."),
    outcome: transformationStringField("Optional replacement service outcome."),
    constraints: transformationStringArrayField("Optional replacement service constraints."),
    status: transformationEnumField(
      TRANSFORMATION_SERVICE_STATUS_VALUES,
      `Optional service status. Allowed values: ${TRANSFORMATION_SERVICE_STATUS_VALUES.join(", ")}.`
    ),
    effectivenessMetric: transformationStringField("Optional replacement effectiveness metric."),
    efficiencyMetric: transformationStringField("Optional replacement efficiency metric."),
    order: transformationNumberField("Optional replacement sort order."),
  },
  required: ["type", "serviceKey"],
  additionalProperties: false,
} as const;

const reorderServicesOperationSchema = {
  type: "object",
  description:
    "Allowed fields: `type`, `departmentKey`, `serviceKeys`. Replaces the full service order for one department.",
  properties: {
    type: transformationOperationTypeField("reorder_services", "Operation type."),
    departmentKey: transformationStringField("Required target department key."),
    serviceKeys: transformationStringArrayField("Required ordered service key list."),
  },
  required: ["type", "departmentKey", "serviceKeys"],
  additionalProperties: false,
} as const;

const transformationOperationSchema = {
  description: [
    "One structural mutation. `operations` is required and is applied in order.",
    "Machine-readable schema: this item is a discriminated union by `type`.",
    transformationOperationUsageDescription,
    "Supported types:",
    "- `update_map`: update map title, description, or slug.",
    "- `create_pressure`: create a top-level pressure or pain point with a stable `key` and `pressureType` (`external` or `internal`).",
    "- `update_pressure`: update an existing pressure identified by `pressureKey`.",
    "- `delete_pressure`: delete an existing pressure identified by `pressureKey` and unlink it from any objectives.",
    "- `create_objective`: create an objective with scope `enterprise` or `department`.",
    "- `update_objective`: update an existing objective identified by `objectiveKey`.",
    "- `delete_objective`: delete an existing objective identified by `objectiveKey`.",
    "- `create_department`: create a department with a new stable `key` and display `name`.",
    "- `update_department`: update an existing department identified by `departmentKey`.",
    "- `reorder_departments`: provide the full ordered `departmentKeys` array.",
    "- `create_service`: create a service with a new stable `key` under `departmentKey`.",
    "- `update_service`: update an existing service identified by `serviceKey`; set `departmentKey` to relocate it.",
    "- `reorder_services`: provide ordered `serviceKeys` for one `departmentKey`.",
    "Common validation errors: missing required fields for the chosen type, unsupported operation type, unknown `pressureKey`, unknown `objectiveKey`, unknown `departmentKey`, unknown `serviceKey`, duplicate new keys, or stale `expectedUpdatedAt`.",
  ].join("\n"),
  oneOf: [
    updateMapOperationSchema,
    createPressureOperationSchema,
    updatePressureOperationSchema,
    deletePressureOperationSchema,
    createEnterpriseObjectiveOperationSchema,
    createDepartmentObjectiveOperationSchema,
    updateObjectiveOperationSchema,
    deleteObjectiveOperationSchema,
    createDepartmentOperationSchema,
    updateDepartmentOperationSchema,
    reorderDepartmentsOperationSchema,
    createServiceOperationSchema,
    updateServiceOperationSchema,
    reorderServicesOperationSchema,
  ],
} as const;

const transformationDepartmentAnalysisObjectiveSchema = {
  type: "object",
  properties: {
    key: { type: "string", description: "Stable objective key within the map." },
    title: { type: "string", description: "Objective title shown in the UI." },
    description: { type: "string", description: "Objective explanation." },
    linkedPressureKeys: {
      type: "array",
      description: "Pressure keys that justify this objective.",
      items: { type: "string" },
    },
  },
  required: ["key", "title", "description", "linkedPressureKeys"],
  additionalProperties: false,
} as const;

const transformationServiceFieldsSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    purpose: { type: "string" },
    customer: { type: "string" },
    trigger: { type: "string" },
    outcome: { type: "string" },
    constraints: { type: "array", items: { type: "string" } },
    status: {
      type: "string",
      enum: [...TRANSFORMATION_SERVICE_STATUS_VALUES],
    },
    effectivenessMetric: { type: "string" },
    efficiencyMetric: { type: "string" },
  },
  required: [
    "name",
    "purpose",
    "customer",
    "trigger",
    "outcome",
    "constraints",
    "status",
    "effectivenessMetric",
    "efficiencyMetric",
  ],
  additionalProperties: false,
} as const;

const transformationDepartmentAnalysisServiceSchema = {
  type: "object",
  properties: {
    key: { type: "string", description: "Stable service key within the map." },
    ...transformationServiceFieldsSchema.properties,
  },
  required: ["key", ...transformationServiceFieldsSchema.required],
  additionalProperties: false,
} as const;

const transformationFlowStepSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Stable step id within this analysis payload." },
    serviceId: { type: "string", description: "Service key repeated on each step." },
    flowType: { type: "string", enum: ["ideal", "current"] },
    order: { type: "number" },
    description: { type: "string" },
    stepType: {
      type: "string",
      enum: [...TRANSFORMATION_FLOW_STEP_TYPE_VALUES],
      description: `Allowed values: ${TRANSFORMATION_FLOW_STEP_TYPE_VALUES.join(", ")}.`,
    },
    hasDeviation: { type: "boolean" },
    parallelGroup: { type: "string" },
    groupLabel: { type: "string" },
  },
  required: ["id", "serviceId", "flowType", "order", "description", "stepType"],
  additionalProperties: false,
} as const;

const transformationDeviationSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    serviceId: { type: "string" },
    flowStepId: { type: "string" },
    what: { type: "string" },
    why: { type: "string" },
    necessary: { type: "boolean" },
    impact: {
      type: "string",
      enum: [...TRANSFORMATION_DEVIATION_IMPACT_VALUES],
    },
    treatment: {
      type: "string",
      enum: [...TRANSFORMATION_DEVIATION_TREATMENT_VALUES],
    },
    classification: {
      type: "string",
      enum: [...TRANSFORMATION_DEVIATION_CLASSIFICATION_VALUES],
    },
  },
  required: [
    "id",
    "serviceId",
    "what",
    "why",
    "necessary",
    "impact",
    "treatment",
    "classification",
  ],
  additionalProperties: false,
} as const;

const transformationLinkedAgentSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Stable linked-agent id in the analysis payload." },
    canvasAgentId: { type: "string", description: "Optional canvas agent id when linked to a real agent." },
    name: { type: "string" },
    role: { type: "string" },
  },
  required: ["id", "name", "role"],
  additionalProperties: false,
} as const;

const transformationInitiativeSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    serviceId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    status: {
      type: "string",
      enum: [...TRANSFORMATION_INITIATIVE_STATUS_VALUES],
    },
    linkedAgents: {
      type: "array",
      items: transformationLinkedAgentSchema,
    },
  },
  required: ["id", "serviceId", "title", "description", "status", "linkedAgents"],
  additionalProperties: false,
} as const;

const transformationAnalysisCommonSchema = {
  sourceType: {
    type: "string",
    enum: [...TRANSFORMATION_SOURCE_TYPE_VALUES],
    description: `Optional provenance marker. Allowed values: ${TRANSFORMATION_SOURCE_TYPE_VALUES.join(", ")}.`,
  },
  sourceRef: {
    type: "string",
    description: "Optional upstream reference such as a prompt id, file, or ticket.",
  },
} as const;

export const MCP_TOOLS = [
  {
    name: "whoami",
    description: "Returns token identity, scopes, org, and defaultCanvasId.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
  },
  {
    name: "list_canvases",
    description: "Lists canvases in the token's organization.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        updatedSince: { type: "number" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_canvas_snapshot",
    description: "Gets a canvas snapshot. If canvasId and canvasSlug are omitted, uses the token default canvas.",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string" },
        canvasSlug: { type: "string" },
        view: {
          type: "string",
          enum: ["compact", "full"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_canvas",
    description: "Creates a new canvas in the token's organization and returns its canvasId. Use apply_canvas_changes afterward to add agents.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        phases: { type: "array", items: { type: "string" } },
        categories: { type: "array", items: { type: "string" } },
      },
      required: ["title", "slug"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_canvas_changes",
    description: "Applies canvas edits. Supports create_agent and update_agent. If canvasId and canvasSlug are omitted, uses the token default canvas.",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string" },
        canvasSlug: { type: "string" },
        dryRun: { type: "boolean" },
        expectedUpdatedAt: { type: "number" },
        operations: {
          type: "array",
          description: "Use create_agent with name and phase to add an agent. Use update_agent with agentId plus either fields:{...} or top-level name/phase/agentOrder/fieldValues. Other supported types: update_canvas, rename_phase, reorder_phases, reorder_categories, move_agent, delete_agent.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "create_agent",
                  "update_agent",
                  "update_canvas",
                  "rename_phase",
                  "reorder_phases",
                  "reorder_categories",
                  "move_agent",
                  "delete_agent",
                ],
              },
              agentId: { type: "string" },
              name: { type: "string" },
              phase: { type: "string" },
              agentOrder: { type: "number" },
              fieldValues: agentFieldValuesSchema,
              fields: updateAgentFieldsSchema,
              title: { type: "string" },
              slug: { type: "string" },
              fromPhase: { type: "string" },
              toPhase: { type: "string" },
              phases: { type: "array", items: { type: "string" } },
              categories: { type: "array", items: { type: "string" } },
            },
            required: ["type"],
            additionalProperties: false,
          },
        },
      },
      required: ["operations"],
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_activity",
    description: "Gets recent activity. If canvasId and canvasSlug are omitted, uses the token default canvas when set.",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string" },
        canvasSlug: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 100 },
        updatedSince: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_transformation_maps",
    description: "Lists Transformation Maps in the token's organization. A map is the top-level container for departments and services.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_transformation_map_snapshot",
    description: `${transformationModelDescription} Gets a Transformation Map snapshot. If mapId and mapSlug are omitted, uses the most recently updated map in the token's organization.`,
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        view: {
          type: "string",
          enum: ["compact", "full"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_transformation_department_snapshot",
    description: `${transformationModelDescription} Gets a department snapshot within a Transformation Map.`,
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        departmentKey: { type: "string", description: "Stable department key, not the display name." },
      },
      required: ["departmentKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_transformation_service_snapshot",
    description: `${transformationModelDescription} Gets a service snapshot within a Transformation Map.`,
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        serviceKey: { type: "string", description: "Stable service key, not the display name." },
      },
      required: ["serviceKey"],
      additionalProperties: false,
    },
  },
  {
    name: "create_transformation_map",
    description: [
      `${transformationModelDescription}`,
      "Creates a new Transformation Map in the token's organization.",
      transformationWriteCapabilitiesDescription,
      "This tool has no dry-run mode; successful calls create the map immediately.",
      "Minimal example:",
      '{"title":"Operating Model 2026"}',
      "Typical example:",
      '{"title":"Operating Model 2026","slug":"operating-model-2026","description":"Finance and HR transformation baseline."}',
      "Common validation errors: missing title, empty slug after normalization, or duplicate slug in the same organization.",
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Map display title. Required." },
        slug: { type: "string", description: "Optional stable slug. If omitted, the server normalizes the title." },
        description: { type: "string", description: "Optional map description." },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_transformation_map_changes",
    description: [
      `${transformationModelDescription}`,
      "Applies structural edits to a Transformation Map such as creating, updating, reordering, and relocating departments and services.",
      transformationWriteCapabilitiesDescription,
      mapConcurrencyDescription,
      mapDryRunDescription,
      "Minimal valid example:",
      '{"mapSlug":"ops-map","dryRun":false,"operations":[{"type":"create_pressure","key":"margin-pressure","pressureType":"external","title":"Margin pressure"},{"type":"create_objective","key":"grow-margin","scope":"enterprise","title":"Grow margin","description":"Improve operating margin by reducing manual work.","linkedPressureKeys":["margin-pressure"]}]}',
      "Typical example:",
      '{"mapSlug":"ops-map","dryRun":false,"expectedUpdatedAt":123,"operations":[{"type":"create_pressure","key":"fragmented-systems","pressureType":"internal","title":"Fragmented systems","description":"Work is split across email, spreadsheets, and ERP workarounds.","evidence":["Duplicate data entry","Reconciliation delays"]},{"type":"create_objective","key":"single-intake","scope":"enterprise","title":"Create one intake path","description":"Standardize operational intake across teams.","linkedPressureKeys":["fragmented-systems"]},{"type":"update_department","departmentKey":"finance","description":"Shared services and reporting","keyIssues":["Manual reconciliations"],"improvementMandates":["Shorten close cycle"]},{"type":"create_service","key":"accounts-payable","departmentKey":"finance","name":"Accounts Payable","purpose":"Pay approved invoices","customer":"Suppliers","trigger":"Approved invoice received","outcome":"Invoice paid on time","constraints":["PO match","Segregation of duties"],"status":"not-analyzed","effectivenessMetric":"Invoices paid on time","efficiencyMetric":"Invoice cycle time"}]}',
      "Dry-run example:",
      '{"mapSlug":"ops-map","dryRun":true,"expectedUpdatedAt":123,"operations":[{"type":"update_pressure","pressureKey":"fragmented-systems","title":"Fragmented operating systems"},{"type":"update_objective","objectiveKey":"single-intake","title":"Establish one intake path"},{"type":"reorder_departments","departmentKeys":["finance","hr","it"]}]}',
      "Delete example:",
      '{"mapSlug":"ops-map","dryRun":false,"expectedUpdatedAt":123,"operations":[{"type":"delete_pressure","pressureKey":"legacy-workarounds"},{"type":"delete_objective","objectiveKey":"retire-legacy-intake"}]}',
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string", description: "Optional map id. Use mapId or mapSlug." },
        mapSlug: { type: "string", description: "Optional map slug. Use mapId or mapSlug. If both are supplied, mapId is used first." },
        dryRun: { type: "boolean", description: "Optional. Defaults to true." },
        expectedUpdatedAt: { type: "number", description: "Optional optimistic concurrency guard from a prior snapshot." },
        operations: {
          type: "array",
          description: "Required ordered list of structural mutations. Treat this as a discriminated union by `type`: send only the fields relevant to that operation.",
          items: transformationOperationSchema,
        },
      },
      required: ["operations"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_department_analysis",
    description: [
      `${transformationModelDescription}`,
      "Applies a department-level analysis bundle to one department in a Transformation Map.",
      transformationWriteCapabilitiesDescription,
      mapConcurrencyDescription,
      mapDryRunDescription,
      "Semantics: this replaces the department description, upserts improvement mandates by objective `key`, and upserts services by service `key` within the department. Existing objectives/services omitted from the payload are left untouched. `keyIssues` preserves the current value when omitted.",
      "Minimal valid example:",
      '{"mapSlug":"ops-map","dryRun":false,"departmentKey":"finance","payload":{"description":"Finance owns cash, reporting, and controls.","improvementMandates":[],"services":[]}}',
      "Typical example:",
      '{"mapSlug":"ops-map","dryRun":false,"expectedUpdatedAt":123,"departmentKey":"finance","payload":{"description":"Finance manages close, payables, and reporting.","keyIssues":["Manual reconciliations","Fragmented intake"],"improvementMandates":[{"key":"shorten-close","title":"Shorten month-end close","description":"Reduce close cycle time from 7 days to 3.","linkedPressureKeys":["margin-pressure"]}],"services":[{"key":"accounts-payable","name":"Accounts Payable","purpose":"Pay approved invoices","customer":"Suppliers","trigger":"Approved invoice received","outcome":"Invoice paid accurately and on time","constraints":["PO match"],"status":"not-analyzed","effectivenessMetric":"On-time payment rate","efficiencyMetric":"Invoice cycle time"}],"sourceType":"ai_generated","sourceRef":"analysis-run-42"}}',
      "Dry-run example:",
      '{"mapSlug":"ops-map","dryRun":true,"departmentKey":"finance","payload":{"description":"Draft department synthesis.","improvementMandates":[],"services":[]}}',
      "Common validation errors: unknown departmentKey, duplicate mandate keys in one payload, duplicate service keys in one payload, invalid service status, or stale expectedUpdatedAt.",
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string", description: "Optional map id. Use mapId or mapSlug." },
        mapSlug: { type: "string", description: "Optional map slug. Use mapId or mapSlug." },
        departmentKey: { type: "string", description: "Required stable department key." },
        dryRun: { type: "boolean", description: "Optional. Defaults to true." },
        expectedUpdatedAt: { type: "number", description: "Optional optimistic concurrency guard from a prior snapshot." },
        payload: {
          type: "object",
          description: "Required department analysis bundle.",
          properties: {
            description: {
              type: "string",
              description: "Required replacement department description.",
            },
            keyIssues: {
              type: "array",
              description: "Optional replacement issue list. When omitted, the current department keyIssues are preserved.",
              items: { type: "string" },
            },
            improvementMandates: {
              type: "array",
              description: "Required department-scoped objective upserts keyed by `key`.",
              items: transformationDepartmentAnalysisObjectiveSchema,
            },
            services: {
              type: "array",
              description: "Required service upserts within this department keyed by `key`.",
              items: transformationDepartmentAnalysisServiceSchema,
            },
            ...transformationAnalysisCommonSchema,
          },
          required: ["description", "improvementMandates", "services"],
          additionalProperties: false,
        },
      },
      required: ["departmentKey", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_service_analysis",
    description: [
      `${transformationModelDescription}`,
      "Applies a service-level analysis bundle to one service in a Transformation Map.",
      transformationWriteCapabilitiesDescription,
      mapConcurrencyDescription,
      mapDryRunDescription,
      `Semantics: this replaces the target service fields and replaces the full analysis arrays for idealFlowSteps, currentFlowSteps, deviations, and initiatives. Partial array merges are not supported. If \`reviewStatus\` is omitted, the saved review status defaults to \`reviewed\`.`,
      "Minimal valid example:",
      '{"mapSlug":"ops-map","dryRun":false,"serviceKey":"accounts-payable","payload":{"service":{"name":"Accounts Payable","purpose":"Pay approved invoices","customer":"Suppliers","trigger":"Approved invoice received","outcome":"Invoices paid on time","constraints":[],"status":"analyzed","effectivenessMetric":"On-time payment rate","efficiencyMetric":"Invoice cycle time"},"idealFlowSteps":[],"currentFlowSteps":[],"deviations":[],"initiatives":[]}}',
      "Typical example:",
      '{"mapSlug":"ops-map","dryRun":false,"expectedUpdatedAt":123,"serviceKey":"accounts-payable","payload":{"service":{"name":"Accounts Payable","purpose":"Pay approved invoices","customer":"Suppliers","trigger":"Approved invoice received","outcome":"Invoices paid accurately and on time","constraints":["PO match"],"status":"has-deviations","effectivenessMetric":"On-time payment rate","efficiencyMetric":"Invoice cycle time"},"idealFlowSteps":[{"id":"ideal-1","serviceId":"accounts-payable","flowType":"ideal","order":0,"description":"Validate invoice against PO","stepType":"control"}],"currentFlowSteps":[{"id":"current-1","serviceId":"accounts-payable","flowType":"current","order":0,"description":"Email invoice to shared mailbox","stepType":"input","hasDeviation":true}],"deviations":[{"id":"dev-1","serviceId":"accounts-payable","flowStepId":"current-1","what":"Invoices arrive in multiple inboxes","why":"Vendors use old addresses","necessary":false,"impact":"medium","treatment":"simplify","classification":"handoff"}],"initiatives":[{"id":"init-1","serviceId":"accounts-payable","title":"Standardize vendor intake","description":"Route all invoices through one portal.","status":"proposed","linkedAgents":[{"id":"agent-1","name":"Invoice Classifier","role":"triage"}]}],"reviewStatus":"reviewed","sourceType":"ai_generated","sourceRef":"analysis-run-42"}}',
      "Dry-run example:",
      '{"mapSlug":"ops-map","dryRun":true,"serviceKey":"accounts-payable","payload":{"service":{"name":"Accounts Payable","purpose":"Pay approved invoices","customer":"Suppliers","trigger":"Approved invoice received","outcome":"Invoices paid on time","constraints":[],"status":"analyzed","effectivenessMetric":"On-time payment rate","efficiencyMetric":"Invoice cycle time"},"idealFlowSteps":[],"currentFlowSteps":[],"deviations":[],"initiatives":[]}}',
      "Common validation errors: unknown serviceKey, invalid enum values in service status/flow steps/deviations/initiatives, or stale expectedUpdatedAt.",
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string", description: "Optional map id. Use mapId or mapSlug." },
        mapSlug: { type: "string", description: "Optional map slug. Use mapId or mapSlug." },
        serviceKey: { type: "string", description: "Required stable service key." },
        dryRun: { type: "boolean", description: "Optional. Defaults to true." },
        expectedUpdatedAt: { type: "number", description: "Optional optimistic concurrency guard from a prior snapshot." },
        payload: {
          type: "object",
          description: "Required service analysis bundle. Arrays replace the existing analysis arrays wholesale.",
          properties: {
            service: {
              ...transformationServiceFieldsSchema,
              description: "Required replacement service fields.",
            },
            idealFlowSteps: {
              type: "array",
              items: transformationFlowStepSchema,
            },
            currentFlowSteps: {
              type: "array",
              items: transformationFlowStepSchema,
            },
            deviations: {
              type: "array",
              items: transformationDeviationSchema,
            },
            initiatives: {
              type: "array",
              items: transformationInitiativeSchema,
            },
            reviewStatus: {
              type: "string",
              enum: [...TRANSFORMATION_ARTIFACT_STATUS_VALUES],
              description: `Optional review status. Allowed values: ${TRANSFORMATION_ARTIFACT_STATUS_VALUES.join(", ")}. Defaults to reviewed.`,
            },
            ...transformationAnalysisCommonSchema,
          },
          required: ["service", "idealFlowSteps", "currentFlowSteps", "deviations", "initiatives"],
          additionalProperties: false,
        },
      },
      required: ["serviceKey", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "set_transformation_review_status",
    description: [
      `${transformationModelDescription}`,
      "Updates the review status of an existing service analysis within a Transformation Map.",
      transformationWriteCapabilitiesDescription,
      "The target service must already have an attached analysis record; otherwise the tool returns `NotFound: Service analysis not found`.",
      `Allowed reviewStatus values: ${TRANSFORMATION_ARTIFACT_STATUS_VALUES.join(", ")}. Current implementation allows all transitions, including to and from archived.`,
      "Successful calls update the analysis reviewStatus, review metadata, and the parent map updatedAt timestamp.",
      "Minimal valid example:",
      '{"mapSlug":"ops-map","serviceKey":"accounts-payable","reviewStatus":"reviewed"}',
      "Typical example:",
      '{"mapSlug":"ops-map","serviceKey":"accounts-payable","reviewStatus":"approved"}',
    ].join("\n"),
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string", description: "Optional map id. Use mapId or mapSlug." },
        mapSlug: { type: "string", description: "Optional map slug. Use mapId or mapSlug." },
        serviceKey: { type: "string", description: "Required stable service key with an existing analysis." },
        reviewStatus: {
          type: "string",
          enum: [...TRANSFORMATION_ARTIFACT_STATUS_VALUES],
          description: `Required target review status. Allowed values: ${TRANSFORMATION_ARTIFACT_STATUS_VALUES.join(", ")}.`,
        },
      },
      required: ["serviceKey", "reviewStatus"],
      additionalProperties: false,
    },
  },
];

export async function executeTool(convex: ConvexHttpClient, auth: AuthContext, name: string, args: Record<string, unknown>) {
  if (name === "whoami") {
    requireScope(auth, "canvas:read");
    return convex.query((api as any).mcp.whoami, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
    });
  }

  if (name === "list_canvases") {
    requireScope(auth, "canvas:read");
    return convex.query((api as any).mcp.listCanvases, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      text: args.text,
      updatedSince: args.updatedSince,
      limit: args.limit,
    });
  }

  if (name === "get_canvas_snapshot") {
    requireScope(auth, "canvas:read");
    return convex.query((api as any).mcp.getCanvasSnapshot, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      view: args.view,
    });
  }

  if (name === "create_canvas") {
    requireScope(auth, "canvas:write");
    return convex.mutation((api as any).mcp.createCanvas, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      title: args.title,
      slug: args.slug,
      phases: args.phases,
      categories: args.categories,
    });
  }

  if (name === "apply_canvas_changes") {
    requireScope(auth, "canvas:write");
    return convex.mutation((api as any).mcp.applyCanvasChanges, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      dryRun: args.dryRun,
      expectedUpdatedAt: args.expectedUpdatedAt,
      operations: args.operations,
    });
  }

  if (name === "get_recent_activity") {
    requireScope(auth, "canvas:read");
    return convex.query((api as any).mcp.getRecentActivity, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      limit: args.limit,
      updatedSince: args.updatedSince,
    });
  }

  if (name === "list_transformation_maps") {
    requireScope(auth, "transformation:read");
    return convex.query((api as any).mcp.listTransformationMaps, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      text: args.text,
      limit: args.limit,
    });
  }

  if (name === "get_transformation_map_snapshot") {
    requireScope(auth, "transformation:read");
    return convex.query((api as any).mcp.getTransformationMapSnapshot, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      view: args.view,
    });
  }

  if (name === "get_transformation_department_snapshot") {
    requireScope(auth, "transformation:read");
    return convex.query((api as any).mcp.getTransformationDepartmentSnapshot, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      departmentKey: args.departmentKey,
    });
  }

  if (name === "get_transformation_service_snapshot") {
    requireScope(auth, "transformation:read");
    return convex.query((api as any).mcp.getTransformationServiceSnapshot, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      serviceKey: args.serviceKey,
    });
  }

  if (name === "create_transformation_map") {
    requireScope(auth, "transformation:write");
    return convex.mutation((api as any).mcp.createTransformationMap, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      title: args.title,
      slug: args.slug,
      description: args.description,
    });
  }

  if (name === "apply_transformation_map_changes") {
    requireScope(auth, "transformation:write");
    return convex.mutation((api as any).mcp.applyTransformationMapChanges, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      dryRun: args.dryRun,
      expectedUpdatedAt: args.expectedUpdatedAt,
      operations: args.operations,
    });
  }

  if (name === "apply_department_analysis") {
    requireScope(auth, "transformation:write");
    return convex.mutation((api as any).mcp.applyTransformationDepartmentAnalysis, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      dryRun: args.dryRun,
      expectedUpdatedAt: args.expectedUpdatedAt,
      departmentKey: args.departmentKey,
      payload: args.payload,
    });
  }

  if (name === "apply_service_analysis") {
    requireScope(auth, "transformation:write");
    return convex.mutation((api as any).mcp.applyTransformationServiceAnalysis, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      dryRun: args.dryRun,
      expectedUpdatedAt: args.expectedUpdatedAt,
      serviceKey: args.serviceKey,
      payload: args.payload,
    });
  }

  if (name === "set_transformation_review_status") {
    requireScope(auth, "transformation:review");
    return convex.mutation((api as any).mcp.setTransformationReviewStatus, {
      tokenPrefix: auth.tokenPrefix,
      tokenHash: auth.tokenHash,
      mapId: args.mapId,
      mapSlug: args.mapSlug,
      serviceKey: args.serviceKey,
      reviewStatus: args.reviewStatus,
    });
  }

  throw new Error(`Unknown tool: ${name}`);
}
