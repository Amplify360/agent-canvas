/**
 * SessionContext - Tracks auth/connection state across the app
 */

'use client';

import React, { createContext, useContext } from 'react';

export type SessionStatus = 'ready' | 'refreshing' | 'expired';

export interface SessionState {
  status: SessionStatus;
  lastAuthOkAt: number | null;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SessionState;
}) {
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionStatus(): SessionState {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionStatus must be used within SessionProvider');
  }
  return context;
}
