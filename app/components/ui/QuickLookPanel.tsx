/**
 * QuickLookPanel - Slide-out panel for viewing agent details
 * Shows full agent information without opening the edit modal
 */

'use client';

import React from 'react';
import { Agent } from '@/types/agent';
import { getToolDisplay, getToolColorClass } from '@/utils/config';
import { formatCurrency } from '@/utils/formatting';
import { Icon } from '@/components/ui/Icon';
import { getAgentStatusConfig } from '@/types/validationConstants';
import { getAgentLegacyFields } from '@/utils/agentModel';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface QuickLookPanelProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Whether clicking outside the panel closes it. Defaults to false to prevent accidental closure. */
  closeOnOverlayClick?: boolean;
}

export function QuickLookPanel({
  agent,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  closeOnOverlayClick = false
}: QuickLookPanelProps) {
  useEscapeKey(isOpen, onClose);
  useBodyScrollLock(isOpen);

  if (!agent) return null;

  const resolvedFields = getAgentLegacyFields(agent);
  const statusConfig = getAgentStatusConfig(resolvedFields.status);
  const metrics = resolvedFields.metrics || {};

  return (
    <div
      className={`quick-look-overlay ${isOpen ? 'is-open' : ''}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      {/* Modal */}
      <div
        className={`quick-look-panel ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Agent details: ${agent.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="quick-look-panel__header">
          <div className="quick-look-panel__title-group">
            <span className="quick-look-panel__number">
              {(agent.agentOrder ?? 0) + 1}
            </span>
            <h2 className="quick-look-panel__name">{agent.name}</h2>
            <div className="quick-look-panel__meta">
              {resolvedFields.category && (
                <span className="quick-look-panel__category">
                  <Icon name="folder" />
                  {resolvedFields.category}
                </span>
              )}
              {agent.phase && (
                <span className="quick-look-panel__phase">
                  <Icon name="milestone" />
                  {agent.phase}
                </span>
              )}
              <span
                className="quick-look-panel__status"
                style={{ color: statusConfig.color, backgroundColor: statusConfig.bgColor }}
              >
                <span className="status-dot" style={{ backgroundColor: statusConfig.color }} />
                {statusConfig.label}
              </span>
            </div>
          </div>
          <button
            className="quick-look-panel__close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <Icon name="x" />
          </button>
        </header>

        {/* Body */}
        <div className="quick-look-panel__body">
          {/* Objective */}
          {resolvedFields.objective && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="target" />
                Objective
              </h3>
              <p className="quick-look-panel__objective">{resolvedFields.objective}</p>
            </section>
          )}

          {/* Description */}
          {resolvedFields.description && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="file-text" />
                Description
              </h3>
              <p className="quick-look-panel__description">{resolvedFields.description}</p>
            </section>
          )}

          {/* Tools / Capabilities */}
          {resolvedFields.tools && resolvedFields.tools.length > 0 && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="wrench" />
                Capabilities
              </h3>
              <div className="quick-look-panel__tools">
                {resolvedFields.tools.map((tool) => {
                  const toolDisplay = getToolDisplay(tool);
                  const colorClass = getToolColorClass(toolDisplay.color);
                  return (
                    <span
                      key={tool}
                      className={`chip tool-chip tool-chip--${colorClass}`}
                      style={{ '--chip-accent': toolDisplay.color } as React.CSSProperties}
                    >
                      <Icon name={toolDisplay.icon} />
                      {toolDisplay.label}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Journey Steps */}
          {resolvedFields.journeySteps && resolvedFields.journeySteps.length > 0 && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="route" />
                Journey Steps
              </h3>
              <div className="quick-look-panel__journey">
                {resolvedFields.journeySteps.map((step, idx) => (
                  <div key={idx} className="quick-look-panel__journey-step">
                    <span className="quick-look-panel__journey-step-number">{idx + 1}</span>
                    <span className="quick-look-panel__journey-step-text">{step}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metrics */}
          {(metrics.numberOfUsers !== undefined || metrics.timesUsed !== undefined ||
            metrics.timeSaved !== undefined || metrics.roi !== undefined) && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="bar-chart-2" />
                Performance
              </h3>
              <div className="quick-look-panel__metrics">
                {metrics.numberOfUsers !== undefined && (
                  <div className="quick-look-panel__metric">
                    <span className="quick-look-panel__metric-label">
                      <Icon name="users" />
                      Users
                    </span>
                    <span className="quick-look-panel__metric-value">{metrics.numberOfUsers}</span>
                  </div>
                )}
                {metrics.timesUsed !== undefined && (
                  <div className="quick-look-panel__metric">
                    <span className="quick-look-panel__metric-label">
                      <Icon name="activity" />
                      Times Used
                    </span>
                    <span className="quick-look-panel__metric-value">{metrics.timesUsed}</span>
                  </div>
                )}
                {metrics.timeSaved !== undefined && (
                  <div className="quick-look-panel__metric">
                    <span className="quick-look-panel__metric-label">
                      <Icon name="clock" />
                      Time Saved
                    </span>
                    <span className="quick-look-panel__metric-value">{metrics.timeSaved}h</span>
                  </div>
                )}
                {metrics.roi !== undefined && (
                  <div className="quick-look-panel__metric">
                    <span className="quick-look-panel__metric-label">
                      <Icon name="trending-up" />
                      ROI
                    </span>
                    <span className="quick-look-panel__metric-value">{formatCurrency(metrics.roi)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Links */}
          {(resolvedFields.demoLink || resolvedFields.videoLink) && (
            <section className="quick-look-panel__section">
              <h3 className="quick-look-panel__section-title">
                <Icon name="link" />
                Resources
              </h3>
              <div className="quick-look-panel__links">
                {resolvedFields.demoLink && (
                  <a
                    href={resolvedFields.demoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-look-panel__link"
                  >
                    <Icon name="external-link" />
                    <span>View Demo</span>
                  </a>
                )}
                {resolvedFields.videoLink && (
                  <a
                    href={resolvedFields.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-look-panel__link"
                  >
                    <Icon name="play-circle" />
                    <span>Watch Video</span>
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="quick-look-panel__footer">
          <button
            className="btn btn--secondary"
            onClick={onDelete}
          >
            <Icon name="trash-2" />
            Delete
          </button>
          <button
            className="btn btn--primary"
            onClick={onEdit}
          >
            <Icon name="edit-3" />
            Edit Agent
          </button>
        </footer>
      </div>
    </div>
  );
}
