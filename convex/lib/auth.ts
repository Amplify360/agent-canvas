import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

/**
 * Auth context passed to Convex functions
 * Contains the authenticated user's WorkOS ID and org memberships
 */
export interface AuthContext {
  workosUserId: string;
  email: string;
  orgIds: string[];
  isSuperAdmin: boolean;
}

/**
 * Get the authenticated user from the context
 * Returns null if not authenticated
 */
export async function getAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // WorkOS sets these claims in the JWT
  return {
    workosUserId: identity.subject,
    email: (identity.email as string) || "",
    orgIds: (identity.orgIds as string[]) || [],
    isSuperAdmin: (identity.isSuperAdmin as boolean) || false,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  const auth = await getAuth(ctx);
  if (!auth) {
    throw new Error("Authentication required");
  }
  return auth;
}

/**
 * Require super admin role - throws if not super admin
 */
export async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  const auth = await requireAuth(ctx);
  if (!auth.isSuperAdmin) {
    throw new Error("Super admin access required");
  }
  return auth;
}

/**
 * Check if user has access to an organization
 */
export function hasOrgAccess(auth: AuthContext, workosOrgId: string): boolean {
  return auth.isSuperAdmin || auth.orgIds.includes(workosOrgId);
}

/**
 * Require access to an organization - throws if no access
 */
export function requireOrgAccess(
  auth: AuthContext,
  workosOrgId: string
): void {
  if (!hasOrgAccess(auth, workosOrgId)) {
    throw new Error("Organization access denied");
  }
}
