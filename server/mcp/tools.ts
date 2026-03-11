import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../convex/_generated/api";
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
    return convex.query((internal as any).mcp.whoami, { tokenId: auth.tokenId });
  }

  if (name === "list_canvases") {
    requireScope(auth, "canvas:read");
    return convex.query((internal as any).mcp.listCanvases, {
      workosOrgId: auth.workosOrgId,
      text: args.text,
      updatedSince: args.updatedSince,
      limit: args.limit,
    });
  }

  if (name === "get_canvas_snapshot") {
    requireScope(auth, "canvas:read");
    return convex.query((internal as any).mcp.getCanvasSnapshot, {
      workosOrgId: auth.workosOrgId,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      defaultCanvasId: auth.defaultCanvasId,
      view: args.view,
    });
  }

  if (name === "apply_canvas_changes") {
    requireScope(auth, "canvas:write");
    return convex.mutation((internal as any).mcp.applyCanvasChanges, {
      tokenId: auth.tokenId,
      workosOrgId: auth.workosOrgId,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      defaultCanvasId: auth.defaultCanvasId,
      dryRun: args.dryRun,
      expectedUpdatedAt: args.expectedUpdatedAt,
      operations: args.operations,
    });
  }

  if (name === "get_recent_activity") {
    requireScope(auth, "canvas:read");
    return convex.query((internal as any).mcp.getRecentActivity, {
      workosOrgId: auth.workosOrgId,
      canvasId: args.canvasId,
      canvasSlug: args.canvasSlug,
      defaultCanvasId: auth.defaultCanvasId,
      limit: args.limit,
      updatedSince: args.updatedSince,
    });
  }

  throw new Error(`Unknown tool: ${name}`);
}
