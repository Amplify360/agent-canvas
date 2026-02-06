/**
 * GroupingContext - Manages agent grouping and filtering state
 */

'use client';

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import { AgentGroup } from '@/types/agent';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { groupAgentsByTag, filterAgents } from '@/utils/grouping';
import { DEFAULT_GROUPING_TAG } from '@/utils/config';
import { useAgents } from './AgentContext';
import { useCanvas } from './CanvasContext';
import { STORAGE_KEYS } from '@/constants/storageKeys';

export type ViewMode = 'grid' | 'dock';

interface GroupingPreferences {
  activeTagType: string;
  filters: Record<string, string[]>;
  viewMode: ViewMode;
}

interface GroupingContextValue {
  activeTagType: string;
  filters: Record<string, string[]>;
  computedGroups: AgentGroup[];
  viewMode: ViewMode;
  setActiveTagType: (tagType: string) => void;
  setFilters: (filters: Record<string, string[]>) => void;
  setViewMode: (mode: ViewMode) => void;
}

const GroupingContext = createContext<GroupingContextValue | undefined>(undefined);

export function GroupingProvider({ children }: { children: React.ReactNode }) {
  const { agents } = useAgents();
  const { currentCanvas } = useCanvas();

  const [preferences, setPreferences] = useLocalStorage<GroupingPreferences>(
    STORAGE_KEYS.GROUPING_PREFERENCE,
    {
      activeTagType: DEFAULT_GROUPING_TAG,
      filters: {},
      viewMode: 'grid',
    }
  );

  // Migrate legacy viewMode values ('compact', 'detail') to 'grid' for existing users
  const hasMigrated = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentViewMode = preferences.viewMode as any;
    if (!hasMigrated.current && (currentViewMode === 'compact' || currentViewMode === 'detail')) {
      hasMigrated.current = true;
      setPreferences((prev) => ({ ...prev, viewMode: 'grid' }));
    }
  }, [preferences.viewMode, setPreferences]);

  // Compute grouped agents with filters
  const computedGroups = useMemo(() => {
    let filteredAgents = agents;

    // Apply filters
    if (Object.keys(preferences.filters).length > 0) {
      filteredAgents = filterAgents(filteredAgents, preferences.filters);
    }

    // Group by active tag type with canvas-level ordering
    return groupAgentsByTag(filteredAgents, {
      tagType: preferences.activeTagType,
      phaseOrder: currentCanvas?.phases,
      categoryOrder: currentCanvas?.categories,
    });
  }, [agents, preferences.filters, preferences.activeTagType, currentCanvas?.phases, currentCanvas?.categories]);

  const setActiveTagType = useCallback((tagType: string) => {
    setPreferences((prev) => ({ ...prev, activeTagType: tagType }));
    window.dispatchEvent(new CustomEvent('groupingChanged', { detail: { tagType } }));
  }, [setPreferences]);

  const setFilters = useCallback((filters: Record<string, string[]>) => {
    setPreferences((prev) => ({ ...prev, filters }));
  }, [setPreferences]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setPreferences((prev) => ({ ...prev, viewMode: mode }));
  }, [setPreferences]);

  const value = useMemo<GroupingContextValue>(() => ({
    activeTagType: preferences.activeTagType,
    filters: preferences.filters,
    computedGroups,
    viewMode: preferences.viewMode,
    setActiveTagType,
    setFilters,
    setViewMode,
  }), [
    preferences.activeTagType, preferences.filters, computedGroups,
    preferences.viewMode, setActiveTagType, setFilters, setViewMode,
  ]);

  return <GroupingContext.Provider value={value}>{children}</GroupingContext.Provider>;
}

export function useGrouping() {
  const context = useContext(GroupingContext);
  if (context === undefined) {
    throw new Error('useGrouping must be used within a GroupingProvider');
  }
  return context;
}
