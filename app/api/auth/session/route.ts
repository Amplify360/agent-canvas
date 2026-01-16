/**
 * GET /api/auth/session
 * Get current session info
 */

import { parseSession, json } from '@/server/session-utils';

export const runtime = 'edge';

export async function GET(request: Request) {
  const session = await parseSession(request);
  if (!session) {
    return json({ authenticated: false });
  }

  return json({
    authenticated: true,
    user: session.user,
    orgs: session.orgs || [],
    idToken: session.idToken, // Expose id_token for Convex authentication
  });
}
