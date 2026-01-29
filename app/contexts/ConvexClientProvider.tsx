/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern
 * to properly handle token refresh on WebSocket reconnection.
 */

'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';

interface ConvexClientProviderProps {
  children: ReactNode;
}

// Cooldown to prevent rapid consecutive token refreshes that could cause infinite loops
const REFRESH_COOLDOWN_MS = 2000;

/**
 * Custom hook that adapts WorkOS AuthKit to Convex's useAuth interface.
 * This is passed to ConvexProviderWithAuth to handle token management.
 *
 * Key feature: Properly handles forceRefreshToken when Convex's WebSocket
 * reconnects after being idle, ensuring a fresh token is fetched.
 *
 * Important: Uses refs for token functions to keep fetchAccessToken stable
 * and prevent re-renders from triggering infinite refresh loops. Also includes
 * a cooldown to prevent rapid consecutive refresh calls.
 *
 * Critical: Tracks refresh-in-progress state to prevent queries from firing
 * with stale tokens during WebSocket reconnection.
 */
function useAuthForConvex() {
  const { user, loading: authLoading } = useAuthKit();
  const {
    accessToken,
    loading: tokenLoading,
    getAccessToken,
    refresh,
  } = useAccessToken();

  // Track whether a force refresh is in progress
  // This prevents queries from firing with stale tokens during reconnection
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use refs for token functions to keep fetchAccessToken stable
  const getAccessTokenRef = useRef(getAccessToken);
  const refreshRef = useRef(refresh);

  // Track last refresh to prevent rapid consecutive refreshes
  // This breaks the loop where refresh() -> state change -> force refresh request
  const lastRefreshTime = useRef<number>(0);

  // Keep refs up to date
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
    refreshRef.current = refresh;
  }, [getAccessToken, refresh]);

  // Log auth state changes to diagnose idle reconnection hangs
  const prevAuthState = useRef({ authLoading, tokenLoading, isRefreshing, hasUser: !!user, hasToken: !!accessToken });
  useEffect(() => {
    const prev = prevAuthState.current;
    const next = { authLoading, tokenLoading, isRefreshing, hasUser: !!user, hasToken: !!accessToken };
    const isLoading = authLoading || tokenLoading || isRefreshing;
    const isAuthenticated = !!user && !!accessToken;

    // Only log when something changed
    if (
      prev.authLoading !== next.authLoading ||
      prev.tokenLoading !== next.tokenLoading ||
      prev.isRefreshing !== next.isRefreshing ||
      prev.hasUser !== next.hasUser ||
      prev.hasToken !== next.hasToken
    ) {
      console.log('[ConvexAuth] State changed:', {
        authLoading, tokenLoading, isRefreshing,
        isLoading, isAuthenticated,
        hasUser: !!user, hasToken: !!accessToken,
      });
    }
    prevAuthState.current = next;
  }, [authLoading, tokenLoading, isRefreshing, user, accessToken]);

  // Stable callback that doesn't change on re-renders
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (forceRefreshToken) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime.current;

        // If we recently refreshed, return current token to break refresh loops
        // This handles the case where refresh() triggers state changes that
        // cause Convex to immediately request another refresh
        if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS && lastRefreshTime.current > 0) {
          console.log('[ConvexAuth] Force refresh requested but within cooldown (%dms ago), returning cached token', timeSinceLastRefresh);
          try {
            const token = await getAccessTokenRef.current();
            return token ?? null;
          } catch {
            return null;
          }
        }

        // Convex is requesting a fresh token (e.g., after WebSocket reconnect)
        // Set isRefreshing to signal that auth is loading, preventing queries
        // from firing with stale tokens
        console.log('[ConvexAuth] Force refresh started');
        lastRefreshTime.current = now;
        setIsRefreshing(true);

        // Watchdog: log if refresh() hasn't resolved after 5s
        const watchdog = setTimeout(() => {
          console.warn('[ConvexAuth] Force refresh still pending after 5s — refresh() may be hanging');
        }, 5000);

        try {
          const freshToken = await refreshRef.current();
          const elapsed = Date.now() - now;
          console.log('[ConvexAuth] Force refresh completed in %dms, got token: %s', elapsed, !!freshToken);
          return freshToken ?? null;
        } catch (error) {
          const elapsed = Date.now() - now;
          console.error('[ConvexAuth] Token refresh failed after %dms:', elapsed, error);
          return null;
        } finally {
          clearTimeout(watchdog);
          setIsRefreshing(false);
        }
      }

      // Normal token fetch (forceRefreshToken=false)
      try {
        const token = await getAccessTokenRef.current();
        console.log('[ConvexAuth] Token fetch (non-force), got token: %s', !!token);
        return token ?? null;
      } catch (error) {
        console.error('[ConvexAuth] getAccessToken failed:', error);
        return null;
      }
    },
    [] // Empty deps - callback is stable, uses refs for latest values
  );

  const isLoading = authLoading || tokenLoading || isRefreshing;
  const isAuthenticated = !!user && !!accessToken;

  return {
    // Include isRefreshing to prevent queries during reconnection token refresh
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    async function initClient() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          if (config.convexUrl) {
            const convexClient = new ConvexReactClient(config.convexUrl);
            setClient(convexClient);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Convex config:', error);
      }
    }

    initClient();
  }, []);

  // Wait for client to be initialized
  if (!client) {
    return <div>Loading Convex...</div>;
  }

  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
