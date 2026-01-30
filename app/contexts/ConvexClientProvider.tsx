/**
 * ConvexClientProvider - Initializes and provides Convex client with authentication
 *
 * Uses WorkOS AuthKit SDK for access tokens with ConvexProviderWithAuth pattern
 * to properly handle token refresh on WebSocket reconnection.
 */

'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode, type MutableRefObject } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { useAuth as useAuthKit, useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { SessionProvider, type SessionStatus } from '@/contexts/SessionContext';

interface ConvexClientProviderProps {
  children: ReactNode;
}

// Cooldown to prevent rapid consecutive token refreshes that could cause infinite loops
const REFRESH_COOLDOWN_MS = 2000;
const REFRESH_TIMEOUT_MS = 12000;
const REFRESH_LOCK_TTL_MS = 15000;
const REFRESH_LOCK_KEY = 'agentcanvas-auth-refresh-lock';
const REFRESH_CHANNEL_NAME = 'agentcanvas-auth';

interface RefreshLock {
  owner: string;
  expiresAt: number;
}

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
function useAuthForConvex({
  setSessionStatus,
  setLastAuthOkAt,
  channelRef,
  tabIdRef,
}: {
  setSessionStatus: (status: SessionStatus) => void;
  setLastAuthOkAt: (timestamp: number | null) => void;
  channelRef: MutableRefObject<BroadcastChannel | null>;
  tabIdRef: MutableRefObject<string>;
}) {
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

  const shouldDebug = (() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('debug-session') === '1';
    } catch {
      return false;
    }
  })();

  const logDebug = (...args: unknown[]) => {
    if (shouldDebug) {
      console.log('[Session]', ...args);
    }
  };

  const emitTelemetry = (type: string, detail?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('session-telemetry', { detail: { type, ...detail } }));
  };

  // Stable callback that doesn't change on re-renders
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      const isBrowser = typeof window !== 'undefined';

      const readLock = (): RefreshLock | null => {
        if (!isBrowser) return null;
        try {
          const raw = window.localStorage.getItem(REFRESH_LOCK_KEY);
          return raw ? (JSON.parse(raw) as RefreshLock) : null;
        } catch {
          return null;
        }
      };

      const writeLock = (lock: RefreshLock) => {
        if (!isBrowser) return;
        try {
          window.localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lock));
        } catch {
          // Ignore storage errors; fallback to in-tab refresh.
        }
      };

      const clearLock = () => {
        if (!isBrowser) return;
        try {
          const current = readLock();
          if (current?.owner === tabIdRef.current) {
            window.localStorage.removeItem(REFRESH_LOCK_KEY);
          }
        } catch {
          // Ignore storage errors.
        }
      };

      const tryAcquireLock = (): boolean => {
        if (!isBrowser) return true;
        const now = Date.now();
        const current = readLock();
        if (!current || current.expiresAt <= now) {
          writeLock({ owner: tabIdRef.current, expiresAt: now + REFRESH_LOCK_TTL_MS });
          return true;
        }
        return current.owner === tabIdRef.current;
      };

      const waitForRefreshComplete = async (): Promise<string | null> => {
        if (!isBrowser) return null;
        setSessionStatus('refreshing');

        return new Promise((resolve) => {
          let resolved = false;
          let handler: ((event: MessageEvent) => void) | null = null;
          const cleanup = () => {
            if (handler) {
              channelRef.current?.removeEventListener('message', handler);
            }
          };
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve(null);
            }
          }, REFRESH_TIMEOUT_MS);

          handler = async (event: MessageEvent) => {
            const data = event.data as { type?: string; ok?: boolean };
            if (data?.type === 'refresh-complete') {
              clearTimeout(timeout);
              if (!resolved) {
                resolved = true;
                try {
                  const token = await getAccessTokenRef.current();
                  cleanup();
                  resolve(token ?? null);
                } catch {
                  cleanup();
                  resolve(null);
                }
              }
            }
          };

          channelRef.current?.addEventListener('message', handler);
        });
      };

      if (forceRefreshToken) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime.current;

        // If we recently refreshed, return current token to break refresh loops
        // This handles the case where refresh() triggers state changes that
        // cause Convex to immediately request another refresh
        if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS && lastRefreshTime.current > 0) {
          logDebug('force-refresh cooldown', { timeSinceLastRefresh });
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
        logDebug('force-refresh start');
        lastRefreshTime.current = now;
        setIsRefreshing(true);
        setSessionStatus('refreshing');
        emitTelemetry('refresh-start', { tabId: tabIdRef.current });

        // Watchdog: mark expired if refresh() hasn't resolved after timeout
        const watchdog = setTimeout(() => {
          logDebug('force-refresh timeout');
          setSessionStatus('expired');
          emitTelemetry('refresh-timeout', { tabId: tabIdRef.current });
        }, REFRESH_TIMEOUT_MS);

        try {
          if (!tryAcquireLock()) {
            emitTelemetry('refresh-wait', { tabId: tabIdRef.current });
            const waitedToken = await waitForRefreshComplete();
            if (waitedToken) {
              setLastAuthOkAt(Date.now());
              setSessionStatus('ready');
              emitTelemetry('refresh-wait-success', { tabId: tabIdRef.current });
              return waitedToken;
            }
            // If waiting failed, try to acquire lock and refresh ourselves.
            if (!tryAcquireLock()) {
              return null;
            }
          }

          channelRef.current?.postMessage({ type: 'refresh-start' });
          const freshToken = await refreshRef.current();
          const elapsed = Date.now() - now;
          logDebug('force-refresh complete', { elapsed, ok: !!freshToken });
          setLastAuthOkAt(Date.now());
          setSessionStatus(freshToken ? 'ready' : 'expired');
          emitTelemetry('refresh-complete', { tabId: tabIdRef.current, ok: !!freshToken, elapsed });
          return freshToken ?? null;
        } catch (error) {
          const elapsed = Date.now() - now;
          console.error('[ConvexAuth] Token refresh failed after %dms:', elapsed, error);
          setSessionStatus('expired');
          emitTelemetry('refresh-failed', { tabId: tabIdRef.current, elapsed });
          return null;
        } finally {
          channelRef.current?.postMessage({ type: 'refresh-complete' });
          clearLock();
          clearTimeout(watchdog);
          setIsRefreshing(false);
        }
      }

      // Normal token fetch (forceRefreshToken=false)
      try {
        const token = await getAccessTokenRef.current();
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
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ready');
  const [lastAuthOkAt, setLastAuthOkAt] = useState<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(REFRESH_CHANNEL_NAME);
    }
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

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
    <SessionProvider value={{ status: sessionStatus, lastAuthOkAt }}>
      <ConvexProviderWithAuth
        client={client}
        useAuth={() =>
          useAuthForConvex({
            setSessionStatus,
            setLastAuthOkAt,
            channelRef,
            tabIdRef,
          })
        }
      >
        {children}
      </ConvexProviderWithAuth>
    </SessionProvider>
  );
}
