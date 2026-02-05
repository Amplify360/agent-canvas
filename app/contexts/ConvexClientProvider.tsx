/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on Convex's built-in token refresh via authRefreshTokenLeewaySeconds.
 */

'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';

const REFRESH_COOLDOWN_MS = 2000;

function useAuthFromAuthKit() {
  const { user, loading: authLoading } = useAuthKit();
  const { loading: tokenLoading, getAccessToken, refresh } = useAccessToken();

  const getAccessTokenRef = useRef(getAccessToken);
  const refreshRef = useRef(refresh);
  getAccessTokenRef.current = getAccessToken;
  refreshRef.current = refresh;

  const lastRefreshTime = useRef(0);

  // Reset cooldown when tab becomes visible so the next Convex retry
  // gets a fresh token immediately instead of waiting out the cooldown.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastRefreshTime.current = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (forceRefreshToken) {
        const now = Date.now();
        if (now - lastRefreshTime.current < REFRESH_COOLDOWN_MS && lastRefreshTime.current > 0) {
          return null;
        }
        lastRefreshTime.current = now;
        try {
          return (await refreshRef.current()) ?? null;
        } catch (error) {
          console.error('[ConvexAuth] Token refresh failed:', error);
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

  return {
    isLoading: authLoading || tokenLoading,
    isAuthenticated: !!user,
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
