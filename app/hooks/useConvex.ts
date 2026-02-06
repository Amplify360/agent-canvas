/**
 * Convex client setup for React
 * Re-exports Convex React hooks for convenience
 */

import {
  useQuery,
  useMutation,
  useAction,
  useConvexAuth,
} from 'convex/react';

// Re-export Convex React hooks for convenience
export { useQuery, useMutation, useAction, useConvexAuth };

/**
 * Derives a query-gating flag from Convex auth state.
 * Queries should be skipped while auth is loading or unauthenticated
 * to prevent empty results and UI flicker during token refresh.
 */
export function useCanQuery() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return {
    canQuery: isAuthenticated && !isLoading,
    isConvexAuthenticated: isAuthenticated,
    isConvexAuthLoading: isLoading,
  };
}
