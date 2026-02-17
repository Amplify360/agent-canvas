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
import { useQuery, useAction } from '@/hooks/useConvex';
import { api } from '../../../convex/_generated/api';
import { useAppState } from '@/contexts/AppStateContext';

interface MainToolbarProps {
  onAddAgent: () => void;
}

export function MainToolbar({ onAddAgent }: MainToolbarProps) {
  const { currentCanvas, currentCanvasId } = useCanvas();
  const { agents } = useAgents();
  const { currentOrgId } = useAuth();
  const { showToast } = useAppState();
  const { activeTagType, setActiveTagType, viewMode, setViewMode } = useGrouping();
  const [isGroupingOpen, setIsGroupingOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const groupingDropdownRef = useRef<HTMLDivElement>(null);

  const closeGrouping = useCallback(() => setIsGroupingOpen(false), []);
  useClickOutside(groupingDropdownRef, closeGrouping, isGroupingOpen);

  // Check if users exist (lab feature)
  const existingUsers = useQuery(
    api.users.list,
    currentOrgId ? { workosOrgId: currentOrgId } : 'skip'
  ) || [];
  const seedUsers = useAction(api.users.seedSampleUsers);

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
      await seedUsers({ workosOrgId: currentOrgId, count: 20 });
      showToast('Seeded 20 demo users successfully', 'success');
    } catch (error) {
      console.error('Failed to seed users:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to seed users: ${message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar__left">
        <h1 className="toolbar__title">{currentCanvas?.title || ''}</h1>
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
        {/* Lab feature: Seed demo users if none exist */}
        {existingUsers.length === 0 && (
          <Tooltip content="Add sample users with avatars for demo" placement="bottom">
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
        )}
      </div>

      <div className="toolbar__right">
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
      </div>
    </header>
  );
}
