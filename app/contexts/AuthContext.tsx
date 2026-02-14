/**
 * AuthContext - Manages user authentication and organization state
 *
 * Uses WorkOS AuthKit SDK for session management and Convex subscriptions
 * for real-time org membership data.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth as useAuthKit } from '@workos-inc/authkit-nextjs/components';
import { User, Organization } from '@/types/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ORG_ROLES } from '@/types/validationConstants';
import { useAction, useCanQuery } from '@/hooks/useConvex';
import { useStableQuery } from '@/hooks/useStableQuery';
import { api } from '../../convex/_generated/api';

interface AuthContextValue {
  user: User | null;
  userOrgs: Organization[];
  currentOrgId: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  setCurrentOrgId: (orgId: string) => void;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use WorkOS AuthKit SDK for user session
  const authKit = useAuthKit();
  const authKitUser = authKit.user;
  const isLoading = authKit.loading;
  const { canQuery, isConvexAuthLoading } = useCanQuery();

  const [currentOrgId, setCurrentOrgIdState] = useLocalStorage<string | null>(STORAGE_KEYS.CURRENT_ORG, null);
  const [isInitialized, setIsInitialized] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);
  const bootstrapSyncForUserRef = useRef<string | null>(null);
  const syncMyMemberships = useAction(api.orgMemberships.syncMyMemberships);

  // Clear persisted selections when user changes (prevents cross-user leakage)
  useEffect(() => {
    const currentId = authKitUser?.id ?? null;
    if (currentId !== prevUserIdRef.current) {
      setIsInitialized(false);
    }
    if (prevUserIdRef.current !== null && currentId !== prevUserIdRef.current) {
      // User changed — clear org and canvas selections
      window.localStorage.removeItem(STORAGE_KEYS.CURRENT_ORG);
      window.localStorage.removeItem(STORAGE_KEYS.CURRENT_CANVAS);
      setCurrentOrgIdState(null);
    }
    prevUserIdRef.current = currentId;
  }, [authKitUser?.id, setCurrentOrgIdState]);

  // Transform AuthKit user to our User type (memoized to avoid new object on every render)
  const user = useMemo<User | null>(() => authKitUser ? {
    id: authKitUser.id,
    email: authKitUser.email || '',
    firstName: authKitUser.firstName || undefined,
    lastName: authKitUser.lastName || undefined,
    profilePictureUrl: authKitUser.profilePictureUrl || undefined,
  } : null, [authKitUser]);

  // Subscribe to org memberships from Convex (source of truth).
  const { data: memberships = [], hasLoaded: hasLoadedMemberships } = useStableQuery(
    api.orgMemberships.listMyMemberships,
    canQuery ? {} : 'skip',
    authKitUser?.id,
  );

  const userOrgs = useMemo<Organization[]>(
    () =>
      memberships.map((membership) => ({
        id: membership.orgId,
        name: membership.orgName || membership.orgId,
        role: membership.role,
      })),
    [memberships],
  );

  // Run one reconciliation sync per authenticated user session.
  // This catches missed/partial webhook syncs without polling on tab focus.
  useEffect(() => {
    if (!authKitUser) return;
    if (!canQuery || isConvexAuthLoading || !hasLoadedMemberships) return;
    if (bootstrapSyncForUserRef.current === authKitUser.id) return;

    bootstrapSyncForUserRef.current = authKitUser.id;
    syncMyMemberships({})
      .catch((error) => {
        console.error('Initial membership bootstrap sync failed:', error);
        // Allow retry on subsequent renders after transient failures.
        bootstrapSyncForUserRef.current = null;
      });
  }, [authKitUser, canQuery, hasLoadedMemberships, isConvexAuthLoading, syncMyMemberships]);

  // Initialize when auth and org subscriptions are ready.
  useEffect(() => {
    if (isLoading) return;

    if (!authKitUser) {
      setIsInitialized(true);
      return;
    }

    if (isConvexAuthLoading) return;

    if (!canQuery || hasLoadedMemberships) {
      setIsInitialized(true);
    }
  }, [authKitUser, canQuery, hasLoadedMemberships, isConvexAuthLoading, isLoading]);

  // Keep selected org valid as memberships change.
  useEffect(() => {
    if (!authKitUser) return;
    if (!hasLoadedMemberships) return;

    if (!currentOrgId && userOrgs.length > 0) {
      setCurrentOrgIdState(userOrgs[0].id);
      return;
    }

    if (currentOrgId && !userOrgs.some((org) => org.id === currentOrgId)) {
      setCurrentOrgIdState(userOrgs.length > 0 ? userOrgs[0].id : null);
    }
  }, [authKitUser, currentOrgId, hasLoadedMemberships, setCurrentOrgIdState, userOrgs]);

  const setCurrentOrgId = useCallback((orgId: string) => {
    setCurrentOrgIdState(orgId);
    // Dispatch custom event for cross-component communication
    window.dispatchEvent(new CustomEvent('orgChanged', { detail: { orgId } }));
  }, [setCurrentOrgIdState]);

  const signOut = useCallback(async () => {
    try {
      setCurrentOrgIdState(null);
      // Clear canvas selection to prevent next user inheriting it
      window.localStorage.removeItem(STORAGE_KEYS.CURRENT_CANVAS);

      // Use AuthKit's signOut which handles the full WorkOS session clear
      await authKit.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: redirect to login
      window.location.href = '/login';
    }
  }, [authKit, setCurrentOrgIdState]);

  const refreshAuth = useCallback(async () => {
    // AuthKit returns { error } on failure instead of throwing in some cases.
    const result = await authKit.refreshAuth();
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw new Error(result.error);
    }
  }, [authKit]);

  const isAuthenticated = !!user;

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userOrgs,
    currentOrgId,
    isInitialized,
    isAuthenticated,
    setCurrentOrgId,
    signOut,
    refreshAuth,
  }), [
    user, userOrgs, currentOrgId, isInitialized, isAuthenticated,
    setCurrentOrgId, signOut, refreshAuth,
  ]);

  return (
    <AuthContext.Provider value={value}>
      <div data-auth-provider style={{ display: 'contents' }}>{children}</div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hooks
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

export function useCurrentOrg() {
  const { userOrgs, currentOrgId } = useAuth();
  if (!currentOrgId) return userOrgs[0] || null;
  return userOrgs.find(org => org.id === currentOrgId) || userOrgs[0] || null;
}

/**
 * Check if current user is admin of the current org
 */
export function useIsOrgAdmin() {
  const { userOrgs, currentOrgId } = useAuth();
  if (!currentOrgId) return false;
  const org = userOrgs.find(org => org.id === currentOrgId);
  return org?.role === ORG_ROLES.ADMIN;
}
