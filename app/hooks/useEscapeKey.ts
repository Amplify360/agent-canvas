/**
 * Hook for handling Escape key.
 */

'use client';

import { useEffect, useRef } from 'react';

type EscapeEntry = {
  id: symbol;
  onEscapeRef: { current: () => void };
};

const escapeStack: EscapeEntry[] = [];
let isListenerAttached = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (e.defaultPrevented) return;

  const entry = escapeStack[escapeStack.length - 1];
  if (!entry) return;

  entry.onEscapeRef.current();
}

function ensureListener() {
  if (isListenerAttached) return;
  document.addEventListener('keydown', onKeyDown);
  isListenerAttached = true;
}

function maybeRemoveListener() {
  if (!isListenerAttached) return;
  if (escapeStack.length > 0) return;
  document.removeEventListener('keydown', onKeyDown);
  isListenerAttached = false;
}

export function useEscapeKey(
  enabled: boolean,
  onEscape: () => void
) {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const entry: EscapeEntry = { id: Symbol('escape'), onEscapeRef };
    escapeStack.push(entry);
    ensureListener();

    return () => {
      const idx = escapeStack.findIndex((existing) => existing.id === entry.id);
      if (idx !== -1) {
        escapeStack.splice(idx, 1);
      }
      maybeRemoveListener();
    };
  }, [enabled]);
}
