import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";

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
    name: "apply_canvas_changes",
    description: "Applies canvas edits. If canvasId and canvasSlug are omitted, uses the token default canvas.",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string" },
        canvasSlug: { type: "string" },
        dryRun: { type: "boolean" },
        expectedUpdatedAt: { type: "number" },
        operations: {
          type: "array",
          items: {
            type: "object",
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
