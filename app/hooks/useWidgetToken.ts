/**
 * useWidgetToken - Hook for fetching WorkOS widget authentication tokens
 *
 * Manages the lifecycle of widget tokens including fetching, caching,
 * and error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWidgetTokenOptions {
  scopes?: string[];
}

interface UseWidgetTokenResult {
  token: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWidgetToken(
  organizationId: string | null,
  options?: UseWidgetTokenOptions
): UseWidgetTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !!organizationId);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Track the scopes array by value to prevent infinite loops
  const scopesRef = useRef(options?.scopes);
  scopesRef.current = options?.scopes;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchToken = useCallback(async (signal?: AbortSignal) => {
    if (!organizationId) {
      if (isMountedRef.current) {
        setToken(null);
        setError(null);
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch('/api/widgets/token', {
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          scopes: scopesRef.current,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch widget token');
      }

      const data = await response.json();
      if (!signal?.aborted && isMountedRef.current) {
        setToken(data.token);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Token fetch error');
        setToken(null);
      }
    } finally {
      if (!signal?.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId]);

  useEffect(() => {
    const abortController = new AbortController();
    void fetchToken(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchToken]);

  const refetch = useCallback(async () => {
    await fetchToken();
  }, [fetchToken]);

  return { token, loading, error, refetch };
}
