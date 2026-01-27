/**
 * Convex client setup for React
 * Uses official Convex React provider pattern with ConvexProviderWithAuth
 */

import {
  ConvexProvider as ConvexReactProvider,
  useQuery,
  useMutation,
  useAction,
  useConvexAuth,
} from 'convex/react';
import { ConvexReactClient } from 'convex/react';

let globalClient: ConvexReactClient | null = null;

/**
 * Get or create the global Convex client
 */
export function getConvexClient(convexUrl: string): ConvexReactClient {
  if (!globalClient) {
    globalClient = new ConvexReactClient(convexUrl);
  }
  return globalClient;
}

/**
 * Clear auth from the client
 */
export function clearConvexAuth(client: ConvexReactClient) {
  client.clearAuth();
}

// Re-export Convex React hooks for convenience
export { useQuery, useMutation, useAction, useConvexAuth, ConvexReactProvider };
