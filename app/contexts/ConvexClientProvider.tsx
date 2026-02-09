/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on Convex's built-in token refresh via authRefreshTokenLeewaySeconds.
 */

'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { useTabResume } from '@/hooks/useTabResume';

const REFRESH_COOLDOWN_MS = 2000;

function useAuthFromAuthKit() {
  const { user, loading: authLoading } = useAuthKit();
  const { loading: tokenLoading, getAccessToken, refresh, accessToken } = useAccessToken();

  const getAccessTokenRef = useRef(getAccessToken);
  const refreshRef = useRef(refresh);
  getAccessTokenRef.current = getAccessToken;
  refreshRef.current = refresh;

  const lastRefreshTime = useRef(0);
  const lastRefreshFailed = useRef(false);

  // Reset cooldown when tab becomes active so the next Convex retry
  // calls refresh() immediately instead of returning stale cached token.
  useTabResume(() => {
    lastRefreshTime.current = 0;
    lastRefreshFailed.current = false;
  });

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (forceRefreshToken) {
        const now = Date.now();
        // Skip cooldown if the last refresh failed — allow immediate retry
        const shouldCooldown = !lastRefreshFailed.current
          && lastRefreshTime.current > 0
          && now - lastRefreshTime.current < REFRESH_COOLDOWN_MS;
        if (shouldCooldown) {
          return (await getAccessTokenRef.current()) ?? null;
        }
        lastRefreshTime.current = now;
        lastRefreshFailed.current = false;
        try {
          return (await refreshRef.current()) ?? null;
        } catch (error) {
          console.error('[ConvexAuth] Token refresh failed:', error);
          lastRefreshFailed.current = true;
          return null;
        }
      }
      try {
        return (await getAccessTokenRef.current()) ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  // Only report authenticated when we actually have a token available.
  // Previously we used `!!user` which could be true before the token was
  // fetched, causing Convex to fire queries with no JWT attached.
  const hasToken = !!accessToken;

  return {
    isLoading: authLoading || tokenLoading,
    isAuthenticated: !!user && hasToken,
    fetchAccessToken,
  };
}

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const [client] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, { authRefreshTokenLeewaySeconds: 30 }),
  );

  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromAuthKit}>
      {children}
    </ConvexProviderWithAuth>
  );
}
