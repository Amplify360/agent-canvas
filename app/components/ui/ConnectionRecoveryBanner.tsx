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
import { authDebug } from '@/utils/authDebug';

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
      authDebug('ConnectionRecoveryBanner', 'silent_reauth_start');
      await refreshAuthRef.current();
      authDebug('ConnectionRecoveryBanner', 'silent_reauth_success');
      return true;
    } catch {
      authDebug('ConnectionRecoveryBanner', 'silent_reauth_failed');
      return false;
    }
  }, []);

  // Gradual failure: attempt silent reauth after 5s, show banner only if it fails
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated && !isLoading) {
      authDebug('ConnectionRecoveryBanner', 'auth_unavailable_start_timer');
      if (!timerRef.current) {
        timerRef.current = setTimeout(async () => {
          const recovered = await trySilentReauth();
          if (!recovered && !cancelled) {
            authDebug('ConnectionRecoveryBanner', 'show_banner_after_threshold');
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
      authDebug('ConnectionRecoveryBanner', 'auth_recovered_hide_banner');
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
      authDebug('ConnectionRecoveryBanner', 'session_expired_event');
      const recovered = await trySilentReauth();
      if (!recovered) {
        authDebug('ConnectionRecoveryBanner', 'show_banner_after_session_expired');
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
