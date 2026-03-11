import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { AuthContext, requireScope } from "./auth";

export const MCP_TOOLS = [
  { name: "whoami", description: "Get service token identity and org scope" },
  { name: "list_canvases", description: "List canvases for token org" },
  { name: "get_canvas_snapshot", description: "Get compact or full snapshot" },
  { name: "apply_canvas_changes", description: "Apply batch edits to an existing canvas" },
  { name: "get_recent_activity", description: "Get recent activity entries" },
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
