/**
 * DockView - Flat dock display with carousel for agent details
 *
 * Shows agents as compact icons in a row. Click an agent or use
 * carousel controls to view expanded details one at a time.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { AgentWithOwner } from '@/types/agent';
import { getToolDisplay } from '@/utils/config';
import {
  COMPACT_CARD_INDICATOR,
  getAgentStatusConfig,
  getRegulatoryRiskConfig,
  getAgentValueConfig,
  type CompactCardIndicator,
} from '@/types/validationConstants';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { AvatarPopover } from '@/components/ui/AvatarPopover';
import { Modal } from '@/components/ui/Modal';
import { useCanvas } from '@/contexts/CanvasContext';
import { normalizeCompactCardIndicators } from '@/utils/compactIndicators';
import { getVideoPresentation } from '@/utils/video';
import type { WorkflowHighlightState } from '@/types/workflow';

interface DockViewProps {
  agents: AgentWithOwner[];
  onAgentClick: (agent: AgentWithOwner) => void;
  workflowHighlightState?: WorkflowHighlightState;
}

export function DockView({ agents, onAgentClick, workflowHighlightState }: DockViewProps) {
  const { currentCanvas } = useCanvas();
  const compactIndicators = normalizeCompactCardIndicators(currentCanvas?.compactIndicators);

  // Track by agent ID for stability with real-time updates
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const workflowSequenceByAgentId = workflowHighlightState?.sequenceByAgentId ?? {};
  const activeWorkflowAgentId = workflowHighlightState?.activeAgentId ?? null;
  const isWorkflowMode = workflowHighlightState?.isActive ?? false;
  const selectedVideoPresentation = useMemo(
    () => (videoModalUrl ? getVideoPresentation(videoModalUrl) : null),
    [videoModalUrl]
  );

  // Derive index and agent from ID
  const selectedIndex = selectedAgentId
    ? agents.findIndex(a => a._id === selectedAgentId)
    : -1;
  const selectedAgent = selectedIndex >= 0 ? agents[selectedIndex] : null;

  // Reset selection if agent no longer exists (e.g., deleted by another user)
  useEffect(() => {
    if (selectedAgentId && !agents.some(a => a._id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId]);

  const handlePrev = () => {
    if (selectedIndex < 0) return;
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : agents.length - 1;
    setSelectedAgentId(agents[newIndex]._id);
  };

  const handleNext = () => {
    if (selectedIndex < 0) return;
    const newIndex = selectedIndex < agents.length - 1 ? selectedIndex + 1 : 0;
    setSelectedAgentId(agents[newIndex]._id);
  };

  const handleItemClick = (agent: AgentWithOwner) => {
    setSelectedAgentId(selectedAgentId === agent._id ? null : agent._id);
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, agent: AgentWithOwner) => {
    if ((event.target as HTMLElement).closest('.dock-item__inline-action')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleItemClick(agent);
  };

  const handleClose = () => {
    setSelectedAgentId(null);
  };

  const renderDotWithLabel = (color: string, shortLabel: string, title: string) => (
    <span className="dock-item__dot-label" title={title}>
      <span className="dock-item__indicator-dot" style={{ backgroundColor: color }} />
      <span>{shortLabel}</span>
    </span>
  );

  const renderIndicator = (agent: AgentWithOwner, indicator: CompactCardIndicator) => {
    if (indicator === COMPACT_CARD_INDICATOR.TOOLS) {
      if (agent.tools.length === 0) {
        return <span className="dock-item__indicator-empty">No tools</span>;
      }
      return (
        <span className="dock-item__indicator-tools">
          {agent.tools.slice(0, 3).map((tool: string) => {
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
          {agent.tools.length > 3 && (
            <span className="dock-item__indicator-count">+{agent.tools.length - 3}</span>
          )}
        </span>
      );
    }

    if (indicator === COMPACT_CARD_INDICATOR.STATUS) {
      if (!agent.status) {
        return <span className="dock-item__indicator-empty">No status</span>;
      }
      const status = getAgentStatusConfig(agent.status);
      return renderDotWithLabel(status.color, status.shortLabel, status.label);
    }

    if (indicator === COMPACT_CARD_INDICATOR.REGULATORY_RISK) {
      if (!agent.regulatoryRisk) {
        return <span className="dock-item__indicator-empty">No risk</span>;
      }
      const risk = getRegulatoryRiskConfig(agent.regulatoryRisk);
      return renderDotWithLabel(risk.color, risk.shortLabel, `Risk: ${risk.label}`);
    }

    if (!agent.value) {
      return <span className="dock-item__indicator-empty">No value</span>;
    }
    const value = getAgentValueConfig(agent.value);
    return renderDotWithLabel(value.color, value.shortLabel, `Value: ${value.label}`);
  };

  return (
    <div className="dock-view">
      {/* Flat dock - all agents as compact icons */}
      <div className="dock-view__track">
        {agents.map((agent, index) => {
          const statusConfig = getAgentStatusConfig(agent.status);
          const isSelected = selectedAgentId === agent._id;
          const demoVideoUrl = agent.videoLink?.trim() || agent.demoLink?.trim();
          const normalizedObjective = agent.objective?.trim();

          return (
            <div
              key={agent._id}
              className={[
                'dock-item',
                isSelected ? 'dock-item--selected' : '',
                workflowSequenceByAgentId[agent._id] !== undefined ? 'dock-item--workflow' : '',
                activeWorkflowAgentId === agent._id ? 'dock-item--workflow-active' : '',
                isWorkflowMode && workflowSequenceByAgentId[agent._id] === undefined ? 'dock-item--workflow-muted' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleItemClick(agent)}
              onKeyDown={(event) => handleItemKeyDown(event, agent)}
              data-agent-id={agent._id}
              role="button"
              tabIndex={0}
            >
              <span className="dock-item__order">
                {(agent.agentOrder ?? index) + 1}
              </span>
              {workflowSequenceByAgentId[agent._id] !== undefined && (
                <span className="dock-item__workflow-step">
                  {workflowSequenceByAgentId[agent._id]}
                </span>
              )}
              <div className="dock-item__top-right">
                <span
                  className="dock-item__status-dot"
                  style={{ backgroundColor: statusConfig.color }}
                />
                {(normalizedObjective || demoVideoUrl) && (
                  <div className="dock-item__quick-actions">
                    {normalizedObjective && (
                      <Tooltip content={normalizedObjective} placement="top">
                        <button
                          type="button"
                          className="dock-item__inline-action dock-item__objective-link"
                          aria-label="View objective"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Icon name="target" />
                        </button>
                      </Tooltip>
                    )}
                    {demoVideoUrl && (
                      <button
                        type="button"
                        className="dock-item__inline-action dock-item__video-link"
                        aria-label="Open demo video in modal"
                        title="Open demo video"
                        onClick={(event) => {
                          event.stopPropagation();
                          setVideoModalUrl(demoVideoUrl);
                        }}
                      >
                        <Icon name="video" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="dock-item__icon">
                {agent.owner ? (
                  <AvatarPopover
                    src={agent.owner.avatarUrl}
                    alt={agent.owner.name}
                    name={agent.owner.name}
                    title={agent.owner.title}
                    size="sm"
                  />
                ) : (
                  <Icon name="bot" />
                )}
              </div>
              <span className="dock-item__compact-name">
                {agent.name}
              </span>
              <div className="dock-item__indicators">
                {compactIndicators.map((indicator) => (
                  <span key={indicator} className="dock-item__indicator-slot">
                    {renderIndicator(agent, indicator)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Carousel - expanded view of selected agent */}
      {selectedAgent && (() => {
        const selectedStatusConfig = getAgentStatusConfig(selectedAgent.status);
        return (
        <div className="dock-carousel">
          <button
            className="dock-carousel__nav dock-carousel__nav--prev"
            onClick={handlePrev}
            aria-label="Previous agent"
          >
            <Icon name="chevron-left" />
          </button>

          <div className="dock-carousel__card">
            <button
              className="dock-carousel__close"
              onClick={handleClose}
              aria-label="Close"
            >
              <Icon name="x" />
            </button>

            <div className="dock-carousel__header">
              <span className="dock-carousel__order">
                {(selectedAgent.agentOrder ?? selectedIndex) + 1}
              </span>
              <span
                className="dock-carousel__status"
                style={{
                  backgroundColor: selectedStatusConfig.bgColor,
                  color: selectedStatusConfig.color
                }}
              >
                {selectedStatusConfig.label}
              </span>
              <span className="dock-carousel__counter">
                {selectedIndex + 1} of {agents.length}
              </span>
            </div>

            <h3 className="dock-carousel__name">{selectedAgent.name}</h3>

            {selectedAgent.objective && (
              <p className="dock-carousel__objective">{selectedAgent.objective}</p>
            )}

            <div className="dock-carousel__tools">
              {selectedAgent.tools.map((tool: string) => {
                const toolDisplay = getToolDisplay(tool);
                return (
                  <span
                    key={tool}
                    className="dock-carousel__tool"
                    style={{ backgroundColor: toolDisplay.color }}
                  >
                    {toolDisplay.label}
                  </span>
                );
              })}
            </div>

            <button
              className="dock-carousel__action"
              onClick={() => onAgentClick(selectedAgent)}
            >
              <Icon name="external-link" />
              View Details
            </button>
          </div>

          <button
            className="dock-carousel__nav dock-carousel__nav--next"
            onClick={handleNext}
            aria-label="Next agent"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
        );
      })()}

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
