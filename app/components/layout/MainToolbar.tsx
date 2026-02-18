/**
 * MainToolbar - Top toolbar with canvas title, grouping controls, actions
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useGrouping } from '@/contexts/GroupingContext';
import { useAgents } from '@/contexts/AgentContext';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { TAG_TYPES } from '@/utils/config';
import { useClickOutside } from '@/hooks/useClickOutside';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useQuery, useAction, useCanQuery } from '@/hooks/useConvex';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useAppState } from '@/contexts/AppStateContext';

interface MainToolbarProps {
  onAddAgent: () => void;
  onOpenWorkflowPrompt: () => void;
  onCloseWorkflow: () => void;
  isWorkflowActive: boolean;
}

export function MainToolbar({
  onAddAgent,
  onOpenWorkflowPrompt,
  onCloseWorkflow,
  isWorkflowActive,
}: MainToolbarProps) {
  const { currentCanvas, currentCanvasId } = useCanvas();
  const { agents } = useAgents();
  const { currentOrgId } = useAuth();
  const { showToast } = useAppState();
  const { activeTagType, setActiveTagType, viewMode, setViewMode } = useGrouping();
  const [isGroupingOpen, setIsGroupingOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const groupingDropdownRef = useRef<HTMLDivElement>(null);
  const { canQuery } = useCanQuery();

  const closeGrouping = useCallback(() => setIsGroupingOpen(false), []);
  useClickOutside(groupingDropdownRef, closeGrouping, isGroupingOpen);

  // Check if users exist (lab feature) — gated on Convex auth readiness
  const existingUsers = useQuery(
    api.users.list,
    canQuery && currentOrgId ? { workosOrgId: currentOrgId } : 'skip'
  ) || [];
  const seedUsers = useAction(api.users.seedSampleUsers);
  const assignMissingOwners = useAction(api.users.assignMissingOwners);

  const activeTag = TAG_TYPES[activeTagType as keyof typeof TAG_TYPES];

  const handleShare = async () => {
    if (!currentCanvasId) return;
    const url = `${window.location.origin}/c/${currentCanvasId}`;
    const ok = await copyTextToClipboard(url);
    if (!ok) return;
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleSeedUsers = async () => {
    if (!currentOrgId || isSeeding) return;
    setIsSeeding(true);
    try {
      const result = await seedUsers({ workosOrgId: currentOrgId, count: 20 });
      showToast(
        `Seeded ${result.count} users and assigned owners to ${result.agentsAssigned} agents`,
        'success'
      );
    } catch (error) {
      console.error('Failed to seed users:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to seed users: ${message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAssignOwners = async () => {
    if (!currentCanvasId || isSeeding) return;
    setIsSeeding(true);
    try {
      const result = await assignMissingOwners({ canvasId: currentCanvasId as Id<"canvases"> });
      showToast(
        result.agentsAssigned > 0
          ? `Assigned owners to ${result.agentsAssigned} agents`
          : 'All agents already have owners',
        'success'
      );
    } catch (error) {
      console.error('Failed to assign owners:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to assign owners: ${message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar__left">
        <div className="toolbar__title-group">
          <h1 className="toolbar__title">{currentCanvas?.title || ''}</h1>
          {currentCanvas?.description?.trim() && (
            <p className="toolbar__description" title={currentCanvas.description}>
              {currentCanvas.description}
            </p>
          )}
        </div>
        <Tooltip content="Copy link to canvas" placement="bottom">
          <button
            type="button"
            className="icon-btn icon-btn--ghost"
            onClick={handleShare}
            disabled={!currentCanvasId}
          >
            <Icon name={showCopied ? 'check' : 'share-2'} />
            {showCopied && <span className="toolbar__copied-badge">Copied!</span>}
          </button>
        </Tooltip>
        <span className="toolbar__badge">
          <Icon name="bot" />
          <span>{agents.length} Agents</span>
        </span>
        {/* Lab feature: Seed demo users or assign owners to unassigned agents */}
        {existingUsers.length === 0 ? (
          <Tooltip content="Add 20 sample users with avatars and assign as agent owners" placement="bottom">
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={handleSeedUsers}
              disabled={isSeeding}
            >
              <Icon name="users" />
              <span>{isSeeding ? 'Seeding...' : 'Seed Demo Users'}</span>
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Assign existing demo users as owners to any unassigned agents" placement="bottom">
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={handleAssignOwners}
              disabled={isSeeding || !currentCanvasId}
            >
              <Icon name="user-check" />
              <span>{isSeeding ? 'Assigning...' : 'Assign Owners'}</span>
            </button>
          </Tooltip>
        )}
      </div>

      <div className="toolbar__right">
        <Tooltip content="Open workflow guide" placement="bottom">
          <button
            type="button"
            className={`btn btn--sm workflow-launch-btn ${isWorkflowActive ? 'workflow-launch-btn--active' : ''}`}
            onClick={onOpenWorkflowPrompt}
          >
            <Icon name="sparkles" />
            <span>What do you want to do?</span>
          </button>
        </Tooltip>

        {/* Grouping Control */}
        <div className="toolbar__control" ref={groupingDropdownRef}>
          <span className="toolbar__control-label">Group by</span>
          <button
            type="button"
            className="toolbar__control-btn"
            onClick={() => setIsGroupingOpen(!isGroupingOpen)}
          >
            <span>{activeTag?.label || 'Phase'}</span>
            <Icon name="chevron-down" />
          </button>
          <div className={`toolbar__dropdown ${isGroupingOpen ? 'open' : ''}`}>
            {Object.values(TAG_TYPES).map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`toolbar__dropdown-item ${activeTagType === tag.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTagType(tag.id);
                  setIsGroupingOpen(false);
                }}
              >
                <Icon name={tag.icon} />
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-toggle__btn ${viewMode === 'dock' ? 'is-active' : ''}`}
            onClick={() => setViewMode('dock')}
            aria-pressed={viewMode === 'dock'}
          >
            <Icon name="rows-3" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`view-mode-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
          >
            <Icon name="layout-grid" />
            <span>Detail</span>
          </button>
        </div>

        {/* Add Agent Button */}
        <button type="button" className="btn btn--primary" onClick={onAddAgent}>
          <Icon name="plus" />
          <span>Add Agent</span>
        </button>

        {isWorkflowActive && (
          <Tooltip content="Exit workflow mode" placement="bottom">
            <button type="button" className="icon-btn" onClick={onCloseWorkflow} aria-label="Exit workflow mode">
              <Icon name="x" />
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
