/**
 * WorkflowPromptOverlay - centered prompt input for workflow selection.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface WorkflowPromptOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export function WorkflowPromptOverlay({
  isOpen,
  onClose,
  onSubmit,
}: WorkflowPromptOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');

  useEscapeKey(isOpen, onClose);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setPrompt('');
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = prompt.trim();
    if (!normalized) return;
    onSubmit(normalized);
  };

  return (
    <div className="workflow-prompt-overlay" onClick={onClose} role="presentation">
      <form
        className="workflow-prompt"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        aria-label="Workflow prompt"
      >
        <div className="workflow-prompt__header">
          <span className="workflow-prompt__eyebrow">
            <Icon name="sparkles" />
            Workflow Guide
          </span>
          <button
            type="button"
            className="workflow-prompt__close"
            onClick={onClose}
            aria-label="Close workflow prompt"
          >
            <Icon name="x" />
          </button>
        </div>
        <label htmlFor="workflow-prompt-input" className="workflow-prompt__label">
          What do you want to do?
        </label>
        <input
          id="workflow-prompt-input"
          ref={inputRef}
          className="workflow-prompt__input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the objective..."
          autoComplete="off"
        />
        <div className="workflow-prompt__footer">
          <span className="workflow-prompt__hint">Search is mocked in this spike and returns the first workflow.</span>
          <button type="submit" className="btn btn--primary btn--sm">
            <Icon name="arrow-right" />
            Run Workflow
          </button>
        </div>
      </form>
    </div>
  );
}
