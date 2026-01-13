/**
 * POST /api/auth/logout
 * Clear session and redirect to login
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  // Clear the session cookie
  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });

  return response;
}
