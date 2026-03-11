import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../convex/_generated/api";
import { McpScope } from "./types";

export interface AuthContext {
  tokenId: string;
  workosOrgId: string;
  scopes: string[];
  defaultCanvasId?: string;
  tokenName: string;
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey?.trim() || null;
}

export async function hashTokenForLookup(token: string): Promise<{ tokenPrefix: string; tokenHash: string }> {
  const [tokenPrefix] = token.split(".");
  if (!tokenPrefix) {
    throw new Error("Auth: Invalid service token format");
  }

  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const tokenHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { tokenPrefix, tokenHash };
}

export async function authenticateMcpRequest(request: Request, convex: ConvexHttpClient): Promise<AuthContext> {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new Error("Auth: Missing service token");
  }

  const { tokenPrefix, tokenHash } = await hashTokenForLookup(token);
  const auth = await convex.query((internal as any).mcp.authenticateToken, { tokenPrefix, tokenHash });
  if (!auth) {
    throw new Error("Auth: Invalid service token");
  }

  await convex.mutation((internal as any).mcp.touchLastUsed, { tokenId: auth._id, minIntervalMs: 60_000 });

  return {
    tokenId: auth._id,
    workosOrgId: auth.workosOrgId,
    scopes: auth.scopes,
    defaultCanvasId: auth.defaultCanvasId,
    tokenName: auth.name,
  };
}

export function requireScope(auth: AuthContext, scope: McpScope) {
  if (!auth.scopes.includes(scope)) {
    throw new Error(`Auth: Missing required scope ${scope}`);
  }
}
