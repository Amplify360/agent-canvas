/**
 * Convex client setup for React
 *
 * This module is the single import surface for Convex hooks. In normal
 * runtime it proxies through to `convex/react`. For E2E tests we provide an
 * in-memory implementation via `MockConvexProvider`, allowing Playwright
 * to exercise the happy path without real Convex/WorkOS credentials.
 */

import type { FunctionReference } from 'convex/server';
import type { ConvexReactClient, OptionalRestArgsOrSkip, ReactAction, ReactMutation } from 'convex/react';
import {
  useQuery as useQueryReal,
  useMutation as useMutationReal,
  useAction as useActionReal,
  useConvexAuth as useConvexAuthReal,
  useConvex as useConvexReal,
} from 'convex/react';

import { useMockConvex } from '@/contexts/MockConvexContext';

const FUNCTION_NAME_SYMBOL = Symbol.for('functionName');

function getFunctionName(ref: unknown): string {
  if (typeof ref === 'string') return ref;
  if (!ref || typeof ref !== 'object') {
    throw new Error('[useConvex] Expected a Convex function reference');
  }
  const name = (ref as Record<symbol, unknown>)[FUNCTION_NAME_SYMBOL];
  if (typeof name !== 'string' || !name) {
    throw new Error('[useConvex] Expected a Convex function reference');
  }
  return name;
}

export function useQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  ...args: OptionalRestArgsOrSkip<Query>
): Query['_returnType'] | undefined {
  const mock = useMockConvex();
  if (mock) {
    const queryArgs = args[0] as any;
    if (queryArgs === 'skip') return undefined;
    return mock.query(getFunctionName(query), queryArgs) as Query['_returnType'];
  }
  return useQueryReal(query, ...(args as any));
}

export function useMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation,
): ReactMutation<Mutation> {
  const mock = useMockConvex();
  if (mock) {
    const functionName = getFunctionName(mutation);
    return (async (mutationArgs: unknown) => mock.mutation(functionName, mutationArgs)) as any;
  }
  return useMutationReal(mutation);
}

export function useAction<Action extends FunctionReference<'action'>>(
  action: Action,
): ReactAction<Action> {
  const mock = useMockConvex();
  if (mock) {
    const functionName = getFunctionName(action);
    return (async (actionArgs: unknown) => mock.action(functionName, actionArgs)) as any;
  }
  return useActionReal(action);
}

export function useConvexAuth(): { isLoading: boolean; isAuthenticated: boolean } {
  const mock = useMockConvex();
  if (mock) {
    return { isAuthenticated: mock.isAuthenticated, isLoading: mock.isLoading };
  }
  return useConvexAuthReal();
}

export function useConvex(): ConvexReactClient {
  const mock = useMockConvex();
  if (mock) {
    return {
      // Only the method(s) we use in the app today.
      query: async (queryRef: unknown, queryArgs: unknown) =>
        mock.query(getFunctionName(queryRef), queryArgs),
    } as unknown as ConvexReactClient;
  }
  return useConvexReal();
}

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
