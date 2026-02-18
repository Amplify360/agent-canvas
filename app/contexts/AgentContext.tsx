/**
 * AgentContext - Manages agents and CRUD operations
 */

'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { AgentWithOwner, AgentFormData } from '@/types/agent';
import { useMutation, useCanQuery } from '@/hooks/useConvex';
import { useStableQuery } from '@/hooks/useStableQuery';
import { useAuth } from './AuthContext';
import { useCanvas } from './CanvasContext';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface AgentContextValue {
  agents: AgentWithOwner[];
  isLoading: boolean;
  createAgent: (data: AgentFormData) => Promise<string>;
  updateAgent: (agentId: string, data: Partial<AgentFormData>) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized } = useAuth();
  // Gate Convex queries on auth state to prevent empty results during token refresh
  const { canQuery, isConvexAuthLoading } = useCanQuery();
  const { currentCanvasId, currentCanvas, isLoading: isCanvasLoading } = useCanvas();

  // Subscribe to agents using official Convex hook with stale-data caching
  // Only query if Convex has the token AND has a valid canvas (not just canvasId, as it may be stale after deletion)
  const { data: agents = [], isLoading: isQueryLoading, hasLoaded: hasLoadedAgents } = useStableQuery(
    api.agents.list,
    canQuery && currentCanvas ? { canvasId: currentCanvasId as Id<"canvases"> } : 'skip',
    currentCanvasId,
  );

  const createAgentMutation = useMutation(api.agents.create);
  const updateAgentMutation = useMutation(api.agents.update);
  const deleteAgentMutation = useMutation(api.agents.remove);

  const createAgent = useCallback(async (data: AgentFormData) => {
    if (!currentCanvasId) throw new Error('No canvas selected');
    const agentId = await createAgentMutation({
      canvasId: currentCanvasId as Id<"canvases">,
      ...data,
    });
    return agentId as string;
  }, [currentCanvasId, createAgentMutation]);

  const updateAgent = useCallback(async (agentId: string, data: Partial<AgentFormData>) => {
    await updateAgentMutation({ agentId: agentId as Id<"agents">, ...data });
  }, [updateAgentMutation]);

  const deleteAgent = useCallback(async (agentId: string) => {
    await deleteAgentMutation({ agentId: agentId as Id<"agents"> });
  }, [deleteAgentMutation]);

  // Not loading if there's simply no canvas to query agents for
  const hasNoCanvas = isInitialized && !isCanvasLoading && !currentCanvas;
  const isLoading = !hasNoCanvas && (!isInitialized || isCanvasLoading || isConvexAuthLoading || isQueryLoading) && !hasLoadedAgents;

  const value = useMemo<AgentContextValue>(() => ({
    agents,
    isLoading,
    createAgent,
    updateAgent,
    deleteAgent,
  }), [agents, isLoading, createAgent, updateAgent, deleteAgent]);

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
}
