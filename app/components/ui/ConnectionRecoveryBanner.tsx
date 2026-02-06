/**
 * ConnectionRecoveryBanner - Shows a recovery banner when Convex auth fails persistently
 *
 * Two triggers:
 * 1. useConvexAuth() stays unauthenticated for >5 seconds (gradual failure)
 * 2. AuthKit fires onSessionExpired via 'workos-session-expired' event (immediate)
 *
 * Auto-dismisses if auth recovers naturally.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConvexAuth } from '@/hooks/useConvex';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/ui/Icon';

const FAILURE_THRESHOLD_MS = 5000;

export function ConnectionRecoveryBanner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut, refreshAuth } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use ref for refreshAuth to avoid adding it to effect dependency arrays
  const refreshAuthRef = useRef(refreshAuth);
  refreshAuthRef.current = refreshAuth;

  // Attempt silent reauth; returns true if it succeeds
  const trySilentReauth = useCallback(async (): Promise<boolean> => {
    try {
      await refreshAuthRef.current();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Gradual failure: attempt silent reauth after 5s, show banner only if it fails
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated && !isLoading) {
      if (!timerRef.current) {
        timerRef.current = setTimeout(async () => {
          const recovered = await trySilentReauth();
          if (!recovered && !cancelled) {
            setShowBanner(true);
          }
        }, FAILURE_THRESHOLD_MS);
      }
    } else {
      // Auth recovered or still loading — clear timer and hide banner
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowBanner(false);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading, trySilentReauth]);

  // Immediate trigger: AuthKit detected session expiry — try silent reauth first
  useEffect(() => {
    const handleSessionExpired = async () => {
      const recovered = await trySilentReauth();
      if (!recovered) {
        setShowBanner(true);
      }
    };
    window.addEventListener('workos-session-expired', handleSessionExpired);
    return () => window.removeEventListener('workos-session-expired', handleSessionExpired);
  }, [trySilentReauth]);

  if (!showBanner) return null;

  return (
    <div className="connection-recovery-banner">
      <div className="connection-recovery-banner__content">
        <Icon name="wifi-off" className="connection-recovery-banner__icon" />
        <span className="connection-recovery-banner__message">
          Connection lost. Your session may have expired.
        </span>
        <div className="connection-recovery-banner__actions">
          <button
            className="connection-recovery-banner__btn connection-recovery-banner__btn--primary"
            onClick={() => window.location.reload()}
          >
            Reconnect
          </button>
          <button
            className="connection-recovery-banner__btn connection-recovery-banner__btn--secondary"
            onClick={() => signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
