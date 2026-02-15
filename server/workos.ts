/**
 * WorkOS API helpers
 *
 * This module contains helper functions for interacting with the WorkOS API.
 * Authentication is handled by @workos-inc/authkit-nextjs SDK.
 * Member management is handled by @workos-inc/widgets.
 */

export interface WorkOSOrgMembership {
  organization_id: string;
  role?: {
    slug: string;
  };
}

/**
 * Fetch user's organization memberships
 */
export async function fetchUserOrgs(userId: string, apiKey: string): Promise<WorkOSOrgMembership[]> {
  const response = await fetch(
    `https://api.workos.com/user_management/organization_memberships?user_id=${userId}&limit=100`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[WorkOS] fetchUserOrgs failed for user ${userId}: ${response.status} - ${errorText}`);
    return [];
  }
  const data = await response.json();
  return data.data || [];
}
