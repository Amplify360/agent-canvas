/**
 * Next.js middleware for WorkOS AuthKit authentication
 *
 * This middleware intercepts requests and handles authentication state.
 * It protects routes that require authentication and redirects to login when needed.
 */

import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

const unauthenticatedPaths = [
  '/login',
  '/api/auth/(.*)', // Auth endpoints
];

// E2E-only route that renders the app with in-memory mocks.
// Guarded by env var + `notFound()` in the page, but we also need middleware
// to avoid forcing a WorkOS redirect during Playwright runs.
if (process.env.E2E_TEST_MODE === '1') {
  // Uses Next.js matcher glob logic (same rules as WorkOS unauthenticatedPaths).
  unauthenticatedPaths.push('/e2e/:path*');
}

const workosMiddleware = authkitMiddleware({
  // Configure middleware options
  middlewareAuth: {
    // Enable middleware auth (uses cookies, no session endpoint needed)
    enabled: true,
    // Public paths that don't require authentication
    unauthenticatedPaths,
  },
  // Redirect URI for OAuth callback (also set via WORKOS_REDIRECT_URI env var)
  redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  // Pre-seed a short-lived workos-access-token cookie on every page load so the
  // client-side TokenStore can read the JWT synchronously instead of making an
  // async server action call. This eliminates the auth race condition where
  // Convex queries fire before the token is available on first load / signup.
  eagerAuth: true,
  // Debug mode for development (will log auth state)
  debug: process.env.NODE_ENV === 'development',
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // For Playwright E2E runs we render the app with mocks and do not want
  // to require WorkOS config or redirect to AuthKit.
  const { pathname } = request.nextUrl;
  const isE2EPath = pathname === '/e2e' || pathname.startsWith('/e2e/');
  if (process.env.E2E_TEST_MODE === '1' && isE2EPath) {
    return NextResponse.next();
  }

  return workosMiddleware(request, event);
}

export const config = {
  // Match all paths except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|txt|xml|json)$).*)',
  ],
};
