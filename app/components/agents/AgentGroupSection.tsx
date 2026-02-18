/**
 * AgentGroupSection - Premium group display with animations
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { AgentWithOwner, AgentCreateDefaults, AgentGroup } from '@/types/agent';
import { AgentCard } from './AgentCard';
import { DockView } from './DockView';
import { useGrouping } from '@/contexts/GroupingContext';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { TAG_TYPE_ID } from '@/utils/config';
import { AGENT_STATUS, type AgentStatus, type VoteType } from '@/types/validationConstants';
import type { WorkflowHighlightState } from '@/types/workflow';

interface AgentGroupSectionProps {
  group: AgentGroup;
  groupIndex?: number;
  onEditAgent: (agent: AgentWithOwner) => void;
  onDeleteAgent: (agent: AgentWithOwner) => void;
  onAddAgent: (defaults?: AgentCreateDefaults) => void;
  onQuickLook?: (agent: AgentWithOwner) => void;
  onOpenComments?: (agent: AgentWithOwner) => void;
  voteCountsByAgent: Record<string, { up: number; down: number }>;
  userVotesByAgent: Record<string, VoteType>;
  commentCountsByAgent: Record<string, number>;
  workflowHighlightState?: WorkflowHighlightState;
}

export function AgentGroupSection({
  group,
  groupIndex = 0,
  onEditAgent,
  onDeleteAgent,
  onAddAgent,
  onQuickLook,
  onOpenComments,
  voteCountsByAgent,
  userVotesByAgent,
  commentCountsByAgent,
  workflowHighlightState,
}: AgentGroupSectionProps) {
  const { viewMode, activeTagType } = useGrouping();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const workflowSequenceByAgentId = workflowHighlightState?.sequenceByAgentId ?? {};
  const activeWorkflowAgentId = workflowHighlightState?.activeAgentId ?? null;
  const isWorkflowMode = workflowHighlightState?.isActive ?? false;

  const hasWorkflowAgent = group.agents.some((agent) => workflowSequenceByAgentId[agent._id] !== undefined);

  const addDefaultsForCurrentGrouping = () => {
    if (activeTagType === TAG_TYPE_ID.PHASE) {
      onAddAgent({ phase: group.id });
      return;
    }
    if (activeTagType === TAG_TYPE_ID.CATEGORY) {
      onAddAgent({ category: group.id });
      return;
    }
    if (activeTagType === TAG_TYPE_ID.STATUS) {
      const status = group.id as AgentStatus;
      // Guard in case localStorage or data gets out of sync.
      if (Object.values(AGENT_STATUS).includes(status)) {
        onAddAgent({ status });
      } else {
        onAddAgent();
      }
      return;
    }

    onAddAgent();
  };

  // Intersection Observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), groupIndex * 100);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [groupIndex]);

  // Dock view uses a different inline layout
  if (viewMode === 'dock') {
    return (
      <section
        ref={sectionRef}
        className={`agent-group agent-group--dock ${isVisible ? 'is-visible' : ''} ${isWorkflowMode && hasWorkflowAgent ? 'agent-group--workflow-focus' : ''}`}
        data-group-id={group.id}
        style={{
          '--group-color': group.color,
          '--animation-delay': `${groupIndex * 100}ms`
        } as React.CSSProperties}
      >
        {/* Inline layout: Header + Dock on same row */}
        <div className="agent-group__dock-row">
          {/* Compact header for dock view */}
          <div className="agent-group__dock-header">
            <div className="group-icon">
              <Icon name={group.icon || 'layers'} />
            </div>
            <div className="group-title">
              <h2>{group.label}</h2>
              <span className="group-subtitle">
                {group.agents.length} {group.agents.length === 1 ? 'agent' : 'agents'}
              </span>
            </div>
          </div>

          {/* Dock view inline */}
          <DockView
            agents={group.agents}
            onAgentClick={(agent) => onQuickLook ? onQuickLook(agent) : onEditAgent(agent)}
            workflowHighlightState={workflowHighlightState}
          />

          {/* Actions */}
          <div className="agent-group__actions">
            <Tooltip content={`Add agent to ${group.label}`} placement="top">
              <button
                className="btn btn--sm btn--primary"
                onClick={addDefaultsForCurrentGrouping}
              >
                <Icon name="plus" />
              </button>
            </Tooltip>
          </div>
        </div>
      </section>
    );
  }

  // Grid view - similar layout to dock view (no collapse)
  return (
    <section
      ref={sectionRef}
      className={`agent-group agent-group--grid ${isVisible ? 'is-visible' : ''} ${isWorkflowMode && hasWorkflowAgent ? 'agent-group--workflow-focus' : ''}`}
      data-group-id={group.id}
      style={{
        '--group-color': group.color,
        '--animation-delay': `${groupIndex * 100}ms`
      } as React.CSSProperties}
    >
      {/* Group Header - non-collapsible, matching dock view style */}
      <div className="agent-group__grid-header">
        <div className="agent-group__header-left">
          <div className="group-icon">
            <Icon name={group.icon || 'layers'} />
          </div>
          <div className="group-title">
            <h2>{group.label}</h2>
            <span className="group-subtitle">
              {group.agents.length} {group.agents.length === 1 ? 'agent' : 'agents'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="agent-group__actions">
          <Tooltip content={`Add agent to ${group.label}`} placement="top">
            <button
              className="btn btn--sm btn--primary"
              onClick={addDefaultsForCurrentGrouping}
            >
              <Icon name="plus" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Grid Content - always visible */}
      <div className="agent-group__content">
        <div className="agents-grid">
          {group.agents.map((agent, idx) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              index={idx}
              onEdit={() => onEditAgent(agent)}
              onDelete={() => onDeleteAgent(agent)}
              onQuickLook={() => onQuickLook?.(agent)}
              onOpenComments={() => onOpenComments?.(agent)}
              voteCounts={voteCountsByAgent[agent._id]}
              userVote={userVotesByAgent[agent._id] ?? null}
              commentCount={commentCountsByAgent[agent._id] ?? 0}
              workflowStepNumber={workflowSequenceByAgentId[agent._id]}
              isWorkflowActiveAgent={activeWorkflowAgentId === agent._id}
              isWorkflowMuted={isWorkflowMode && workflowSequenceByAgentId[agent._id] === undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
