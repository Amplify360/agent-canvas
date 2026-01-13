/**
 * GET /api/auth/orgs
 * Get user's organizations from session
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const cookie = request.headers.get('Cookie') || '';
  const sessionMatch = cookie.match(/session=([^;]+)/);

  if (!sessionMatch) {
    return new Response(JSON.stringify({ organizations: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sessionData = JSON.parse(atob(sessionMatch[1]));
    const orgs = sessionData.orgs || [];

    // If we have org IDs but need more details, fetch from WorkOS
    if (orgs.length > 0 && !orgs[0].name) {
      const workosApiKey = process.env.WORKOS_API_KEY;

      if (workosApiKey) {
        // Fetch organization details
        const enrichedOrgs = await Promise.all(
          orgs.map(async (org) => {
            try {
              const response = await fetch(
                `https://api.workos.com/organizations/${org.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${workosApiKey}`,
                  },
                }
              );
              if (response.ok) {
                const orgData = await response.json();
                return {
                  id: org.id,
                  name: orgData.name,
                  role: org.role,
                };
              }
            } catch (e) {
              console.error('Failed to fetch org details:', e);
            }
            return org;
          })
        );

        return new Response(
          JSON.stringify({ organizations: enrichedOrgs }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ organizations: orgs }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ organizations: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
