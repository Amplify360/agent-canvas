/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on AuthKit for token lifecycle and Convex for reconnection/retry behavior.
 */

'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';

function useAuthFromAuthKit() {
  const { user, loading: authLoading } = useAuthKit();
  const { loading: tokenLoading, getAccessToken, refresh, accessToken } = useAccessToken();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (!user) {
        return null;
      }

      try {
        if (forceRefreshToken) {
          return (await refresh()) ?? null;
        }

        return (await getAccessToken()) ?? null;
      } catch (error) {
        console.error('[ConvexAuth] Failed to get access token:', error);
        return null;
      }
    },
    [getAccessToken, refresh, user],
  );

  // Avoid auth-state flapping during background token refresh when we already have a token.
  const hasToken = !!accessToken;

  return {
    isLoading: authLoading || (tokenLoading && !hasToken),
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
