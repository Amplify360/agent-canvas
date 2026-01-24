/**
 * MembershipSync - Ensures org memberships are synced to Convex before rendering children
 *
 * This component calls the syncMyMemberships action on mount to ensure the user's
 * org memberships are in the Convex database before any queries that depend on them.
 *
 * This is a temporary solution until webhooks are configured for real-time sync.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAction } from '@/hooks/useConvex';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '../../convex/_generated/api';

interface MembershipSyncProps {
  children: React.ReactNode;
}

export function MembershipSync({ children }: MembershipSyncProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncMemberships = useAction(api.orgMemberships.syncMyMemberships);

  useEffect(() => {
    // Only sync if user is authenticated
    if (!isInitialized || !isAuthenticated) {
      // Not authenticated, no sync needed
      if (isInitialized) {
        setSyncComplete(true);
      }
      return;
    }

    // Sync memberships on mount
    let isMounted = true;

    async function doSync() {
      try {
        await syncMemberships({});
        if (isMounted) {
          setSyncComplete(true);
        }
      } catch (error) {
        console.error('Failed to sync memberships:', error);
        if (isMounted) {
          // Set error but still allow app to load - queries may fail but user can retry
          setSyncError(error instanceof Error ? error.message : 'Sync failed');
          setSyncComplete(true);
        }
      }
    }

    doSync();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isInitialized, syncMemberships]);

  // Show loading while syncing
  if (!syncComplete) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="loading-spinner" style={{ width: '32px', height: '32px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading your workspace...</p>
      </div>
    );
  }

  // Show error if sync failed (but still render children)
  if (syncError) {
    console.warn('Membership sync error (continuing anyway):', syncError);
  }

  return <>{children}</>;
}
