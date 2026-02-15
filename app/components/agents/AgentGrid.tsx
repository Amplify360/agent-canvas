/**
 * AgentGrid - main container for agent groups with premium empty state
 */

'use client';

import React from 'react';
import { Agent } from '@/types/agent';
import { AgentGroupSection } from './AgentGroupSection';
import { useGrouping } from '@/contexts/GroupingContext';
import { useAgents } from '@/contexts/AgentContext';
import { useCanQuery } from '@/hooks/useConvex';
import { useDeleteAgent } from '@/hooks/useDeleteAgent';
import { Icon } from '@/components/ui/Icon';
import type { AgentCreateDefaults } from '@/types/agent';
import { useCanvas } from '@/contexts/CanvasContext';
import { useCanvasFeedback } from '@/hooks/useCanvasFeedback';
import type { Id } from '../../../convex/_generated/dataModel';

interface AgentGridProps {
  onEditAgent: (agent: Agent) => void;
  onAddAgent: (defaults?: AgentCreateDefaults) => void;
  onQuickLook?: (agent: Agent) => void;
  onOpenComments?: (agent: Agent) => void;
}

export function AgentGrid({ onEditAgent, onAddAgent, onQuickLook, onOpenComments }: AgentGridProps) {
  const { computedGroups } = useGrouping();
  const { isLoading } = useAgents();
  const { currentCanvasId } = useCanvas();
  const { isConvexAuthenticated, isConvexAuthLoading } = useCanQuery();
  const confirmAndDelete = useDeleteAgent();
  const { voteCountsByAgent, userVotesByAgent, commentCountsByAgent } = useCanvasFeedback(
    (currentCanvasId as Id<'canvases'> | null)
  );

  const handleDeleteAgent = async (agent: Agent) => {
    await confirmAndDelete(agent._id, agent.name);
  };

  // Auth has definitively failed (not loading, not authenticated) — show reconnecting
  if (!isConvexAuthLoading && !isConvexAuthenticated) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="wifi-off" />
        </div>
        <h3 className="empty-state__title">Reconnecting...</h3>
        <p className="empty-state__description">
          Waiting for connection to be restored
        </p>
      </div>
    );
  }

  // Block rendering while data or auth is still loading
  if (isLoading || !isConvexAuthenticated) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="loader-2" className="loading-icon" />
        </div>
        <h3 className="empty-state__title">Loading...</h3>
      </div>
    );
  }

  if (computedGroups.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="bot" />
        </div>
        <h3 className="empty-state__title">No agents found</h3>
        <p className="empty-state__description">
          Create your first agent to get started building your AI workflow
        </p>
        <button
          className="empty-state__btn"
          onClick={() => onAddAgent()}
        >
          <Icon name="plus" />
          Add Agent
        </button>
      </div>
    );
  }

  return (
    <div className="agent-groups-container">
      {computedGroups.map((group, idx) => (
        <AgentGroupSection
          key={group.id}
          group={group}
          groupIndex={idx}
          onEditAgent={onEditAgent}
          onDeleteAgent={handleDeleteAgent}
          onAddAgent={onAddAgent}
          onQuickLook={onQuickLook}
          onOpenComments={onOpenComments}
          voteCountsByAgent={voteCountsByAgent}
          userVotesByAgent={userVotesByAgent}
          commentCountsByAgent={commentCountsByAgent}
        />
      ))}
    </div>
  );
}
