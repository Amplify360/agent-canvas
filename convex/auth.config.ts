/**
 * Convex authentication configuration for WorkOS and custom JWTs
 */

// WorkOS Client ID (public, safe to hardcode) - Production
const clientId = "client_01KEZ54DWP5SNBAFC1DE08FMF9";

// Static JWKS embedded as data URI (public key for verifying custom JWTs)
// This matches the JWT_PRIVATE_KEY used to sign tokens in the app
const staticJwksDataUri = "data:application/json;base64,ewogICJrZXlzIjogWwogICAgewogICAgICAia3R5IjogIlJTQSIsCiAgICAgICJuIjogInd6R2pvR0JGcmdzOVk5RnFreEFTYXdQcUtvZkp4cFFKNFV5TThWVHBDN2p1emR2WFdYR083M3FFSWxkZU1pTE40S3RTVzBSdk5nb0g1NnhKbk12OG5tLXBsaFM5b0E4TWN2Y043RmppNkpab1VfWlZPQlZydzlYY2V0LVM5WEFlRkpMeWNPNHBZQkJKOTZ3alZ4WDRVLXZBRWFWY242SlBZS1hGamVWejZ5MTF1eDkxUVA4UXNiM2Y0bE4ydWt3eXZPamV3Q0NHZTQwWHVMYms3NGZqVWRfTHFQTzNFYUJ1a2J5SUVtV2pQTzJNdFlHLUFpMEROeW1faVJVMC1WYnZHaFc2YmlyVXA2SGViek0xYWNXZUpRMjJEd2I2T2RkajVVWmFxeGsyOW82Tk9QMzJqZ0VpRWs1Y2NmWjJtbUh4QUZwMmVrbjIyWVpvd2ZuVktNYWR6dyIsCiAgICAgICJlIjogIkFRQUIiLAogICAgICAia2lkIjogImFnZW50Y2FudmFzLXN0YXRpYy0xIiwKICAgICAgInVzZSI6ICJzaWciLAogICAgICAiYWxnIjogIlJTMjU2IgogICAgfQogIF0KfQo=";

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
