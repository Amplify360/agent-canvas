/**
 * WorkflowTourCallout - anchored callout for the active workflow step.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { ResolvedWorkflowStep } from '@/types/workflow';

interface WorkflowTourCalloutProps {
  isOpen: boolean;
  workflowName: string;
  step: ResolvedWorkflowStep | null;
  stepIndex: number;
  stepCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

interface CalloutPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
}

function findAgentElement(agentId: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-agent-id]'));
  return all.find((el) => el.dataset.agentId === agentId) ?? null;
}

export function WorkflowTourCallout({
  isOpen,
  workflowName,
  step,
  stepIndex,
  stepCount,
  onPrevious,
  onNext,
  onClose,
}: WorkflowTourCalloutProps) {
  const calloutRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CalloutPosition | null>(null);

  useEscapeKey(isOpen, onClose);

  const activeAgentId = step?.agent._id ?? null;
  const canGoPrevious = stepIndex > 0;
  const canGoNext = stepIndex < stepCount - 1;

  const updatePosition = useCallback(() => {
    if (!isOpen || !activeAgentId || !calloutRef.current) {
      setPosition(null);
      return;
    }

    const targetEl = findAgentElement(activeAgentId);
    if (!targetEl) {
      setPosition(null);
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const calloutRect = calloutRef.current.getBoundingClientRect();

    const gap = 14;
    const viewportPadding = 12;
    const fitsBelow = targetRect.bottom + gap + calloutRect.height <= window.innerHeight - viewportPadding;
    const top = fitsBelow
      ? targetRect.bottom + gap
      : Math.max(viewportPadding, targetRect.top - calloutRect.height - gap);

    const preferredLeft = targetRect.left + (targetRect.width / 2) - (calloutRect.width / 2);
    const maxLeft = window.innerWidth - calloutRect.width - viewportPadding;
    const left = Math.min(Math.max(viewportPadding, preferredLeft), Math.max(viewportPadding, maxLeft));
    const arrowLeft = Math.min(
      calloutRect.width - 20,
      Math.max(20, targetRect.left + (targetRect.width / 2) - left)
    );

    setPosition({
      top,
      left,
      placement: fitsBelow ? 'top' : 'bottom',
      arrowLeft,
    });
  }, [activeAgentId, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeAgentId) return;

    const targetEl = findAgentElement(activeAgentId);
    if (!targetEl) return;

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    targetEl.focus({ preventScroll: true });

    const id = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(id);
  }, [activeAgentId, isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleWindowChange = () => updatePosition();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, updatePosition]);

  const journeySteps = useMemo(() => step?.agent.journeySteps ?? [], [step]);

  if (!isOpen || !step) return null;

  return (
    <div
      ref={calloutRef}
      className={`workflow-tour-callout workflow-tour-callout--${position?.placement ?? 'top'}`}
      style={
        position
          ? {
            top: `${position.top}px`,
            left: `${position.left}px`,
            '--workflow-arrow-left': `${position.arrowLeft}px`,
          } as CSSProperties
          : {
            top: '-9999px',
            left: '-9999px',
          }
      }
      role="dialog"
      aria-label="Workflow step details"
    >
      <div className="workflow-tour-callout__header">
        <div className="workflow-tour-callout__title-block">
          <span className="workflow-tour-callout__workflow">{workflowName}</span>
          <strong>{step.label}</strong>
          <span className="workflow-tour-callout__agent">{step.agent.name}</span>
        </div>
        <span className="workflow-tour-callout__counter">
          {stepIndex + 1}/{stepCount}
        </span>
      </div>

      <div className="workflow-tour-callout__body">
        <section className="workflow-tour-callout__section">
          <h4>Inputs</h4>
          <ul>
            {step.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </section>
        <section className="workflow-tour-callout__section">
          <h4>User Journey</h4>
          <ul>
            {journeySteps.length > 0 ? journeySteps.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            )) : <li>No journey steps defined on this agent yet.</li>}
          </ul>
        </section>
        <section className="workflow-tour-callout__section">
          <h4>Outputs</h4>
          <ul>
            {step.outputs.map((output) => (
              <li key={output}>{output}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="workflow-tour-callout__actions">
        <button
          type="button"
          className="workflow-tour-callout__action"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous step"
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          className="workflow-tour-callout__action"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next step"
        >
          <Icon name="chevron-right" />
        </button>
        <button
          type="button"
          className="workflow-tour-callout__action"
          onClick={onClose}
          aria-label="Close workflow mode"
        >
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}
