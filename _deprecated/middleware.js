/**
 * Middleware for Clerk authentication
 * Note: Clerk handles authentication via its own middleware patterns
 * This middleware is kept minimal for UX redirects only
 * Actual auth enforcement happens in API routes via Clerk JWT verification
 */

export const config = {
  runtime: 'edge',
  // Exclude static files from middleware execution
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|css|js)$).*)',
  ],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow access to login page and auth endpoints without authentication
  if (pathname === '/login' || pathname === '/login.html' || pathname.startsWith('/api/auth/')) {
    return;
  }

  // For API routes, let them handle their own auth via Clerk JWT
  if (pathname.startsWith('/api/')) {
    return;
  }

  // For page routes, Clerk SDK handles redirects client-side
  // This middleware is kept for backward compatibility but doesn't enforce auth
  // Actual enforcement happens in API routes
  return;
}
