import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * POST /auth/url
 * Generate WorkOS authorization URL for login
 */
http.route({
  path: "/auth/url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const workosClientId = process.env.WORKOS_CLIENT_ID;
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    if (!workosClientId) {
      return new Response(
        JSON.stringify({ error: "WorkOS not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build WorkOS authorization URL
    const params = new URLSearchParams({
      client_id: workosClientId,
      redirect_uri: `${baseUrl}/callback`,
      response_type: "code",
      provider: "authkit",
    });

    const authUrl = `https://api.workos.com/user_management/authorize?${params}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * GET /auth/callback
 * Handle WorkOS OAuth callback
 */
http.route({
  path: "/auth/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    if (error) {
      return Response.redirect(`${baseUrl}/login?error=${error}`, 302);
    }

    if (!code) {
      return Response.redirect(`${baseUrl}/login?error=missing_code`, 302);
    }

    try {
      // Exchange code for tokens using WorkOS API
      const workosApiKey = process.env.WORKOS_API_KEY;
      const workosClientId = process.env.WORKOS_CLIENT_ID;

      if (!workosApiKey || !workosClientId) {
        return Response.redirect(`${baseUrl}/login?error=config_error`, 302);
      }

      const tokenResponse = await fetch(
        "https://api.workos.com/user_management/authenticate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workosApiKey}`,
          },
          body: JSON.stringify({
            client_id: workosClientId,
            code,
            grant_type: "authorization_code",
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("WorkOS token exchange failed:", errorData);
        return Response.redirect(`${baseUrl}/login?error=auth_failed`, 302);
      }

      const tokenData = await tokenResponse.json();
      const { user, access_token, refresh_token } = tokenData;

      // Create session cookie with tokens
      const sessionData = {
        accessToken: access_token,
        refreshToken: refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          profilePictureUrl: user.profile_picture_url,
        },
      };

      // Encode session as base64 (in production, encrypt this)
      const sessionToken = btoa(JSON.stringify(sessionData));

      // Set cookie and redirect
      return new Response(null, {
        status: 302,
        headers: {
          Location: baseUrl,
          "Set-Cookie": `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,
        },
      });
    } catch (err) {
      console.error("Auth callback error:", err);
      return Response.redirect(`${baseUrl}/login?error=auth_failed`, 302);
    }
  }),
});

/**
 * POST /auth/logout
 * Clear session and redirect to login
 */
http.route({
  path: "/auth/logout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      },
    });
  }),
});

/**
 * GET /auth/session
 * Get current session info
 */
http.route({
  path: "/auth/session",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const cookie = request.headers.get("Cookie") || "";
    const sessionMatch = cookie.match(/session=([^;]+)/);

    if (!sessionMatch) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const sessionData = JSON.parse(atob(sessionMatch[1]));

      return new Response(
        JSON.stringify({
          authenticated: true,
          user: sessionData.user,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
