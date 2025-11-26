import { nanoid } from 'nanoid';
import { checkEmailAllowlist, getBaseUrl, getClientIP, normalizeEmail, validateEmail, validateRedirectUrl } from '../lib/auth-utils.js';
import { sendMagicLinkEmail } from '../lib/email.js';
import { checkRateLimit, storeMagicLink } from '../lib/storage.js';

const RATE_LIMIT_IP = { maxRequests: 10, windowSeconds: 15 * 60 }; // 10 requests per 15 minutes
const RATE_LIMIT_EMAIL = { maxRequests: 5, windowSeconds: 15 * 60 }; // 5 requests per 15 minutes
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export const config = {
  api: {
    bodyParser: true,
  },
};

const json = (res, status, payload) =>
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(payload));

export default async function handler(req, res) {
  // Wrap everything in try-catch to catch any initialization errors
  try {
    if (req.method !== 'POST') {
      return res.status(405).setHeader('Allow', 'POST').send('Method not allowed');
    }

    console.log('[AUTH] send-magic-link called', { 
      method: req.method,
      hasBody: !!req.body,
      bodyType: typeof req.body
    });
    
    // With bodyParser: true, Vercel automatically parses JSON into req.body
    const body = req.body || {};
    console.log('[AUTH] Body parsed:', { email: body?.email, hasRedirectUrl: !!body?.redirectUrl });
    const { email, redirectUrl } = body;

    // Rate limit by IP (skip in development mode)
    let ipRateLimit;
    const isDevMode = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    
    if (isDevMode && process.env.DISABLE_RATE_LIMIT === 'true') {
      console.log('[AUTH] Rate limiting disabled for development');
      ipRateLimit = { allowed: true };
    } else {
      try {
        const clientIP = getClientIP(req);
        ipRateLimit = await checkRateLimit(clientIP, RATE_LIMIT_IP);
      } catch (rateLimitError) {
        console.error('[AUTH] Rate limit check failed:', rateLimitError);
        // If rate limiting fails, allow the request (fail open for availability)
        ipRateLimit = { allowed: true };
      }
    }
    
    if (!ipRateLimit.allowed) {
      const retryAfter = ipRateLimit.resetAt - Math.floor(Date.now() / 1000);
      res.status(429)
        .setHeader('Retry-After', retryAfter.toString())
        .setHeader('X-RateLimit-Limit', RATE_LIMIT_IP.maxRequests.toString())
        .setHeader('X-RateLimit-Remaining', '0')
        .setHeader('X-RateLimit-Reset', ipRateLimit.resetAt.toString());
      return json(res, 429, {
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }

    // Validate email format
    if (!email || !validateEmail(email)) {
      return json(res, 400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Rate limit by email (skip in development mode)
    let emailRateLimit;
    
    if (isDevMode && process.env.DISABLE_RATE_LIMIT === 'true') {
      console.log('[AUTH] Email rate limiting disabled for development');
      emailRateLimit = { allowed: true };
    } else {
      try {
        emailRateLimit = await checkRateLimit(normalizedEmail, RATE_LIMIT_EMAIL);
      } catch (rateLimitError) {
        console.error('[AUTH] Email rate limit check failed:', rateLimitError);
        // If rate limiting fails, allow the request (fail open for availability)
        emailRateLimit = { allowed: true };
      }
    }
    
    if (!emailRateLimit.allowed) {
      const retryAfter = emailRateLimit.resetAt - Math.floor(Date.now() / 1000);
      res.status(429)
        .setHeader('Retry-After', retryAfter.toString())
        .setHeader('X-RateLimit-Limit', RATE_LIMIT_EMAIL.maxRequests.toString())
        .setHeader('X-RateLimit-Remaining', '0')
        .setHeader('X-RateLimit-Reset', emailRateLimit.resetAt.toString());
      return json(res, 429, {
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }

    // Check email allowlist (checks both env var and KV storage)
    let isAllowed = false;
    try {
      isAllowed = await checkEmailAllowlist(normalizedEmail);
    } catch (allowlistError) {
      console.error('[AUTH] Allowlist check failed:', allowlistError);
      // If allowlist check fails, deny access (fail closed for security)
      return json(res, 200, {
        success: true,
        message: 'If that email is registered, a magic link has been sent.'
      });
    }
    
    if (!isAllowed) {
      // Return generic success message (don't reveal if email exists)
      return json(res, 200, {
        success: true,
        message: 'If that email is registered, a magic link has been sent.'
      });
    }

    // Get base URL from environment or request headers
    const baseUrl = getBaseUrl(req);
    const validatedRedirect = validateRedirectUrl(redirectUrl, baseUrl);

    // Generate token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

    // Store token
    try {
      await storeMagicLink(token, {
        email: normalizedEmail,
        expiresAt,
        redirectUrl: validatedRedirect || null
      }, TOKEN_TTL_SECONDS);
    } catch (storageError) {
      console.error('[AUTH] Failed to store magic link token:', storageError);
      // If storage fails, we can't create a valid magic link, so return error
      return json(res, 500, {
        success: false,
        error: 'Failed to create magic link. Please try again.'
      });
    }

    // Construct magic link URL
    const magicLinkUrl = `${baseUrl}/api/auth/verify?token=${token}${validatedRedirect ? `&redirect=${encodeURIComponent(validatedRedirect)}` : ''}`;

    // Send email
    const emailResult = await sendMagicLinkEmail(normalizedEmail, magicLinkUrl);
    
    if (!emailResult.success) {
      // Log error with context for monitoring/alerting
      console.error('[AUTH] Failed to send magic link email:', {
        email: normalizedEmail,
        error: emailResult.error,
        details: emailResult.details,
        emailId: emailResult.emailId,
        timestamp: new Date().toISOString()
      });
      
      // If email is in allowlist but sending failed, this is a real problem
      // We still return success to user (security best practice - don't reveal email existence)
      // but log it for monitoring/alerting
      // In production, consider sending to error tracking service (e.g., Sentry)
    } else {
      console.log('[AUTH] Magic link email sent successfully:', {
        email: normalizedEmail,
        emailId: emailResult.emailId,
        timestamp: new Date().toISOString()
      });
    }

    // Return generic success message (same regardless of email allowlist status)
    return json(res, 200, {
      success: true,
      message: 'If that email is registered, a magic link has been sent.'
    });

  } catch (error) {
    console.error('[AUTH] Error in send-magic-link:', {
      error: error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
      toString: String(error)
    });
    
    // Make sure we always return JSON, even on error
    try {
      return json(res, 500, {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } catch (jsonError) {
      // If even JSON response fails, send plain text
      console.error('[AUTH] Failed to send JSON error response:', jsonError);
      return res.status(500)
        .setHeader('Content-Type', 'application/json')
        .send(JSON.stringify({ 
          success: false, 
          error: 'Internal server error' 
        }));
    }
  }
}

