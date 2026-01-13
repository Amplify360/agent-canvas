/**
 * POST /api/auth/url
 * Generate WorkOS authorization URL for login
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workosClientId = process.env.WORKOS_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  if (!workosClientId) {
    return new Response(
      JSON.stringify({ error: 'WorkOS not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build WorkOS authorization URL
  const params = new URLSearchParams({
    client_id: workosClientId,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    response_type: 'code',
    provider: 'authkit',
  });

  const authUrl = `https://api.workos.com/user_management/authorize?${params}`;

  return new Response(JSON.stringify({ url: authUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
