/**
 * AgentCard component - compact 3-row card with configurable indicators
 */

'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { AgentWithOwner } from '@/types/agent';
import { getToolDisplay } from '@/utils/config';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { AvatarPopover } from '@/components/ui/AvatarPopover';
import {
  COMPACT_CARD_INDICATOR,
  getAgentStatusConfig,
  getRegulatoryRiskConfig,
  getAgentValueConfig,
  type VoteType,
  type CompactCardIndicator,
} from '@/types/validationConstants';
import { normalizeCompactCardIndicators } from '@/utils/compactIndicators';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAgentVoteActions } from '@/hooks/useAgentVoteActions';
import { useCanvas } from '@/contexts/CanvasContext';
import { getVideoPresentation } from '@/utils/video';

interface AgentCardProps {
  agent: AgentWithOwner;
  index?: number;
  onEdit: () => void;
  onDelete: () => void;
  onQuickLook?: () => void;
  onOpenComments?: () => void;
  voteCounts?: { up: number; down: number };
  userVote?: VoteType | null;
  commentCount?: number;
  workflowStepNumber?: number;
  isWorkflowActiveAgent?: boolean;
  isWorkflowMuted?: boolean;
}

function buildPromptContext(agent: AgentWithOwner, canvasDescription?: string): string {
  const normalizedCanvasDescription = canvasDescription?.trim() || 'Not provided';
  const normalizedAgentDescription = agent.description?.trim() || 'Not provided';
  const formattedJourney = agent.journeySteps.length > 0
    ? agent.journeySteps.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : 'Not provided';
  const formattedTools = agent.tools.length > 0 ? agent.tools.join(', ') : 'Not provided';

  return [
    `Canvas Description:\n${normalizedCanvasDescription}`,
    `Agent Title:\n${agent.name}`,
    `Agent Description:\n${normalizedAgentDescription}`,
    `User Journey:\n${formattedJourney}`,
    `Tools:\n${formattedTools}`,
  ].join('\n\n');
}

function buildDestinationHref(baseUrl: string, promptContext: string): string | null {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('prompt', promptContext);
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase().replace(/\s+/g, '-');
}

