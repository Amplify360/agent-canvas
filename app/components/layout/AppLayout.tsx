/**
 * AppLayout - Main layout wrapper with sidebar and toolbar
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Agent, type AgentCreateDefaults } from '@/types/agent';
import type { WorkflowHighlightState, WorkflowRunState } from '@/types/workflow';
import { Sidebar } from './Sidebar';
import { MainToolbar } from './MainToolbar';
import { AgentModal } from '../forms/AgentModal';
import { AgentGrid } from '../agents/AgentGrid';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ToastContainer } from '../ui/Toast';
import { ConnectionRecoveryBanner } from '../ui/ConnectionRecoveryBanner';
import { QuickLookPanel } from '../ui/QuickLookPanel';
import { CommentsPanel } from '../ui/CommentsPanel';
import { useAppState } from '@/contexts/AppStateContext';
import { useAgents } from '@/contexts/AgentContext';
import { useCanvas } from '@/contexts/CanvasContext';
import { useDeleteAgent } from '@/hooks/useDeleteAgent';
import { findWorkflowForPrompt, resolveWorkflowSteps } from '@/constants/workflows';
import { WorkflowPromptOverlay } from '@/components/workflows/WorkflowPromptOverlay';
import { WorkflowTourCallout } from '@/components/workflows/WorkflowTourCallout';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';

export function AppLayout() {
  const { isSidebarCollapsed, toggleSidebar, sidebarWidth, quickLookAgent, setQuickLookAgent, showToast } = useAppState();
  const { agents } = useAgents();
  const { currentCanvasId } = useCanvas();
  const confirmAndDelete = useDeleteAgent();
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [createDefaults, setCreateDefaults] = useState<AgentCreateDefaults | undefined>();
  const [commentsAgent, setCommentsAgent] = useState<Agent | null>(null);
  const [isWorkflowPromptOpen, setIsWorkflowPromptOpen] = useState(false);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRunState | null>(null);

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

  const handleOpenWorkflowPrompt = () => {
    setIsWorkflowPromptOpen(true);
  };

  const handleCloseWorkflowMode = () => {
    setWorkflowRun(null);
    setIsWorkflowPromptOpen(false);
  };

  const handleSubmitWorkflowPrompt = (prompt: string) => {
    const workflow = findWorkflowForPrompt(prompt);
    if (!workflow) {
      showToast('No workflow definitions are available.', 'error');
      return;
    }

    const resolvedSteps = resolveWorkflowSteps(workflow, agents);
    if (resolvedSteps.length === 0) {
      showToast('No matching agents found for the workflow.', 'error');
      return;
    }

    setWorkflowRun({
      canvasId: currentCanvasId ?? null,
      workflow,
      prompt,
      steps: resolvedSteps,
      activeStepIndex: 0,
      isTourActive: false,
    });
    setIsWorkflowPromptOpen(false);
    showToast(`Workflow loaded: ${workflow.name}`, 'success');
  };

  const handlePreviousWorkflowStep = () => {
    setWorkflowRun((previous) => {
      if (!previous) return previous;
      if (!previous.isTourActive) return previous;
      return {
        ...previous,
        activeStepIndex: Math.max(0, previous.activeStepIndex - 1),
      };
    });
  };

  const handleNextWorkflowStep = () => {
    setWorkflowRun((previous) => {
      if (!previous) return previous;
      if (!previous.isTourActive) return previous;
      return {
        ...previous,
        activeStepIndex: Math.min(previous.steps.length - 1, previous.activeStepIndex + 1),
      };
    });
  };

  const handleStartWorkflowTour = () => {
    setWorkflowRun((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        isTourActive: true,
        activeStepIndex: Math.min(previous.activeStepIndex, previous.steps.length - 1),
      };
    });
  };

  const handleStopWorkflowTour = () => {
    setWorkflowRun((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        isTourActive: false,
      };
    });
  };

  const activeWorkflowStep = workflowRun?.steps[workflowRun.activeStepIndex] ?? null;
  const workflowHighlightState = useMemo<WorkflowHighlightState>(() => {
    if (!workflowRun) {
      return {
        isActive: false,
        activeAgentId: null,
        sequenceByAgentId: {},
      };
    }

    return {
      isActive: true,
      activeAgentId: workflowRun.isTourActive ? activeWorkflowStep?.agent._id ?? null : null,
      sequenceByAgentId: workflowRun.steps.reduce<Record<string, number>>((acc, step, index) => {
        acc[step.agent._id] = index + 1;
        return acc;
      }, {}),
    };
  }, [activeWorkflowStep?.agent._id, workflowRun]);

  useEffect(() => {
    setWorkflowRun((previous) => {
      if (!previous) return previous;

      const currentCanvas = currentCanvasId ?? null;
      if (previous.canvasId !== currentCanvas) {
        return null;
      }

      const liveAgentIds = new Set(agents.map((agent) => agent._id));
      const nextSteps = previous.steps.filter((step) => liveAgentIds.has(step.agent._id));
      if (nextSteps.length === previous.steps.length) {
        return previous;
      }

      if (nextSteps.length === 0) {
        return null;
      }

      return {
        ...previous,
        steps: nextSteps,
        activeStepIndex: Math.min(previous.activeStepIndex, nextSteps.length - 1),
      };
    });
  }, [agents, currentCanvasId]);

  return (
    <>
      <ConnectionRecoveryBanner />
      <Sidebar />
      <div
        className={`main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={!isSidebarCollapsed ? { '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties : undefined}
      >
        {isSidebarCollapsed && (
          <Tooltip content="Expand sidebar" placement="right" triggerClassName="sidebar-expand-tooltip">
            <button
              className="sidebar-expand-btn"
              onClick={toggleSidebar}
            >
              <Icon name="panel-left-open" />
            </button>
          </Tooltip>
        )}
        <MainToolbar
          onAddAgent={() => handleOpenAgentModal()}
          onOpenWorkflowPrompt={handleOpenWorkflowPrompt}
          onCloseWorkflow={handleCloseWorkflowMode}
          isWorkflowActive={workflowHighlightState.isActive}
        />
        <main className="main-content">
          {workflowRun && (
            <section className="workflow-overview-banner" aria-label="Active workflow">
              <div className="workflow-overview-banner__meta">
                <span className="workflow-overview-banner__eyebrow">Workflow</span>
                <h2>{workflowRun.workflow.name}</h2>
                <p>{workflowRun.workflow.description}</p>
              </div>
              <div className="workflow-overview-banner__actions">
                {!workflowRun.isTourActive ? (
                  <button type="button" className="btn btn--primary btn--sm" onClick={handleStartWorkflowTour}>
                    <Icon name="play" />
                    Start Guided Tour
                  </button>
                ) : (
                  <button type="button" className="btn btn--sm" onClick={handleStopWorkflowTour}>
                    <Icon name="pause" />
                    Hide Tour
                  </button>
                )}
                <button type="button" className="btn btn--sm" onClick={handleCloseWorkflowMode}>
                  <Icon name="x" />
                  Clear Workflow
                </button>
              </div>
            </section>
          )}

          <AgentGrid
            onEditAgent={(agent) => handleOpenAgentModal(agent)}
            onAddAgent={(defaults) => handleOpenAgentModal(undefined, defaults)}
            onQuickLook={handleQuickLook}
            onOpenComments={handleOpenComments}
            workflowHighlightState={workflowHighlightState}
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

      <WorkflowPromptOverlay
        isOpen={isWorkflowPromptOpen}
        onClose={() => setIsWorkflowPromptOpen(false)}
        onSubmit={handleSubmitWorkflowPrompt}
      />

      <WorkflowTourCallout
        isOpen={workflowHighlightState.isActive && !isWorkflowPromptOpen && Boolean(workflowRun?.isTourActive)}
        workflowName={workflowRun?.workflow.name ?? ''}
        step={activeWorkflowStep}
        stepIndex={workflowRun?.activeStepIndex ?? 0}
        stepCount={workflowRun?.steps.length ?? 0}
        onPrevious={handlePreviousWorkflowStep}
        onNext={handleNextWorkflowStep}
        onClose={handleCloseWorkflowMode}
      />

      <LoadingOverlay />
      <ToastContainer />
    </>
  );
}
