/**
 * GET /api/auth/callback
 * Handle WorkOS OAuth callback
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  if (error) {
    return Response.redirect(`${baseUrl}/login?error=${error}`, 302);
  }

  if (!code) {
    return Response.redirect(`${baseUrl}/login?error=missing_code`, 302);
  }

  try {
    const workosApiKey = process.env.WORKOS_API_KEY;
    const workosClientId = process.env.WORKOS_CLIENT_ID;

    if (!workosApiKey || !workosClientId) {
      return Response.redirect(`${baseUrl}/login?error=config_error`, 302);
    }

    // Exchange code for tokens using WorkOS API
    const tokenResponse = await fetch(
      'https://api.workos.com/user_management/authenticate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${workosApiKey}`,
        },
        body: JSON.stringify({
          client_id: workosClientId,
          code,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('WorkOS token exchange failed:', errorData);
      return Response.redirect(`${baseUrl}/login?error=auth_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    const { user, access_token, refresh_token } = tokenData;

    // Fetch user's organization memberships
    let orgs = [];
    try {
      const orgsResponse = await fetch(
        `https://api.workos.com/user_management/users/${user.id}/organization_memberships`,
        {
          headers: {
            Authorization: `Bearer ${workosApiKey}`,
          },
        }
      );
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        orgs = orgsData.data || [];
      }
    } catch (orgError) {
      console.error('Failed to fetch organizations:', orgError);
    }

    // Check if user is in any organization
    if (orgs.length === 0) {
      return Response.redirect(`${baseUrl}/login?error=no_organization`, 302);
    }

    // Create session data
    const sessionData = {
      accessToken: access_token,
      refreshToken: refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profilePictureUrl: user.profile_picture_url,
      },
      orgs: orgs.map(om => ({
        id: om.organization_id,
        role: om.role?.slug || 'member',
      })),
    };

    // Encode session as base64 (in production, use proper encryption)
    const sessionToken = btoa(JSON.stringify(sessionData));

    // Set cookie and redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: baseUrl,
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
      },
    });
  } catch (err) {
    console.error('Auth callback error:', err);
    return Response.redirect(`${baseUrl}/login?error=auth_failed`, 302);
  }
}
