/**
 * Minimal WorkOS User Management API helpers for Convex actions/crons.
 *
 * Centralizes pagination and response parsing so cron/manual sync stay consistent.
 */

export interface WorkOSOrganization {
  id: string;
  name?: string;
}

export interface WorkOSOrgMembership {
  user_id: string;
  organization_id: string;
  role?: { slug: string };
}

async function fetchJson(apiKey: string, url: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status} - ${errorBody}`);
  }
  return response.json();
}

export async function listAllOrganizations(apiKey: string): Promise<WorkOSOrganization[]> {
  const allOrgs: WorkOSOrganization[] = [];
  let after: string | undefined;

  do {
    const url = new URL("https://api.workos.com/organizations");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const data = await fetchJson(apiKey, url.toString());
    allOrgs.push(...((data.data || []) as WorkOSOrganization[]));
    after = data.list_metadata?.after;
  } while (after);

  return allOrgs;
}

export async function listOrganizationMemberships(
  apiKey: string,
  organizationId: string
): Promise<WorkOSOrgMembership[]> {
  const memberships: WorkOSOrgMembership[] = [];
  let after: string | undefined;

  do {
    const url = new URL("https://api.workos.com/user_management/organization_memberships");
    url.searchParams.set("organization_id", organizationId);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const data = await fetchJson(apiKey, url.toString());
    memberships.push(...((data.data || []) as WorkOSOrgMembership[]));
    after = data.list_metadata?.after;
  } while (after);

  return memberships;
}

export async function fetchAllMembershipsGroupedByUser(
  apiKey: string,
  defaultRoleSlug: string
): Promise<{
  orgs: WorkOSOrganization[];
  orgNamesById: Map<string, string | undefined>;
  membershipsByUser: Map<string, Array<{ orgId: string; orgName?: string; role: string }>>;
}> {
  const orgs = await listAllOrganizations(apiKey);
  const orgNamesById = new Map(orgs.map((org) => [org.id, org.name] as const));

  const membershipsByUser = new Map<
    string,
    Array<{ orgId: string; orgName?: string; role: string }>
  >();

  for (const org of orgs) {
    const orgMemberships = await listOrganizationMemberships(apiKey, org.id);
    for (const m of orgMemberships) {
      if (!membershipsByUser.has(m.user_id)) {
        membershipsByUser.set(m.user_id, []);
      }
      membershipsByUser.get(m.user_id)!.push({
        orgId: m.organization_id,
        orgName: orgNamesById.get(m.organization_id),
        role: m.role?.slug || defaultRoleSlug,
      });
    }
  }

  return { orgs, orgNamesById, membershipsByUser };
}

