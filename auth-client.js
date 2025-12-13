/**
 * Clerk authentication client helper
 * Handles Clerk initialization and token retrieval for API requests
 */

let clerkInstance = null;
let isInitialized = false;
let initPromise = null;

/**
 * Initialize Clerk and wait for it to be ready
 */
export async function initClerk() {
  if (isInitialized && clerkInstance) {
    return clerkInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Clerk) {
      reject(new Error('Clerk SDK not loaded. Make sure @clerk/clerk-js is included in the page.'));
      return;
    }

    const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || window.CLERK_PUBLISHABLE_KEY;
    if (!clerkPubKey) {
      reject(new Error('Clerk publishable key not found. Set VITE_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY.'));
      return;
    }

    window.Clerk.load({
      publishableKey: clerkPubKey,
    }).then(() => {
      clerkInstance = window.Clerk;
      isInitialized = true;
      resolve(clerkInstance);
    }).catch(reject);
  });

  return initPromise;
}

/**
 * Get Clerk instance (must be initialized first)
 */
export function getClerk() {
  if (!clerkInstance) {
    throw new Error('Clerk not initialized. Call initClerk() first.');
  }
  return clerkInstance;
}

/**
 * Get authentication token for API requests
 */
export async function getAuthToken() {
  await initClerk();
  const clerk = getClerk();
  
  if (!clerk.session) {
    return null;
  }

  try {
    const token = await clerk.session.getToken();
    return token;
  } catch (error) {
    console.error('Failed to get Clerk token:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    await initClerk();
    const clerk = getClerk();
    return clerk.user !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get current user ID
 */
export async function getUserId() {
  try {
    await initClerk();
    const clerk = getClerk();
    return clerk.user?.id || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get current organization ID
 */
export async function getOrgId() {
  try {
    await initClerk();
    const clerk = getClerk();
    return clerk.organization?.id || null;
  } catch (error) {
    return null;
  }
}

/**
 * Enhanced fetch wrapper that automatically adds Clerk JWT token
 */
export async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 by redirecting to login
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