export function AgentCard({
  agent,
  index = 0,
  onEdit,
  onDelete,
  onQuickLook,
  onOpenComments,
  voteCounts,
  userVote,
  commentCount = 0,
  workflowStepNumber,
  isWorkflowActiveAgent = false,
  isWorkflowMuted = false,
}: AgentCardProps) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const statusColor = statusConfig.color;
  const riskConfig = getRegulatoryRiskConfig(agent.regulatoryRisk);
  const valueConfig = getAgentValueConfig(agent.value);
  const { currentCanvas } = useCanvas();
  const compactIndicators = normalizeCompactCardIndicators(currentCanvas?.compactIndicators);
  const promptContext = useMemo(
    () => buildPromptContext(agent, currentCanvas?.description),
    [agent, currentCanvas?.description]
  );
  const canvasDestinationLinks = useMemo(() => {
    const destinations = [
      {
        href: currentCanvas?.businessCaseAgentUrl,
        icon: 'briefcase',
        ariaLabel: 'Open business case agent',
      },
      {
        href: currentCanvas?.regulatoryAssessmentAgentUrl,
        icon: 'shield-check',
        ariaLabel: 'Open regulatory assessment agent',
      },
    ];

    return destinations.flatMap((destination) => {
      const normalizedHref = destination.href?.trim();
      if (!normalizedHref) return [];
      const href = buildDestinationHref(normalizedHref, promptContext);
      if (!href) return [];
      return [{ ...destination, href }];
    });
  }, [
    currentCanvas?.businessCaseAgentUrl,
    currentCanvas?.regulatoryAssessmentAgentUrl,
    promptContext,
  ]);
  const normalizedDescription = agent.description?.trim();
  const normalizedDemoLink = agent.demoLink?.trim();
  const normalizedVideoLink = agent.videoLink?.trim();
  const hasJourneySteps = agent.journeySteps.length > 0;
  const hasFormsTool = agent.tools.some((tool) => {
    const normalizedTool = normalizeToolName(tool);
    return normalizedTool === 'forms' || normalizedTool === 'form';
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [isOwnerPopoverOpen, setIsOwnerPopoverOpen] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const selectedVideoPresentation = useMemo(
    () => (videoModalUrl ? getVideoPresentation(videoModalUrl) : null),
    [videoModalUrl]
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const { toggleVote } = useAgentVoteActions(agent._id);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, closeMenu, menuOpen);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.agent-card__actions, .btn-link, a')) {
      return;
    }
    if (onQuickLook) {
      onQuickLook();
    }
  };

  const renderToolsIndicator = () => {
    if (!agent.tools || agent.tools.length === 0) {
      return <span className="agent-card__indicator-empty">No tools</span>;
    }

    return (
      <div className="agent-card__indicator-tools">
        {agent.tools.slice(0, 4).map((tool) => {
          const toolDisplay = getToolDisplay(tool);
          return (
            <span
              key={tool}
              className="tool-dot"
              style={{ backgroundColor: toolDisplay.color }}
              title={toolDisplay.label}
            />
          );
        })}
        {agent.tools.length > 4 && (
          <span className="agent-card__indicator-count">+{agent.tools.length - 4}</span>
        )}
      </div>
    );
  };

  const renderDotWithLabel = (color: string, shortLabel: string, fullLabel: string) => (
    <Tooltip content={fullLabel} placement="top">
      <span className="agent-card__dot-label">
        <span className="agent-card__indicator-dot" style={{ backgroundColor: color }} />
        <span className="agent-card__indicator-label">{shortLabel}</span>
      </span>
    </Tooltip>
  );

  const renderIndicator = (indicator: CompactCardIndicator) => {
    if (indicator === COMPACT_CARD_INDICATOR.TOOLS) {
      return renderToolsIndicator();
    }

    if (indicator === COMPACT_CARD_INDICATOR.STATUS) {
      if (!agent.status) {
        return <span className="agent-card__indicator-empty">No status</span>;
      }
      return renderDotWithLabel(statusConfig.color, statusConfig.shortLabel, statusConfig.label);
    }

    if (indicator === COMPACT_CARD_INDICATOR.REGULATORY_RISK) {
      if (!agent.regulatoryRisk) {
        return <span className="agent-card__indicator-empty">No risk</span>;
      }
      return renderDotWithLabel(riskConfig.color, riskConfig.shortLabel, `Risk: ${riskConfig.label}`);
    }

    if (!agent.value) {
      return <span className="agent-card__indicator-empty">No value</span>;
    }
    return renderDotWithLabel(valueConfig.color, valueConfig.shortLabel, `Value: ${valueConfig.label}`);
  };

  return (
    <div
      className={[
        'agent-card',
        onQuickLook ? 'agent-card--clickable' : '',
        workflowStepNumber !== undefined ? 'agent-card--workflow' : '',
        isWorkflowActiveAgent ? 'agent-card--workflow-active' : '',
        isWorkflowMuted ? 'agent-card--workflow-muted' : '',
        isOwnerPopoverOpen ? 'agent-card--owner-popover-open' : '',
      ].filter(Boolean).join(' ')}
      data-agent-id={agent._id}
      onClick={handleCardClick}
      tabIndex={-1}
      style={{
        '--status-color': statusColor,
        '--animation-delay': `${index * 50}ms`,
      } as React.CSSProperties}
    >
      {workflowStepNumber !== undefined && (
        <span className="agent-card__workflow-step">
          Step {workflowStepNumber}
        </span>
      )}

      <div
        className="agent-card__status-strip"
        style={{ backgroundColor: statusColor }}
      />

      <div className="agent-card__header">
        <span className="agent-card__number">
          {(agent.agentOrder ?? 0) + 1}
        </span>

        <div className="agent-card__actions" ref={menuRef}>
          <button
            className="agent-card__menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <Icon name="more-vertical" />
          </button>
          {menuOpen && (
            <div className="agent-card__dropdown">
              {onQuickLook && (
                <button
                  className="agent-card__dropdown-item"
                  onClick={() => { onQuickLook(); setMenuOpen(false); }}
                >
                  <Icon name="eye" />
                  Quick Look
                </button>
              )}
              <button
                className="agent-card__dropdown-item"
                onClick={() => { onEdit(); setMenuOpen(false); }}
              >
                <Icon name="edit-3" />
                Edit
              </button>
              <button
                className="agent-card__dropdown-item agent-card__dropdown-item--danger"
                onClick={() => { onDelete(); setMenuOpen(false); }}
              >
                <Icon name="trash-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <Tooltip content={agent.name} placement="top" showOnlyWhenTruncated>
        <h3 className="agent-card__name">{agent.name}</h3>
      </Tooltip>

      {normalizedDescription && (
        <div className="agent-card__description-wrapper">
          <p className="agent-card__description">{normalizedDescription}</p>
          <div className="agent-card__description-tooltip">{normalizedDescription}</div>
        </div>
      )}

      <div className="agent-card__meta-row">
        {agent.owner ? (
          <AvatarPopover
            src={agent.owner.avatarUrl}
            alt={agent.owner.name}
            name={agent.owner.name}
            title={agent.owner.title}
            size="xs"
            className="agent-card__compact-avatar"
            onOpenChange={setIsOwnerPopoverOpen}
          />
        ) : (
          <span className="agent-card__compact-avatar agent-card__compact-avatar--placeholder">
            <Icon name="user" />
          </span>
        )}

        <div className="agent-card__indicators">
          {compactIndicators.map((indicator) => (
            <span key={indicator} className="agent-card__indicator-slot">
              {renderIndicator(indicator)}
            </span>
          ))}
        </div>

      </div>

      <div className="agent-card__footer">
        {(hasFormsTool || normalizedDemoLink || normalizedVideoLink || hasJourneySteps || canvasDestinationLinks.length > 0) && (
          <>
          {hasFormsTool && (
            <Tooltip content="Uses Forms tool" placement="top">
              <button
                type="button"
                className="agent-card__footer-icon"
                aria-label="Uses Forms tool"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="file-input" />
              </button>
            </Tooltip>
          )}

          {normalizedDemoLink && (
            <Tooltip content="Watch demo" placement="top">
              <button
                type="button"
                className="agent-card__footer-icon"
                aria-label="Watch demo in modal"
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoModalUrl(normalizedDemoLink);
                }}
              >
                <Icon name="play-circle" />
              </button>
            </Tooltip>
          )}

          {normalizedVideoLink && (
            <Tooltip content="Watch video" placement="top">
              <button
                type="button"
                className="agent-card__footer-icon"
                aria-label="Watch video in modal"
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoModalUrl(normalizedVideoLink);
                }}
              >
                <Icon name="video" />
              </button>
            </Tooltip>
          )}

          {hasJourneySteps && (
            <div className="agent-card__journey">
              <button
                type="button"
                className="agent-card__footer-icon"
                aria-label="View user journey steps"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="route" />
              </button>
              <div className="agent-card__journey-tooltip">
                <div className="journey-tooltip__title">User Journey</div>
                <ol className="journey-tooltip__steps">
                  {agent.journeySteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {canvasDestinationLinks.map((link) => (
            <Tooltip key={link.ariaLabel} content={link.ariaLabel} placement="top">
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="agent-card__footer-icon"
                aria-label={link.ariaLabel}
                onClick={(e) => e.stopPropagation()}
              >
                  <Icon name={link.icon} />
                </a>
              </Tooltip>
            ))}
          </>
        )}

        <div className="agent-card__feedback-bar">
          <button
            type="button"
            className={`agent-card__vote-btn agent-card__vote-btn--up ${userVote === 'up' ? 'agent-card__vote-btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleVote('up', userVote); }}
            aria-label={userVote === 'up' ? 'Remove upvote' : 'Upvote'}
          >
            <Icon name="thumbs-up" />
            {voteCounts && voteCounts.up > 0 && <span>{voteCounts.up}</span>}
          </button>
          <button
            type="button"
            className={`agent-card__vote-btn agent-card__vote-btn--down ${userVote === 'down' ? 'agent-card__vote-btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleVote('down', userVote); }}
            aria-label={userVote === 'down' ? 'Remove downvote' : 'Downvote'}
          >
            <Icon name="thumbs-down" />
            {voteCounts && voteCounts.down > 0 && <span>{voteCounts.down}</span>}
          </button>
          <button
            type="button"
            className="agent-card__comment-btn"
            onClick={(e) => { e.stopPropagation(); onOpenComments?.(); }}
            aria-label="View comments"
          >
            <Icon name="message-circle" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
        </div>
      </div>

      <Modal
        isOpen={Boolean(videoModalUrl && selectedVideoPresentation)}
        onClose={() => setVideoModalUrl(null)}
        title="Demo video"
        size="large"
      >
        {videoModalUrl && selectedVideoPresentation && (
          <div className="video-modal">
            <div className="video-modal__frame-wrap">
              {selectedVideoPresentation.type === 'native' ? (
                <video src={selectedVideoPresentation.src} controls autoPlay playsInline />
              ) : (
                <iframe
                  src={selectedVideoPresentation.src}
                  title="Demo video player"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
            <a
              href={videoModalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="video-modal__external-link"
            >
              <Icon name="external-link" />
              Open in new tab
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
