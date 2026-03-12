import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgAdmin } from "./lib/auth";

const MCP_SCOPES = [
  "canvas:read",
  "canvas:write",
  "canvas:comment",
  "canvas:export",
  "transformation:read",
  "transformation:write",
  "transformation:review",
] as const;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function assertScopes(scopes: string[]) {
  if (!scopes.length) throw new Error("Validation: At least one scope is required");
  for (const scope of scopes) {
    if (!MCP_SCOPES.includes(scope as (typeof MCP_SCOPES)[number])) {
      throw new Error(`Validation: Unsupported scope ${scope}`);
    }
  }
}

async function issueToken() {
  const prefixBytes = crypto.getRandomValues(new Uint8Array(6));
  const secretBytes = crypto.getRandomValues(new Uint8Array(24));
  const tokenPrefix = `mcp_${toBase64Url(prefixBytes)}`;
  const tokenSecret = toBase64Url(secretBytes);
  const token = `${tokenPrefix}.${tokenSecret}`;
  const tokenHash = await sha256(token);
  return { tokenPrefix, token, tokenHash };
}

export const listForOrg = query({
  args: {
    workosOrgId: v.string(),
    includeRevoked: v.optional(v.boolean()),
  },
  handler: async (ctx, { workosOrgId, includeRevoked }) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth, workosOrgId);

    const tokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_org", (q) => q.eq("workosOrgId", workosOrgId))
      .collect();

    return tokens
      .filter((token) => includeRevoked || !token.revokedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((token) => ({
        _id: token._id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        scopes: token.scopes,
        defaultCanvasId: token.defaultCanvasId,
        createdByUserId: token.createdByUserId,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        revokedAt: token.revokedAt,
      }));
  },
});

export const create = mutation({
  args: {
    workosOrgId: v.string(),
    name: v.string(),
    scopes: v.array(v.string()),
    defaultCanvasId: v.optional(v.id("canvases")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth, args.workosOrgId);
    assertScopes(args.scopes);

    if (args.defaultCanvasId) {
      const canvas = await ctx.db.get(args.defaultCanvasId);
      if (!canvas || canvas.deletedAt || canvas.workosOrgId !== args.workosOrgId) {
        throw new Error("Validation: defaultCanvasId must be in the current org");
      }
    }

    const { tokenPrefix, token, tokenHash } = await issueToken();
    const now = Date.now();
    const tokenId = await ctx.db.insert("mcpTokens", {
      name: args.name.trim(),
      tokenPrefix,
      tokenHash,
      workosOrgId: args.workosOrgId,
      scopes: args.scopes,
      defaultCanvasId: args.defaultCanvasId,
      createdByUserId: auth.workosUserId,
      createdAt: now,
      expiresAt: args.expiresAt,
    });

    return { tokenId, token, tokenPrefix };
  },
});

export const revoke = mutation({
  args: {
    tokenId: v.id("mcpTokens"),
  },
  handler: async (ctx, { tokenId }) => {
    const auth = await requireAuth(ctx);
    const token = await ctx.db.get(tokenId);
    if (!token) throw new Error("NotFound: Token not found");
    requireOrgAdmin(auth, token.workosOrgId);

    await ctx.db.patch(tokenId, { revokedAt: Date.now() });
  },
});

export const rotate = mutation({
  args: {
    tokenId: v.id("mcpTokens"),
    name: v.optional(v.string()),
    scopes: v.optional(v.array(v.string())),
    defaultCanvasId: v.optional(v.id("canvases")),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    const current = await ctx.db.get(args.tokenId);
    if (!current) throw new Error("NotFound: Token not found");
    requireOrgAdmin(auth, current.workosOrgId);

    const scopes = args.scopes ?? current.scopes;
    assertScopes(scopes);

    const defaultCanvasId = args.defaultCanvasId ?? current.defaultCanvasId;
    if (defaultCanvasId) {
      const canvas = await ctx.db.get(defaultCanvasId);
      if (!canvas || canvas.deletedAt || canvas.workosOrgId !== current.workosOrgId) {
        throw new Error("Validation: defaultCanvasId must be in the current org");
      }
    }

    const { tokenPrefix, token, tokenHash } = await issueToken();
    const now = Date.now();
    const tokenId = await ctx.db.insert("mcpTokens", {
      name: args.name ?? current.name,
      tokenPrefix,
      tokenHash,
      workosOrgId: current.workosOrgId,
      scopes,
      defaultCanvasId,
      createdByUserId: auth.workosUserId,
      createdAt: now,
      expiresAt: args.expiresAt ?? current.expiresAt,
    });

    await ctx.db.patch(args.tokenId, { revokedAt: now });

    return { tokenId, token, tokenPrefix };
  },
});
