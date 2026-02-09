/**
 * MainToolbar - Top toolbar with canvas title, grouping controls, actions
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useGrouping } from '@/contexts/GroupingContext';
import { useAgents } from '@/contexts/AgentContext';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { TAG_TYPES } from '@/utils/config';
import { useClickOutside } from '@/hooks/useClickOutside';

interface MainToolbarProps {
  onAddAgent: () => void;
}

export function MainToolbar({ onAddAgent }: MainToolbarProps) {
  const { currentCanvas, currentCanvasId } = useCanvas();
  const { agents } = useAgents();
  const { activeTagType, setActiveTagType, viewMode, setViewMode } = useGrouping();
  const [isGroupingOpen, setIsGroupingOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const groupingDropdownRef = useRef<HTMLDivElement>(null);

  const closeGrouping = useCallback(() => setIsGroupingOpen(false), []);
  useClickOutside(groupingDropdownRef, closeGrouping, isGroupingOpen);

  const activeTag = TAG_TYPES[activeTagType as keyof typeof TAG_TYPES];

  const handleShare = async () => {
    if (!currentCanvasId) return;
    const url = `${window.location.origin}/c/${currentCanvasId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
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
