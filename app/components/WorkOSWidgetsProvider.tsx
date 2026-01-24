/**
 * WorkOSWidgetsProvider - Provides WorkOS Widgets context and theming
 *
 * Wraps the application with WorkOS widget providers and React Query
 * for server state management required by the widgets.
 */

'use client';

import React from 'react';
import { WorkOsWidgets } from '@workos-inc/widgets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import WorkOS widget CSS (must be in JS, not CSS @import)
import '@radix-ui/themes/styles.css';
import '@workos-inc/widgets/styles.css';

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

interface WorkOSWidgetsProviderProps {
  children: React.ReactNode;
}

export function WorkOSWidgetsProvider({ children }: WorkOSWidgetsProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkOsWidgets
        theme={{
          appearance: 'light',
          accentColor: 'indigo',
          radius: 'medium',
        }}
      >
        {children}
      </WorkOsWidgets>
    </QueryClientProvider>
  );
}
