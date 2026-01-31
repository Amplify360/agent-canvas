/**
 * SessionStatusBanner - Displays connection/session status to the user
 */

'use client';

import React from 'react';
import { useSessionStatus } from '@/contexts/SessionContext';
import { useAuth } from '@/contexts/AuthContext';

export function SessionStatusBanner() {
  const { status } = useSessionStatus();
  const { signOut } = useAuth();

  if (status === 'ready') return null;

  const handleReload = () => {
    window.location.reload();
  };

  const handleReauth = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className={`session-banner session-banner--${status}`}>
      {status === 'refreshing' ? (
        <>
          <span className="session-banner__label">Reconnecting…</span>
          <span className="session-banner__hint">Your data will update shortly.</span>
        </>
      ) : (
        <>
          <span className="session-banner__label">Session expired</span>
          <span className="session-banner__hint">Please reload or sign in again.</span>
          <div className="session-banner__actions">
            <button className="btn btn--ghost" onClick={handleReload}>
              Reload
            </button>
            <button className="btn btn--primary" onClick={handleReauth}>
              Sign in
            </button>
          </div>
        </>
      )}
    </div>
  );
}
