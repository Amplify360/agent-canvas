export const config = {
  runtime: 'edge',
};

export default function middleware(request) {
  const basicAuth = request.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];

    try {
      const [user, pwd] = atob(authValue).split(':');

      // Username can be anything, password must match
      if (pwd === 'alexthetpsoperatingsystem') {
        // Authentication successful, continue to the original request
        return;
      }
    } catch (e) {
      // Invalid base64 or malformed header
    }
  }

  // Authentication failed or not provided
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
