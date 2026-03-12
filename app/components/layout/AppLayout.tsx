/**
 * AppLayout - Main layout wrapper with sidebar and toolbar
 */

'use client';

import React, { useState } from 'react';
import { Agent, type AgentCreateDefaults } from '@/types/agent';
import { MainToolbar } from './MainToolbar';
import { AgentModal } from '../forms/AgentModal';
import { AgentGrid } from '../agents/AgentGrid';
import { QuickLookPanel } from '../ui/QuickLookPanel';
import { CommentsPanel } from '../ui/CommentsPanel';
import { useAppState } from '@/contexts/AppStateContext';
import { useDeleteAgent } from '@/hooks/useDeleteAgent';

export function AppLayout() {
  const { quickLookAgent, setQuickLookAgent } = useAppState();
  const confirmAndDelete = useDeleteAgent();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [createDefaults, setCreateDefaults] = useState<AgentCreateDefaults | undefined>();
  const [commentsAgent, setCommentsAgent] = useState<Agent | null>(null);

  const handleOpenAgentModal = (agent?: Agent, defaults?: AgentCreateDefaults) => {
    setEditingAgent(agent || null);
    setCreateDefaults(agent ? undefined : defaults);
    setIsAgentModalOpen(true);
  };

  const handleCloseAgentModal = () => {
    setIsAgentModalOpen(false);
    setEditingAgent(null);
    setCreateDefaults(undefined);
  };

  // Quick Look handlers
  const handleQuickLook = (agent: Agent) => {
    setQuickLookAgent(agent);
  };

  const handleCloseQuickLook = () => {
    setQuickLookAgent(null);
  };

  const handleEditFromQuickLook = () => {
    if (quickLookAgent) {
      handleOpenAgentModal(quickLookAgent);
      setQuickLookAgent(null);
    }
  };

  const handleDeleteFromQuickLook = async () => {
    if (!quickLookAgent) return;

    const agentToDelete = quickLookAgent;
    setQuickLookAgent(null);

    await confirmAndDelete(agentToDelete._id, agentToDelete.name);
  };

  // Comments panel handlers
  const handleOpenComments = (agent: Agent) => {
    setCommentsAgent(agent);
  };

  const handleCloseComments = () => {
    setCommentsAgent(null);
  };

  return (
    <>
      <MainToolbar onAddAgent={() => handleOpenAgentModal()} />
      <main className="main-content">
        <AgentGrid
          onEditAgent={(agent) => handleOpenAgentModal(agent)}
          onAddAgent={(defaults) => handleOpenAgentModal(undefined, defaults)}
          onQuickLook={handleQuickLook}
          onOpenComments={handleOpenComments}
        />
      </main>

      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={handleCloseAgentModal}
        agent={editingAgent}
        defaults={createDefaults}
      />

      <QuickLookPanel
        agent={quickLookAgent}
        isOpen={quickLookAgent !== null}
        onClose={handleCloseQuickLook}
        onEdit={handleEditFromQuickLook}
        onDelete={handleDeleteFromQuickLook}
      />

      <CommentsPanel
        agent={commentsAgent}
        isOpen={commentsAgent !== null}
        onClose={handleCloseComments}
      />
    </>
  );
}
