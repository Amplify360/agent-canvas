/**
 * GET /api/auth/session
 * Get current session info
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const cookie = request.headers.get('Cookie') || '';
  const sessionMatch = cookie.match(/session=([^;]+)/);

  if (!sessionMatch) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sessionData = JSON.parse(atob(sessionMatch[1]));

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: sessionData.user,
        orgs: sessionData.orgs || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
