'use client';

import { useEffect, useRef } from 'react';

const AUTO_RETRY_DELAY_MS = 2500;
const MAX_AUTO_RETRIES = 2;

/**
 * App-level error boundary.
 *
 * Catches transient errors (e.g. auth race conditions during signup/login)
 * and auto-retries for auth errors, or shows a retry button for other errors.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retryCount = useRef(0);

  const isAuthError = error.message?.includes('Authentication required');

  useEffect(() => {
    console.error('[ErrorBoundary]', error);

    // Auto-retry transient auth errors — the token usually arrives within 2s
    if (isAuthError && retryCount.current < MAX_AUTO_RETRIES) {
      retryCount.current += 1;
      const timer = setTimeout(reset, AUTO_RETRY_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [error, isAuthError, reset]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
        {isAuthError ? 'Authenticating...' : 'Something went wrong'}
      </h2>
      <p style={{ color: '#666', margin: 0, textAlign: 'center', maxWidth: '400px' }}>
        {isAuthError
          ? 'Your session is still being set up. This usually resolves in a moment.'
          : 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          borderRadius: '8px',
          border: 'none',
          background: '#4f46e5',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
