/**
 * Hook for handling Escape key.
 */

'use client';

import { useEffect } from 'react';

export function useEscapeKey(
  enabled: boolean,
  onEscape: () => void,
  opts?: { stopImmediatePropagation?: boolean }
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (opts?.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
      onEscape();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, onEscape, opts?.stopImmediatePropagation]);
}

