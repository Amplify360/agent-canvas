/**
 * Authentication utility functions
 */

/**
 * Normalize email address (lowercase and trim)
 * @param {string} email - Email address
 * @returns {string} Normalized email
 */
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

/**
 * Check if email is in allowlist (checks both env var and KV storage)
 * @param {string} email - Email address
 * @returns {Promise<boolean>} True if allowed
 */
export async function checkEmailAllowlist(email) {
  const normalized = normalizeEmail(email);
  
  // Check environment variable allowlist (for admins/initial setup)
  const allowedEmails = process.env.ALLOWED_EMAILS;
  if (allowedEmails) {
    const allowedList = allowedEmails.split(',').map(e => normalizeEmail(e.trim()));
    if (allowedList.includes(normalized)) {
      return true;
    }
  }
  
  // Check KV storage allowlist (for user-managed list)
  try {
    const { isInAllowlist } = await import('./storage.js');
    return await isInAllowlist(normalized);
  } catch (error) {
    console.error('Error checking KV allowlist:', error);
    // If KV check fails, fall back to env var only
    return false;
  }
}

/**
 * Synchronous version for backward compatibility (checks env var only)
 * @param {string} email - Email address
 * @returns {boolean} True if allowed (env var only)
 */
export function checkEmailAllowlistSync(email) {
  const allowedEmails = process.env.ALLOWED_EMAILS;
  if (!allowedEmails) {
    return false;
  }
  
  const normalized = normalizeEmail(email);
  const allowedList = allowedEmails.split(',').map(e => normalizeEmail(e.trim()));
  
  return allowedList.includes(normalized);
}

/**
 * Validate redirect URL to prevent open redirect attacks
 * @param {string|null|undefined} redirectUrl - Redirect URL
 * @param {string} baseUrl - Base URL of the application
 * @returns {string|null} Validated redirect URL or null
 */
export function validateRedirectUrl(redirectUrl, baseUrl) {
  if (!redirectUrl) {
    return null;
  }

  // Allow relative paths (but not protocol-relative)
  if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
    return redirectUrl;
  }

  // For full URLs, verify same origin
  try {
    const url = new URL(redirectUrl, baseUrl);
    const base = new URL(baseUrl);

    if (url.protocol === base.protocol &&
        url.hostname === base.hostname &&
        url.port === base.port) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Get client IP address from request
 * Handles X-Forwarded-For and X-Real-IP headers
 * @param {Request|Object} request - Request object
 * @returns {string} IP address
 */
export function getClientIP(request) {
  const headers = request.headers || {};
  
  // Helper to get header value
  const getHeader = (name) => {
    if (headers.get) {
      // Edge runtime
      return headers.get(name) || headers.get(name.toLowerCase());
    }
    // Node.js runtime
    return headers[name] || headers[name.toLowerCase()];
  };
  
  // Check X-Forwarded-For (first IP is the original client)
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0) {
      return ips[0];
    }
  }
  
  // Check X-Real-IP
  const realIP = getHeader('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback (for local development)
  return '127.0.0.1';
}

/**
 * Get query parameter from request
 * Works with both Node.js and Edge runtime request objects
 * @param {Request|Object} req - Request object
 * @param {string} key - Query parameter key
 * @returns {string|null} Query parameter value or null
 */
export function getQueryParam(req, key) {
  // Check if query params are already parsed (Node.js runtime)
  if (req.query && req.query[key] !== undefined) {
    return req.query[key];
  }
  
  // Parse from URL (works for both runtimes)
  if (req.url) {
    try {
      // For Edge runtime, req.url is a full URL
      // For Node.js runtime, we may need to construct the full URL
      const url = req.url.startsWith('http') 
        ? new URL(req.url)
        : new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      return url.searchParams.get(key);
    } catch {
      // Ignore parse errors
    }
  }
  
  return null;
}

/**
 * Get base URL from environment variable or construct from request
 * @param {Request|Object} req - Request object
 * @returns {string} Base URL (e.g., https://canvas.amplify360.ai or http://localhost:3000)
 */
export function getBaseUrl(req) {
  // First, check environment variable
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.trim();
  }
  
  // Try to construct from request headers
  const headers = req.headers || {};
  
  // Helper to get header value
  const getHeader = (name) => {
    if (headers.get) {
      // Edge runtime
      return headers.get(name) || headers.get(name.toLowerCase());
    }
    // Node.js runtime
    return headers[name] || headers[name.toLowerCase()];
  };
  
  // Get host from headers
  const host = getHeader('host') || getHeader('x-forwarded-host');
  
  if (host) {
    // Check if request is secure (HTTPS)
    // In Vercel/production, X-Forwarded-Proto will be 'https'
    const proto = getHeader('x-forwarded-proto');
    const isVercel = !!process.env.VERCEL;
    
    // Use https if:
    // 1. x-forwarded-proto is explicitly 'https', OR
    // 2. We're in Vercel production (always uses HTTPS)
    const protocol = proto === 'https' || (isVercel && proto !== 'http') ? 'https' : 'http';
    
    const baseUrl = `${protocol}://${host}`;
    
    // Log for debugging (only in production to verify it's working)
    if (isVercel) {
      console.log('[BASE_URL] Constructed from headers:', {
        host,
        proto,
        protocol,
        baseUrl,
        hasBaseUrlEnv: !!process.env.BASE_URL
      });
    }
    
    return baseUrl;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3000';
}

