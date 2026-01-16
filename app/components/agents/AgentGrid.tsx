/**
 * AgentGrid - main container for agent groups
 */

'use client';

import React, { useState } from 'react';
import { Agent } from '@/types/agent';
import { AgentGroupSection } from './AgentGroupSection';
import { useGrouping } from '@/contexts/GroupingContext';
import { useAgents } from '@/contexts/AgentContext';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { Icon } from '@/components/ui/Icon';

interface AgentGridProps {
  onEditAgent: (agent: Agent) => void;
  onAddAgent: (phase: string) => void;
}

export function AgentGrid({ onEditAgent, onAddAgent }: AgentGridProps) {
  const { computedGroups } = useGrouping();
  const { deleteAgent } = useAgents();
  const executeOperation = useAsyncOperation();

  const handleDeleteAgent = async (agent: Agent) => {
    if (!window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return;
    }

    await executeOperation(
      () => deleteAgent(agent._id),
      {
        loadingMessage: 'Deleting agent...',
        successMessage: 'Agent deleted successfully',
        errorMessage: 'Failed to delete agent',
      }
    );
  };

  if (computedGroups.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="inbox" />
        <h3>No agents found</h3>
        <p>Create your first agent to get started</p>
      </div>
    );
  }

  return (
    <div className="agent-groups-container">
      {computedGroups.map((group) => (
        <AgentGroupSection
          key={group.id}
          group={group}
          onEditAgent={onEditAgent}
          onDeleteAgent={handleDeleteAgent}
          onAddAgent={onAddAgent}
        />
      ))}
    </div>
  );
}
