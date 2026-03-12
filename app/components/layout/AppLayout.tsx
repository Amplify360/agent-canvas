/**
 * AppLayout - Main layout wrapper with sidebar and toolbar
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Agent, type AgentCreateDefaults } from '@/types/agent';
import { Sidebar } from './Sidebar';
import { MainToolbar } from './MainToolbar';
import { AgentModal } from '../forms/AgentModal';
import { AgentGrid } from '../agents/AgentGrid';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ToastContainer } from '../ui/Toast';
import { ConnectionRecoveryBanner } from '../ui/ConnectionRecoveryBanner';
import { QuickLookPanel } from '../ui/QuickLookPanel';
import { CommentsPanel } from '../ui/CommentsPanel';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_SIDEBAR_WIDTH,
  useAppState,
} from '@/contexts/AppStateContext';
import { useDeleteAgent } from '@/hooks/useDeleteAgent';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';

export function AppLayout() {
  const { isSidebarCollapsed, toggleSidebar, sidebarWidth, quickLookAgent, setQuickLookAgent } = useAppState();
  const confirmAndDelete = useDeleteAgent();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [createDefaults, setCreateDefaults] = useState<AgentCreateDefaults | undefined>();
  const [commentsAgent, setCommentsAgent] = useState<Agent | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const effectiveSidebarCollapsed = hasMounted ? isSidebarCollapsed : DEFAULT_SIDEBAR_COLLAPSED;
  const effectiveSidebarWidth = hasMounted ? sidebarWidth : DEFAULT_SIDEBAR_WIDTH;

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
      <ConnectionRecoveryBanner />
      <Sidebar />
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
            <button
              className="sidebar-expand-btn"
              onClick={toggleSidebar}
            >
              <Icon name="panel-left-open" />
            </button>
          </Tooltip>
        )}
        <MainToolbar onAddAgent={() => handleOpenAgentModal()} />
        <main className="main-content">
          <AgentGrid
            onEditAgent={(agent) => handleOpenAgentModal(agent)}
            onAddAgent={(defaults) => handleOpenAgentModal(undefined, defaults)}
            onQuickLook={handleQuickLook}
            onOpenComments={handleOpenComments}
          />
        </main>
      </div>

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

      <LoadingOverlay />
      <ToastContainer />
    </>
  );
}
