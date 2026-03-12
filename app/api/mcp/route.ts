import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/server/mcp/auth";
import { executeTool, MCP_TOOLS } from "@/server/mcp/tools";
import { JsonRpcRequest } from "@/server/mcp/types";

export const runtime = "nodejs";

const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;
const DEFAULT_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

function jsonRpcResult(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function jsonRpcError(id: string | number | null | undefined, code: number, message: string, data?: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } }, { status: 200 });
}

function withProtocolHeader(response: NextResponse, protocolVersion: string) {
  response.headers.set("MCP-Protocol-Version", protocolVersion);
  return response;
}

function notificationAccepted(protocolVersion: string) {
  const response = new NextResponse(null, { status: 202 });
  response.headers.set("MCP-Protocol-Version", protocolVersion);
  return response;
}

function negotiateProtocolVersion(request: JsonRpcRequest): string {
  const requested = request.params?.protocolVersion;
  if (typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number])) {
    return requested;
  }
  return DEFAULT_PROTOCOL_VERSION;
}

// We currently serve MCP over stateless POST only. Returning 405 for GET/DELETE
// remains streamable-HTTP compatible for clients that probe richer transports.
export async function GET() {
  return new NextResponse(null, { status: 405 });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}

export async function POST(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "MCP not configured" }, { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  const protocolVersion = negotiateProtocolVersion(body);

  // MCP lifecycle notifications are fire-and-forget; replying with JSON-RPC
  // errors here breaks clients during the post-initialize handshake.
  if (body.id === undefined && body.method.startsWith("notifications/")) {
    return notificationAccepted(protocolVersion);
  }

  try {
    const auth = await authenticateMcpRequest(request, convex);

    if (body.method === "initialize") {
      return withProtocolHeader(jsonRpcResult(body.id, {
        protocolVersion,
        serverInfo: { name: "agent-canvas-mcp", version: "1.0.0" },
        capabilities: { tools: { listChanged: false } },
      }), protocolVersion);
    }

    if (body.method === "tools/list") {
      return withProtocolHeader(jsonRpcResult(body.id, { tools: MCP_TOOLS }), protocolVersion);
    }

    if (body.method === "tools/call") {
      const params = body.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments as Record<string, unknown>) ?? {};
      const data = await executeTool(convex, auth, name, args);
      return withProtocolHeader(jsonRpcResult(body.id, {
        content: [{ type: "text", text: JSON.stringify(data) }],
        structuredContent: data,
        isError: false,
      }), protocolVersion);
    }

    return withProtocolHeader(jsonRpcError(body.id, -32601, `Method not found: ${body.method}`), protocolVersion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const toolName =
      body.method === "tools/call" && typeof body.params?.name === "string"
        ? body.params.name
        : undefined;
    console.error("MCP request failed", {
      method: body.method,
      toolName,
      error: message,
    });
    return withProtocolHeader(jsonRpcError(body.id, -32000, message), protocolVersion);
  }
}
