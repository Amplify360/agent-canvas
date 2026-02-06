/**
 * useTabResume - Fires a callback when the browser tab becomes active
 *
 * Unifies focus and visibilitychange event handling into a single hook.
 * Consumers provide their own throttling/cooldown logic in the callback.
 *
 * The callback ref pattern is used so callers don't need to memoize
 * their callback or add it to dependency arrays.
 */

'use client';

import { useEffect, useRef } from 'react';

export function useTabResume(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onResume = () => callbackRef.current();

    const handleFocus = () => onResume();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') onResume();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
