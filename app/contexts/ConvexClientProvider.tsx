/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on AuthKit for token lifecycle and Convex for reconnection/retry behavior.
 */

'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { authDebug } from '@/utils/authDebug';

const REFRESH_RETRY_DELAY_MS = 250;

function useAuthFromAuthKit() {
  const { user, loading: authLoading } = useAuthKit();
  const { loading: tokenLoading, getAccessToken, refresh, accessToken } = useAccessToken();
  const userId = user?.id ?? null;

  // Keep unstable AuthKit function references out of callback dependencies.
  const getAccessTokenRef = useRef(getAccessToken);
  const refreshRef = useRef(refresh);
  const accessTokenRef = useRef(accessToken);
  const lastKnownTokenRef = useRef<string | null>(accessToken ?? null);

  // Update refs during render so fetchAccessToken always sees the latest
  // AuthKit handlers (including during fast refresh / reconnect churn).
  getAccessTokenRef.current = getAccessToken;
  refreshRef.current = refresh;
  accessTokenRef.current = accessToken;
  if (accessToken) {
    lastKnownTokenRef.current = accessToken;
  }

  useEffect(() => {
    authDebug('ConvexAuth', 'state', {
      userId,
      authLoading,
      tokenLoading,
      hasLiveToken: !!accessToken,
      hasCachedToken: !!lastKnownTokenRef.current,
    });
  }, [accessToken, authLoading, tokenLoading, userId]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (!userId) {
        authDebug('ConvexAuth', 'fetchAccessToken:skip_no_user');
        return null;
      }

      authDebug('ConvexAuth', 'fetchAccessToken:start', { userId, forceRefreshToken });

      if (forceRefreshToken) {
        const refreshFn = refreshRef.current;
        if (typeof refreshFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable', { userId });
        } else {
          try {
            const refreshed = await refreshFn();
            if (refreshed) {
              authDebug('ConvexAuth', 'fetchAccessToken:refresh_success', { userId });
              return refreshed;
            }
            authDebug('ConvexAuth', 'fetchAccessToken:refresh_empty', { userId });
          } catch (error) {
            authDebug('ConvexAuth', 'fetchAccessToken:refresh_failed_attempt1', { userId });
            console.error('[ConvexAuth] Token refresh failed (attempt 1):', error);
            // One short retry handles transient network blips without dropping auth immediately.
            try {
              await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS));
              const retryRefreshFn = refreshRef.current;
              if (typeof retryRefreshFn !== 'function') {
                authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable_attempt2', { userId });
              } else {
                const retried = await retryRefreshFn();
                if (retried) {
                  authDebug('ConvexAuth', 'fetchAccessToken:refresh_success_attempt2', { userId });
                  return retried;
                }
                authDebug('ConvexAuth', 'fetchAccessToken:refresh_empty_attempt2', { userId });
              }
            } catch (retryError) {
              authDebug('ConvexAuth', 'fetchAccessToken:refresh_failed_attempt2', { userId });
              console.error('[ConvexAuth] Token refresh failed (attempt 2):', retryError);
            }
          }
        }
      }

      try {
        const getAccessTokenFn = getAccessTokenRef.current;
        const tokenFromStore =
          typeof getAccessTokenFn === 'function' ? await getAccessTokenFn() : null;
        if (typeof getAccessTokenFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_unavailable', { userId });
        }
        const token = tokenFromStore ?? accessTokenRef.current ?? lastKnownTokenRef.current ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_result', {
          userId,
          hasTokenFromStore: !!tokenFromStore,
          hasLiveToken: !!accessTokenRef.current,
          hasCachedToken: !!lastKnownTokenRef.current,
          returnedToken: !!token,
        });
        return token;
      } catch (error) {
        console.error('[ConvexAuth] Failed to get access token:', error);
        const token = accessTokenRef.current ?? lastKnownTokenRef.current ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_failed', {
          userId,
          hasLiveToken: !!accessTokenRef.current,
          hasCachedToken: !!lastKnownTokenRef.current,
          returnedToken: !!token,
        });
        return token;
      }
    },
    [userId],
  );

  // Avoid auth-state flapping during background refresh if we already had a token.
  const hasToken = !!accessToken || !!lastKnownTokenRef.current;

  return {
    isLoading: authLoading || (tokenLoading && !hasToken),
    isAuthenticated: !!userId && hasToken,
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
