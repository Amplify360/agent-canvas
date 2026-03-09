/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on AuthKit for token lifecycle and Convex for reconnection/retry behavior.
 */

'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { authDebug } from '@/utils/authDebug';

// Short enough to avoid user-visible delay, long enough to smooth transient blips.
const REFRESH_RETRY_DELAY_MS = 250;

type CachedAuthState = {
  userId: string | null;
  token: string | null;
};

function useAuthFromAuthKit() {
  const { user, loading: authLoading } = useAuthKit();
  const { loading: tokenLoading, getAccessToken, refresh, accessToken } = useAccessToken();
  const userId = user?.id ?? null;
  const [cachedAuth, setCachedAuth] = useState<CachedAuthState>({
    userId,
    token: accessToken ?? null,
  });

  // Preserve the last good token for the current user while AuthKit refreshes in the background.
  useEffect(() => {
    setCachedAuth((prev) => {
      if (!userId) {
        return prev.userId === null && prev.token === null
          ? prev
          : { userId: null, token: null };
      }

      if (accessToken) {
        return prev.userId === userId && prev.token === accessToken
          ? prev
          : { userId, token: accessToken };
      }

      return prev.userId === userId
        ? prev
        : { userId, token: null };
    });
  }, [accessToken, userId]);

  const cachedTokenForCurrentUser =
    cachedAuth.userId === userId ? cachedAuth.token : null;

  useEffect(() => {
    authDebug('ConvexAuth', 'state', {
      userId,
      authLoading,
      tokenLoading,
      hasLiveToken: !!accessToken,
      hasCachedToken: !!cachedTokenForCurrentUser,
    });
  }, [accessToken, authLoading, cachedTokenForCurrentUser, tokenLoading, userId]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (!userId) {
        authDebug('ConvexAuth', 'fetchAccessToken:skip_no_user');
        return null;
      }

      authDebug('ConvexAuth', 'fetchAccessToken:start', { userId, forceRefreshToken });

      if (forceRefreshToken) {
        const refreshFn = refresh;
        if (typeof refreshFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable', { userId });
        } else {
          try {
            const refreshed = await refreshFn();
            if (refreshed) {
              setCachedAuth({ userId, token: refreshed });
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
              const retryRefreshFn = refresh;
              if (typeof retryRefreshFn !== 'function') {
                authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable_attempt2', { userId });
              } else {
                const retried = await retryRefreshFn();
                if (retried) {
                  setCachedAuth({ userId, token: retried });
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
        const getAccessTokenFn = getAccessToken;
        const tokenFromStore =
          typeof getAccessTokenFn === 'function' ? await getAccessTokenFn() : null;
        if (typeof getAccessTokenFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_unavailable', { userId });
        }
        if (tokenFromStore) {
          setCachedAuth((prev) =>
            prev.userId === userId && prev.token === tokenFromStore
              ? prev
              : { userId, token: tokenFromStore }
          );
        }
        const token = tokenFromStore ?? accessToken ?? cachedTokenForCurrentUser ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_result', {
          userId,
          hasTokenFromStore: !!tokenFromStore,
          hasLiveToken: !!accessToken,
          hasCachedToken: !!cachedTokenForCurrentUser,
          returnedToken: !!token,
        });
        return token;
      } catch (error) {
        console.error('[ConvexAuth] Failed to get access token:', error);
        const token = accessToken ?? cachedTokenForCurrentUser ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_failed', {
          userId,
          hasLiveToken: !!accessToken,
          hasCachedToken: !!cachedTokenForCurrentUser,
          returnedToken: !!token,
        });
        return token;
      }
    },
    [accessToken, cachedTokenForCurrentUser, getAccessToken, refresh, userId],
  );

  // Avoid auth-state flapping during background refresh if we already had a token.
  const hasCachedTokenForCurrentUser = !!cachedTokenForCurrentUser;
  const hasToken = !!accessToken || hasCachedTokenForCurrentUser;

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
