/**
 * AuthContext - Manages user authentication and organization state
 *
 * Uses WorkOS AuthKit SDK for session management and org memberships from Convex.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth as useAuthKit } from '@workos-inc/authkit-nextjs/components';
import { User, Organization } from '@/types/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ORG_ROLES } from '@/types/validationConstants';

interface AuthContextValue {
  user: User | null;
  userOrgs: Organization[];
  currentOrgId: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  setCurrentOrgId: (orgId: string) => void;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  syncMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use WorkOS AuthKit SDK for user session
  const authKit = useAuthKit();
  const authKitUser = authKit.user;
  const isLoading = authKit.loading;

  // Local state for org data
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useLocalStorage<string | null>(STORAGE_KEYS.CURRENT_ORG, null);
  const [isInitialized, setIsInitialized] = useState(false);
  const currentOrgIdRef = useRef(currentOrgId);
  const lastFocusRefreshAt = useRef(0);
  const lastFailedRefreshAt = useRef(0);
  const isRefreshingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);
  const FOCUS_REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000;
  const FOCUS_REFRESH_FAILURE_COOLDOWN_MS = 5 * 1000;

  // Keep ref in sync with state
  useEffect(() => {
    currentOrgIdRef.current = currentOrgId;
  }, [currentOrgId]);

  // Clear persisted selections when user changes (prevents cross-user leakage)
  useEffect(() => {
    const currentId = authKitUser?.id ?? null;
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

  // Fetch org memberships from API when user changes
  const fetchOrgMemberships = useCallback(async () => {
    if (!authKitUser) {
      setUserOrgs([]);
      return;
    }

    try {
      // Fetch org memberships and details via our API
      const response = await fetch('/api/auth/orgs');
      if (response.ok) {
        const data = await response.json();
        const orgs: Organization[] = data.orgs || [];
        setUserOrgs(orgs);

        // Set current org if not set or if current is no longer accessible
        const savedOrgId = currentOrgIdRef.current;
        if (!savedOrgId && orgs.length > 0) {
          setCurrentOrgIdState(orgs[0].id);
        } else if (savedOrgId && !orgs.some(org => org.id === savedOrgId)) {
          if (orgs.length > 0) {
            setCurrentOrgIdState(orgs[0].id);
          } else {
            setCurrentOrgIdState(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch org memberships:', error);
    }
  }, [authKitUser, setCurrentOrgIdState]);

  // Initialize when user changes or loading finishes
  useEffect(() => {
    if (!isLoading) {
      if (authKitUser) {
        fetchOrgMemberships().finally(() => {
          setIsInitialized(true);
        });
      } else {
        setUserOrgs([]);
        setIsInitialized(true);
      }
    }
  }, [authKitUser, isLoading, fetchOrgMemberships]);

  const setCurrentOrgId = useCallback((orgId: string) => {
    setCurrentOrgIdState(orgId);
    // Dispatch custom event for cross-component communication
    window.dispatchEvent(new CustomEvent('orgChanged', { detail: { orgId } }));
  }, [setCurrentOrgIdState]);

  const signOut = useCallback(async () => {
    try {
      // Clear local state
      setUserOrgs([]);
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
    // Refresh the AuthKit session
    await authKit.refreshAuth();
    // Re-fetch org memberships
    await fetchOrgMemberships();
  }, [authKit, fetchOrgMemberships]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldRefresh = () => {
      if (!authKitUser || isLoading) return false;
      if (isRefreshingRef.current) return false;
      const now = Date.now();
      // Respect success cooldown (2 min)
      if (now - lastFocusRefreshAt.current < FOCUS_REFRESH_MIN_INTERVAL_MS) {
        return false;
      }
      // Respect failure cooldown (5 sec) to prevent hammering
      if (now - lastFailedRefreshAt.current < FOCUS_REFRESH_FAILURE_COOLDOWN_MS) {
        return false;
      }
      return true;
    };

    const doRefresh = () => {
      isRefreshingRef.current = true;
      refreshAuth()
        .then(() => {
          // Only set success cooldown after successful refresh
          lastFocusRefreshAt.current = Date.now();
        })
        .catch((error) => {
          console.error('Focus/visibility refreshAuth failed:', error);
          // Set shorter failure cooldown so retry is possible soon
          lastFailedRefreshAt.current = Date.now();
        })
        .finally(() => {
          isRefreshingRef.current = false;
        });
    };

    const handleFocus = () => {
      if (shouldRefresh()) doRefresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && shouldRefresh()) doRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authKitUser, isLoading, refreshAuth]);

  // Manual sync button action - triggers sync from Convex
  const syncMemberships = useCallback(async () => {
    if (!authKitUser) return;

    try {
      // Call the Convex action to sync memberships
      // This will be called via the Convex client from the component
      // Here we just refresh our local state
      await fetchOrgMemberships();
    } catch (error) {
      console.error('Failed to sync memberships:', error);
      throw error;
    }
  }, [authKitUser, fetchOrgMemberships]);

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
    syncMemberships,
  }), [
    user, userOrgs, currentOrgId, isInitialized, isAuthenticated,
    setCurrentOrgId, signOut, refreshAuth, syncMemberships,
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
