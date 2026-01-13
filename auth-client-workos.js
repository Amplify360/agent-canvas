/**
 * WorkOS AuthKit + Convex client helper
 * Replaces Clerk authentication
 */

import { ConvexClient } from "convex/browser";

let convexClient = null;
let currentUser = null;
let currentOrgs = [];
let isInitialized = false;

/**
 * Initialize the Convex client
 * @param {string} convexUrl - The Convex deployment URL
 * @returns {ConvexClient}
 */
export function initConvex(convexUrl) {
  if (convexClient) {
    return convexClient;
  }
  convexClient = new ConvexClient(convexUrl);
  return convexClient;
}

/**
 * Get the Convex client instance
 * @returns {ConvexClient|null}
 */
export function getConvex() {
  return convexClient;
}

/**
 * Initialize authentication - check session and set up user
 * @returns {Promise<{authenticated: boolean, user: object|null}>}
 */
export async function initAuth() {
  if (isInitialized) {
    return { authenticated: !!currentUser, user: currentUser };
  }

  try {
    const response = await fetch("/api/auth/session");
    const data = await response.json();

    if (data.authenticated && data.user) {
      currentUser = data.user;
      currentOrgs = data.orgs || [];
      // Fetch additional org details if needed
      if (currentOrgs.length > 0 && !currentOrgs[0].name) {
        await fetchUserOrgs();
      }
    }

    isInitialized = true;
    return { authenticated: !!currentUser, user: currentUser };
  } catch (error) {
    console.error("Auth initialization error:", error);
    isInitialized = true;
    return { authenticated: false, user: null };
  }
}

/**
 * Fetch user's organizations from WorkOS
 */
async function fetchUserOrgs() {
  try {
    const response = await fetch("/api/auth/orgs");
    if (response.ok) {
      const data = await response.json();
      currentOrgs = data.organizations || [];
    }
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    currentOrgs = [];
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!currentUser;
}

/**
 * Get the current user
 * @returns {object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get the current user's ID
 * @returns {string|null}
 */
export function getUserId() {
  return currentUser?.id || null;
}

/**
 * Get the current user's email
 * @returns {string|null}
 */
export function getUserEmail() {
  return currentUser?.email || null;
}

/**
 * Get the current user's display name
 * @returns {string}
 */
export function getUserName() {
  if (!currentUser) return "";
  if (currentUser.firstName && currentUser.lastName) {
    return `${currentUser.firstName} ${currentUser.lastName}`;
  }
  if (currentUser.firstName) return currentUser.firstName;
  return currentUser.email || "";
}

/**
 * Get user's organizations
 * @returns {Array}
 */
export function getUserOrgs() {
  return currentOrgs;
}

/**
 * Initiate sign in via WorkOS
 * @param {object} options - Optional redirect options
 */
export async function signIn(options = {}) {
  try {
    const response = await fetch("/api/auth/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirectUri: options.redirectUri || window.location.origin + "/api/auth/callback",
      }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("Failed to get auth URL");
    }
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    currentUser = null;
    currentOrgs = [];
    isInitialized = false;
    window.location.href = "/login";
  } catch (error) {
    console.error("Sign out error:", error);
    // Force redirect even on error
    window.location.href = "/login";
  }
}

/**
 * Get auth token for API calls (if needed)
 * For Convex, authentication is handled via the session cookie
 * @returns {Promise<string|null>}
 */
export async function getAuthToken() {
  // With WorkOS + Convex, we use session cookies
  // This function is kept for compatibility but returns null
  return null;
}

/**
 * Check if user has access to an organization
 * @param {string} orgId - WorkOS organization ID
 * @returns {boolean}
 */
export function hasOrgAccess(orgId) {
  return currentOrgs.some((org) => org.id === orgId);
}

/**
 * Get the current/selected organization
 * @returns {object|null}
 */
export function getCurrentOrg() {
  // Return the first org or a stored preference
  const storedOrgId = localStorage.getItem("agentcanvas-current-org");
  if (storedOrgId) {
    const org = currentOrgs.find((o) => o.id === storedOrgId);
    if (org) return org;
  }
  return currentOrgs[0] || null;
}

/**
 * Set the current organization
 * @param {string} orgId - WorkOS organization ID
 */
export function setCurrentOrg(orgId) {
  localStorage.setItem("agentcanvas-current-org", orgId);
  // Dispatch event for UI updates
  window.dispatchEvent(
    new CustomEvent("orgChanged", { detail: { orgId } })
  );
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called when auth state changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const handler = () => callback({ user: currentUser, authenticated: !!currentUser });
  window.addEventListener("authStateChange", handler);
  return () => window.removeEventListener("authStateChange", handler);
}

// Emit auth state change
function emitAuthStateChange() {
  window.dispatchEvent(new CustomEvent("authStateChange"));
}
