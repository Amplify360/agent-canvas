/**
 * useStableQuery - Wraps Convex useQuery to avoid UI flicker during re-subscriptions
 *
 * When Convex re-subscribes to a query (e.g., after auth token refresh or reconnection),
 * the query result briefly becomes `undefined`. This hook caches the last successful result
 * and returns it during those gaps, preventing UI flicker.
 */

'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@/hooks/useConvex';
import type { FunctionReference, FunctionReturnType } from 'convex/server';
import type { OptionalRestArgsOrSkip } from 'convex/react';

/**
 * A wrapper around Convex's useQuery that retains the last successful result
 * while the query is re-subscribing (returning undefined).
 *
 * @param query - The Convex query function reference
 * @param args - The query arguments, or 'skip' to disable the query
 * @returns An object with `data`, `isLoading`, and `hasLoaded`
 */
export function useStableQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: OptionalRestArgsOrSkip<Query>[0],
  resetKey?: unknown,
): {
  data: FunctionReturnType<Query> | undefined;
  isLoading: boolean;
  hasLoaded: boolean;
} {
  type ReturnT = FunctionReturnType<Query>;
  const isSkipped = args === 'skip';
  const [lastData, setLastData] = useState<ReturnT | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setLastData(undefined);
    setHasLoaded(false);
  }, [resetKey]);

  // Call Convex useQuery with the provided query and args
  const queryResult = useQuery(query, args);

  useEffect(() => {
    if (queryResult !== undefined) {
      setLastData(queryResult);
      setHasLoaded(true);
    }
  }, [queryResult]);

  return {
    data: isSkipped ? undefined : (queryResult ?? lastData),
    isLoading: !isSkipped && queryResult === undefined && !hasLoaded,
    hasLoaded,
  };
}
