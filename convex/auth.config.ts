/**
 * Convex authentication configuration for WorkOS and custom JWTs
 */

// WorkOS Client ID (public, safe to hardcode) - Production
const clientId = "client_01KEZ54DWP5SNBAFC1DE08FMF9";

// Static JWKS embedded as data URI (public key for verifying custom JWTs)
// This matches the JWT_PRIVATE_KEY used to sign tokens in the app
const staticJwksDataUri = "data:application/json;base64,eyJrZXlzIjpbeyJrdHkiOiJSU0EiLCJuIjoiN2dOc1ZiWnJXWW0yNng5ZlF1MDFTOV9QQ1ZJcTYwQllrZ2dHWklDU3FNekZualktbF9EQ2V4UjBYX1BUejBwR2NEUmw0anVLMmoyRW5hRWpkS1YtX3ZJeURoeG5HTnJDblVHVUFOQ1Z5YzhXN0pUNTdvN05UN2NUeGl3Z21aS3ZxNFlMNGtkZzdJTndHaVhYRDNtWFA5WmJ5Y1ZYU2k1ajBZNl9STXpteURkXzl6MzdNcXcyd0p6UUVIczJXc1ROWWhCYno5NDhqUi1FT25yRnAxVWw0cm5wcF9hLUR4MmtOYW41TzlYNGJ0YkhpcHI0RzBMWjByeDZ5UjE0T0NJVkJrczF6eno3MWVibDluSkp2R0g2eG1HcFZVTTN5SjcyVGFKOE9jNGp1eGk4WW4yS3NoVDRnREU1WU9XQlZQYk45VDJwZ0JNQ1UyakpaNWphZXNQNWN3IiwiZSI6IkFRQUIiLCJraWQiOiJhZ2VudGNhbnZhcy1zdGF0aWMtMSIsInVzZSI6InNpZyIsImFsZyI6IlJTMjU2In1dfQo=";

export default {
  providers: [
    // WorkOS SSO provider
    {
      type: "customJwt" as const,
      issuer: "https://api.workos.com/",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      algorithm: "RS256" as const,
    },
    // WorkOS User Management provider
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/user_management/${clientId}`,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      algorithm: "RS256" as const,
    },
    // Custom JWT provider for local development (http://localhost:3000)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3000",
      applicationID: "convex",
      jwks: staticJwksDataUri,
      algorithm: "RS256" as const,
    },
    // Custom JWT provider for production - Vercel default
    {
      type: "customJwt" as const,
      issuer: "https://agent-canvas.vercel.app",
      applicationID: "convex",
      jwks: staticJwksDataUri,
      algorithm: "RS256" as const,
    },
    // Custom JWT provider for production - custom domain
    {
      type: "customJwt" as const,
      issuer: "https://canvas.amplify360.ai",
      applicationID: "convex",
      jwks: staticJwksDataUri,
      algorithm: "RS256" as const,
    },
  ],
};
