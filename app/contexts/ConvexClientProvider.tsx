/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern.
 * Relies on AuthKit for token lifecycle and Convex for reconnection/retry behavior.
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
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
  const userIdRef = useRef(userId);
  const accessTokenRef = useRef<string | null>(accessToken ?? null);
  const cachedTokenRef = useRef<string | null>(cachedAuth.userId === userId ? cachedAuth.token : null);
  const getAccessTokenRef = useRef(getAccessToken);
  const refreshRef = useRef(refresh);

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
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    accessTokenRef.current = accessToken ?? null;
  }, [accessToken]);

  useEffect(() => {
    cachedTokenRef.current = cachedTokenForCurrentUser;
  }, [cachedTokenForCurrentUser]);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

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
      const currentUserId = userIdRef.current;
      const liveToken = accessTokenRef.current;
      const cachedToken = cachedTokenRef.current;

      if (!currentUserId) {
        authDebug('ConvexAuth', 'fetchAccessToken:skip_no_user');
        return null;
      }

      authDebug('ConvexAuth', 'fetchAccessToken:start', { userId: currentUserId, forceRefreshToken });

      if (!forceRefreshToken) {
        if (liveToken) {
          authDebug('ConvexAuth', 'fetchAccessToken:return_live_token', { userId: currentUserId });
          return liveToken;
        }
        if (cachedToken) {
          authDebug('ConvexAuth', 'fetchAccessToken:return_cached_token', { userId: currentUserId });
          return cachedToken;
        }
      }

      if (forceRefreshToken) {
        const refreshFn = refreshRef.current;
        if (typeof refreshFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable', { userId: currentUserId });
        } else {
          try {
            const refreshed = await refreshFn();
            if (refreshed) {
              setCachedAuth((prev) =>
                prev.userId === currentUserId && prev.token === refreshed
                  ? prev
                  : { userId: currentUserId, token: refreshed }
              );
              authDebug('ConvexAuth', 'fetchAccessToken:refresh_success', { userId: currentUserId });
              return refreshed;
            }
            authDebug('ConvexAuth', 'fetchAccessToken:refresh_empty', { userId: currentUserId });
          } catch (error) {
            authDebug('ConvexAuth', 'fetchAccessToken:refresh_failed_attempt1', { userId: currentUserId });
            console.error('[ConvexAuth] Token refresh failed (attempt 1):', error);
            // One short retry handles transient network blips without dropping auth immediately.
            try {
              await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS));
              const retryRefreshFn = refreshRef.current;
              if (typeof retryRefreshFn !== 'function') {
                authDebug('ConvexAuth', 'fetchAccessToken:refresh_unavailable_attempt2', { userId: currentUserId });
              } else {
                const retried = await retryRefreshFn();
                if (retried) {
                  setCachedAuth((prev) =>
                    prev.userId === currentUserId && prev.token === retried
                      ? prev
                      : { userId: currentUserId, token: retried }
                  );
                  authDebug('ConvexAuth', 'fetchAccessToken:refresh_success_attempt2', { userId: currentUserId });
                  return retried;
                }
                authDebug('ConvexAuth', 'fetchAccessToken:refresh_empty_attempt2', { userId: currentUserId });
              }
            } catch (retryError) {
              authDebug('ConvexAuth', 'fetchAccessToken:refresh_failed_attempt2', { userId: currentUserId });
              console.error('[ConvexAuth] Token refresh failed (attempt 2):', retryError);
            }
          }
        }
      }

      const refreshedLiveToken = accessTokenRef.current;
      const refreshedCachedToken = cachedTokenRef.current;
      if (refreshedLiveToken || refreshedCachedToken) {
        const token = refreshedLiveToken ?? refreshedCachedToken;
        authDebug('ConvexAuth', 'fetchAccessToken:return_existing_token_after_refresh', {
          userId: currentUserId,
          hasLiveToken: !!refreshedLiveToken,
          hasCachedToken: !!refreshedCachedToken,
        });
        return token;
      }

      try {
        const getAccessTokenFn = getAccessTokenRef.current;
        const tokenFromStore =
          typeof getAccessTokenFn === 'function' ? await getAccessTokenFn() : null;
        if (typeof getAccessTokenFn !== 'function') {
          authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_unavailable', { userId: currentUserId });
        }
        if (tokenFromStore) {
          setCachedAuth((prev) =>
            prev.userId === currentUserId && prev.token === tokenFromStore
              ? prev
              : { userId: currentUserId, token: tokenFromStore }
          );
        }
        const token = tokenFromStore ?? accessTokenRef.current ?? cachedTokenRef.current ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_result', {
          userId: currentUserId,
          hasTokenFromStore: !!tokenFromStore,
          hasLiveToken: !!accessTokenRef.current,
          hasCachedToken: !!cachedTokenRef.current,
          returnedToken: !!token,
        });
        return token;
      } catch (error) {
        console.error('[ConvexAuth] Failed to get access token:', error);
        const token = accessTokenRef.current ?? cachedTokenRef.current ?? null;
        authDebug('ConvexAuth', 'fetchAccessToken:getAccessToken_failed', {
          userId: currentUserId,
          hasLiveToken: !!accessTokenRef.current,
          hasCachedToken: !!cachedTokenRef.current,
          returnedToken: !!token,
        });
        return token;
      }
    },
    [],
  );

  // Avoid auth-state flapping during background refresh if we already had a token.
  const hasCachedTokenForCurrentUser = !!cachedTokenForCurrentUser;
  const hasToken = !!accessToken || hasCachedTokenForCurrentUser;

  return useMemo(() => ({
    isLoading: authLoading || (tokenLoading && !hasToken),
    isAuthenticated: !!userId && hasToken,
    fetchAccessToken,
  }), [authLoading, fetchAccessToken, hasToken, tokenLoading, userId]);
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
