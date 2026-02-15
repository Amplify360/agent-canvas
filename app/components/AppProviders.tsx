/**
 * AppProviders - Shared provider hierarchy for all app pages
 *
 * Uses WorkOS AuthKit SDK for authentication.
 */

'use client';

import React from 'react';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConvexClientProvider } from '@/contexts/ConvexClientProvider';
import { CanvasProvider } from '@/contexts/CanvasContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { GroupingProvider } from '@/contexts/GroupingContext';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { WorkOSWidgetsProvider } from '@/components/WorkOSWidgetsProvider';
import { authDebug } from '@/utils/authDebug';

// Signal session expiry to ConnectionRecoveryBanner instead of AuthKit's default page reload
const onSessionExpired = () => {
  authDebug('AppProviders', 'workos_session_expired');
  window.dispatchEvent(new CustomEvent('workos-session-expired'));
};

interface AppProvidersProps {
  children: React.ReactNode;
  initialCanvasId?: string;
}

export function AppProviders({ children, initialCanvasId }: AppProvidersProps) {
  return (
    <AuthKitProvider onSessionExpired={onSessionExpired}>
      <WorkOSWidgetsProvider>
        <ConvexClientProvider>
          <AuthProvider>
            <CanvasProvider initialCanvasId={initialCanvasId}>
              <AgentProvider>
                <GroupingProvider>
                  <AppStateProvider>
                    {children}
                  </AppStateProvider>
                </GroupingProvider>
              </AgentProvider>
            </CanvasProvider>
          </AuthProvider>
        </ConvexClientProvider>
      </WorkOSWidgetsProvider>
    </AuthKitProvider>
  );
}
