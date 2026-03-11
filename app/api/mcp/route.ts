import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/server/mcp/auth";
import { executeTool, MCP_TOOLS } from "@/server/mcp/tools";
import { JsonRpcRequest } from "@/server/mcp/types";

export const runtime = "nodejs";

function jsonRpcResult(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function jsonRpcError(id: string | number | null | undefined, code: number, message: string, data?: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } }, { status: 200 });
}

export async function POST(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.CONVEX_MCP_ADMIN_KEY;
  if (!convexUrl || !adminKey) {
    return NextResponse.json({ error: "MCP not configured" }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  (convex as any).setAdminAuth(adminKey);

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  try {
    const auth = await authenticateMcpRequest(request, convex);

    if (body.method === "initialize") {
      return jsonRpcResult(body.id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "agent-canvas-mcp", version: "1.0.0" },
        capabilities: { tools: {} },
      });
    }

    if (body.method === "tools/list") {
      return jsonRpcResult(body.id, { tools: MCP_TOOLS });
    }

    if (body.method === "tools/call") {
      const params = body.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const data = await executeTool(convex, auth, name, args);
      return jsonRpcResult(body.id, { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data });
    }

    return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonRpcError(body.id, -32000, message);
  }
}
