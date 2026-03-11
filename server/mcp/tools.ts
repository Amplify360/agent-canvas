import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";

export const MCP_TOOLS = [
  {
    name: "whoami",
    title: "Who Am I",
    description: "Get service token identity and org scope",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "list_canvases",
    title: "List Canvases",
    description: "List canvases available to the token's organization",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Optional case-insensitive search over canvas title or slug" },
        updatedSince: { type: "number", description: "Optional Unix timestamp in milliseconds" },
        limit: { type: "number", minimum: 1, maximum: 100, description: "Maximum number of canvases to return" },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "get_canvas_snapshot",
    title: "Get Canvas Snapshot",
    description: "Get a compact or full snapshot of a canvas",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string", description: "Canvas ID to fetch" },
        canvasSlug: { type: "string", description: "Canvas slug to fetch" },
        view: {
          type: "string",
          enum: ["compact", "full"],
          description: "Whether to include full field values for each agent",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "apply_canvas_changes",
    title: "Apply Canvas Changes",
    description: "Apply a batch of canvas and agent edits to an existing canvas",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string", description: "Canvas ID to update" },
        canvasSlug: { type: "string", description: "Canvas slug to update" },
        dryRun: { type: "boolean", description: "If true, validate and summarize changes without persisting them" },
        expectedUpdatedAt: {
          type: "number",
          description: "Optional optimistic concurrency check against the current canvas updatedAt timestamp",
        },
        operations: {
          type: "array",
          description: "Ordered list of canvas state operations to apply",
          items: {
            type: "object",
          },
        },
      },
      required: ["operations"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_recent_activity",
    title: "Get Recent Activity",
    description: "Get recent change history for canvases visible to the token",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string", description: "Optional canvas ID filter" },
        canvasSlug: { type: "string", description: "Optional canvas slug filter" },
        limit: { type: "number", minimum: 1, maximum: 100, description: "Maximum number of activity records to return" },
        updatedSince: { type: "number", description: "Optional Unix timestamp in milliseconds" },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
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
