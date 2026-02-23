'use client';

import React from 'react';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';

interface ExploreProvidersProps {
  children: React.ReactNode;
}

export function ExploreProviders({ children }: ExploreProvidersProps) {
  return (
    <AuthKitProvider>
      {children}
    </AuthKitProvider>
  );
}
