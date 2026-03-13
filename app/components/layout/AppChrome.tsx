'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ToastContainer } from '../ui/Toast';
import { ConnectionRecoveryBanner } from '../ui/ConnectionRecoveryBanner';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_SIDEBAR_WIDTH,
  useAppState,
} from '@/contexts/AppStateContext';

interface AppChromeProps {
  children: React.ReactNode;
}

export function AppChrome({ children }: AppChromeProps) {
  const { isSidebarCollapsed, toggleSidebar, sidebarWidth } = useAppState();
  const [hasMounted, setHasMounted] = useState(false);
  const effectiveSidebarCollapsed = hasMounted ? isSidebarCollapsed : DEFAULT_SIDEBAR_COLLAPSED;
  const effectiveSidebarWidth = hasMounted ? sidebarWidth : DEFAULT_SIDEBAR_WIDTH;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <>
      <ConnectionRecoveryBanner />
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div
        className={`main-wrapper ${effectiveSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={
          !effectiveSidebarCollapsed
            ? ({ '--sidebar-width': `${effectiveSidebarWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        {effectiveSidebarCollapsed && (
          <Tooltip content="Expand sidebar" placement="right" triggerClassName="sidebar-expand-tooltip">
            <button className="sidebar-expand-btn" onClick={toggleSidebar}>
              <Icon name="panel-left-open" />
            </button>
          </Tooltip>
        )}
        {children}
      </div>
      <LoadingOverlay />
      <ToastContainer />
    </>
  );
}
