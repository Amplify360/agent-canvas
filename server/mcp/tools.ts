import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";
import { AGENT_STATUS_VALUES } from "../../shared/agentModel";

const agentFieldValuesSchema = {
  type: "object",
  properties: {
    objective: { type: "string" },
    description: { type: "string" },
    tools: { type: "array", items: { type: "string" } },
    journeySteps: { type: "array", items: { type: "string" } },
    demoLink: { type: "string" },
    videoLink: { type: "string" },
    category: { type: "string" },
    status: { type: "string", enum: [...AGENT_STATUS_VALUES] },
    metrics: {
      type: "object",
      properties: {
        numberOfUsers: { type: "number" },
        timesUsed: { type: "number" },
        timeSaved: { type: "number" },
        roi: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: true,
} as const;

const updateAgentFieldsSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    phase: { type: "string" },
    agentOrder: { type: "number" },
    fieldValues: agentFieldValuesSchema,
  },
  additionalProperties: false,
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
          description: "Use create_agent with name and phase to add a new agent. Use update_agent with agentId plus either fields:{...} or top-level name/phase/agentOrder/fieldValues. fieldValues supports common keys such as category, description, objective, tools, journeySteps, status, and metrics.",
          items: {
            anyOf: [
              {
                type: "object",
                properties: {
                  type: { const: "create_agent" },
                  name: { type: "string" },
                  phase: { type: "string" },
                  agentOrder: { type: "number" },
                  fieldValues: agentFieldValuesSchema,
                },
                required: ["type", "name", "phase"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "update_agent" },
                  agentId: { type: "string" },
                  name: { type: "string" },
                  phase: { type: "string" },
                  agentOrder: { type: "number" },
                  fieldValues: agentFieldValuesSchema,
                  fields: updateAgentFieldsSchema,
                },
                required: ["type", "agentId"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "update_canvas" },
                  title: { type: "string" },
                  slug: { type: "string" },
                },
                required: ["type"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "rename_phase" },
                  fromPhase: { type: "string" },
                  toPhase: { type: "string" },
                },
                required: ["type", "fromPhase", "toPhase"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "reorder_phases" },
                  phases: { type: "array", items: { type: "string" } },
                },
                required: ["type", "phases"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "reorder_categories" },
                  categories: { type: "array", items: { type: "string" } },
                },
                required: ["type", "categories"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "move_agent" },
                  agentId: { type: "string" },
                  phase: { type: "string" },
                  agentOrder: { type: "number" },
                },
                required: ["type", "agentId", "phase", "agentOrder"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  type: { const: "delete_agent" },
                  agentId: { type: "string" },
                },
                required: ["type", "agentId"],
                additionalProperties: false,
              },
            ],
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

  throw new Error(`Unknown tool: ${name}`);
}
