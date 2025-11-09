import { NextResponse } from 'next/server';

export function middleware(request) {
  const basicAuth = request.headers.get('authorization');
  const url = request.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // Username can be anything, password must match
    if (pwd === 'alexthetpsoperatingsystem') {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// Apply middleware to all routes
export const config = {
  matcher: '/:path*',
};
