'use client';

interface AuthDebugEntry {
  at: string;
  source: string;
  event: string;
  detail?: Record<string, unknown>;
}

declare global {
  interface Window {
    __AUTH_DEBUG_EVENTS__?: AuthDebugEntry[];
  }
}

const MAX_EVENTS = 500;

export const isAuthDebugEnabled = process.env.NEXT_PUBLIC_AUTH_DEBUG === '1';

export function authDebug(source: string, event: string, detail?: Record<string, unknown>) {
  if (!isAuthDebugEnabled || typeof window === 'undefined') {
    return;
  }

  const entry: AuthDebugEntry = {
    at: new Date().toISOString(),
    source,
    event,
    detail,
  };

  if (!window.__AUTH_DEBUG_EVENTS__) {
    window.__AUTH_DEBUG_EVENTS__ = [];
  }

  window.__AUTH_DEBUG_EVENTS__.push(entry);
  if (window.__AUTH_DEBUG_EVENTS__.length > MAX_EVENTS) {
    window.__AUTH_DEBUG_EVENTS__.shift();
  }

  console.debug(`[AuthDebug] ${source}:${event}`, detail ?? {});
}
