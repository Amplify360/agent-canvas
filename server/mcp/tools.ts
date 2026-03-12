import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";
import { AGENT_STATUS_VALUES } from "../../shared/agentModel";

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
    description: "Lists Transformation Maps in the token's organization.",
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
    description: "Gets a Transformation Map snapshot. If mapId and mapSlug are omitted, uses the most recently updated map in the token's organization.",
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
    description: "Gets a department snapshot within a Transformation Map.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        departmentKey: { type: "string" },
      },
      required: ["departmentKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_transformation_service_snapshot",
    description: "Gets a service snapshot within a Transformation Map.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        serviceKey: { type: "string" },
      },
      required: ["serviceKey"],
      additionalProperties: false,
    },
  },
  {
    name: "create_transformation_map",
    description: "Creates a new Transformation Map in the token's organization.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_transformation_map_changes",
    description: "Applies structural edits to a Transformation Map such as creating, updating, reordering, and relocating departments and services.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        dryRun: { type: "boolean" },
        expectedUpdatedAt: { type: "number" },
        operations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      required: ["operations"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_department_analysis",
    description: "Applies a department-level analysis bundle to a Transformation Map.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        departmentKey: { type: "string" },
        dryRun: { type: "boolean" },
        expectedUpdatedAt: { type: "number" },
        payload: {
          type: "object",
          additionalProperties: true,
        },
      },
      required: ["departmentKey", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_service_analysis",
    description: "Applies a service-level analysis bundle to a Transformation Map.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        serviceKey: { type: "string" },
        dryRun: { type: "boolean" },
        expectedUpdatedAt: { type: "number" },
        payload: {
          type: "object",
          additionalProperties: true,
        },
      },
      required: ["serviceKey", "payload"],
      additionalProperties: false,
    },
  },
  {
    name: "set_transformation_review_status",
    description: "Updates the review status of a service analysis within a Transformation Map.",
    inputSchema: {
      type: "object",
      properties: {
        mapId: { type: "string" },
        mapSlug: { type: "string" },
        serviceKey: { type: "string" },
        reviewStatus: {
          type: "string",
          enum: ["draft", "reviewed", "approved", "archived"],
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
