/**
 * AppStateContext - Manages global UI state (loading, toasts, modals, sidebar, theme)
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Agent } from '@/types/agent';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ThemePreference, ThemeValue } from '@/constants/themes';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppStateContextValue {
  isLoading: boolean;
  loadingMessage: string;
  toasts: Toast[];
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  quickLookAgent: Agent | null;
  themePreference: ThemePreference;
  resolvedTheme: ThemeValue;
  showLoading: (message: string) => void;
  hideLoading: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setQuickLookAgent: (agent: Agent | null) => void;
  setThemePreference: (theme: ThemePreference) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function getSystemTheme(): ThemeValue {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<{ count: number; message: string }>({
    count: 0,
    message: '',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(STORAGE_KEYS.SIDEBAR_WIDTH, 280);
  const [quickLookAgent, setQuickLookAgent] = useState<Agent | null>(null);
  const [themePreference, setThemePreference] = useLocalStorage<ThemePreference>(STORAGE_KEYS.THEME, 'system');
  const [resolvedTheme, setResolvedTheme] = useState<ThemeValue>('light');

  // Resolve theme preference to actual theme value
  useEffect(() => {
    const resolved = themePreference === 'system' ? getSystemTheme() : themePreference;
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [themePreference]);

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  const isLoading = loadingState.count > 0;
  const loadingMessage = loadingState.message;

  const showLoading = useCallback((message: string) => {
    setLoadingState((prev) => ({
      count: prev.count + 1,
      message,
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState((prev) => {
      const nextCount = Math.max(0, prev.count - 1);
      return nextCount === 0
        ? { count: 0, message: '' }
        : { count: nextCount, message: prev.message };
    });
  }, []);

  const toastTimeoutIds = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up all toast timeouts on unmount
  useEffect(() => {
    const timeouts = toastTimeoutIds.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const hideToast = useCallback((id: string) => {
    // Clear any existing auto-dismiss timeout for this toast
    const existingTimeout = toastTimeoutIds.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      toastTimeoutIds.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 3 seconds
    const timeoutId = setTimeout(() => {
      toastTimeoutIds.current.delete(id);
      hideToast(id);
    }, 3000);
    toastTimeoutIds.current.set(id, timeoutId);
  }, [hideToast]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, [setIsSidebarCollapsed]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  }, [setIsSidebarCollapsed]);

  const value = useMemo<AppStateContextValue>(() => ({
    isLoading,
    loadingMessage,
    toasts,
    isSidebarCollapsed,
    sidebarWidth,
    quickLookAgent,
    themePreference,
    resolvedTheme,
    showLoading,
    hideLoading,
    showToast,
    hideToast,
    toggleSidebar,
    setSidebarCollapsed,
    setSidebarWidth,
    setQuickLookAgent,
    setThemePreference,
  }), [
    isLoading, loadingMessage, toasts, isSidebarCollapsed, sidebarWidth,
    quickLookAgent, themePreference, resolvedTheme, showLoading, hideLoading,
    showToast, hideToast, toggleSidebar, setSidebarCollapsed, setSidebarWidth,
    setQuickLookAgent, setThemePreference,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
