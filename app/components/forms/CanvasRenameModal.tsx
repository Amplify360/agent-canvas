/**
 * CanvasRenameModal - Modal for creating/editing canvas title and description
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCanvas } from '@/contexts/CanvasContext';
import { useAppState } from '@/contexts/AppStateContext';
import { VALIDATION_CONSTANTS } from '@/types/validationConstants';
import type { Canvas } from '@/types/canvas';

interface CanvasRenameModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  canvasId?: string;
  currentTitle?: string;
  currentDescription?: string;
  currentBusinessCaseAgentUrl?: string;
  currentRegulatoryAssessmentAgentUrl?: string;
  onClose: () => void;
  onCreated?: (canvasId: string) => void;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'canvas';
}

function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const base = slugifyTitle(title);
  let candidate = base;
  let suffix = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function CanvasRenameModal({
  isOpen,
  mode,
  canvasId,
  currentTitle,
  currentDescription,
  currentBusinessCaseAgentUrl,
  currentRegulatoryAssessmentAgentUrl,
  onClose,
  onCreated,
}: CanvasRenameModalProps) {
  const { canvases, createCanvas, updateCanvas } = useCanvas();
  const { showToast } = useAppState();
  const [title, setTitle] = useState(currentTitle ?? '');
  const [description, setDescription] = useState(currentDescription ?? '');
  const [businessCaseAgentUrl, setBusinessCaseAgentUrl] = useState(currentBusinessCaseAgentUrl ?? '');
  const [regulatoryAssessmentAgentUrl, setRegulatoryAssessmentAgentUrl] = useState(currentRegulatoryAssessmentAgentUrl ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle ?? '');
      setDescription(currentDescription ?? '');
      setBusinessCaseAgentUrl(currentBusinessCaseAgentUrl ?? '');
      setRegulatoryAssessmentAgentUrl(currentRegulatoryAssessmentAgentUrl ?? '');
      setError(null);
    }
  }, [isOpen, currentTitle, currentDescription, currentBusinessCaseAgentUrl, currentRegulatoryAssessmentAgentUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    if (trimmedTitle.length > VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH) {
      setError(`Title must be ${VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH} characters or less`);
      return;
    }

    const normalizedDescription = description.trim() || undefined;
    const normalizedBusinessCaseAgentUrl = businessCaseAgentUrl.trim() || undefined;
    const normalizedRegulatoryAssessmentAgentUrl = regulatoryAssessmentAgentUrl.trim() || undefined;

    if (
      normalizedDescription &&
      normalizedDescription.length > VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH
    ) {
      setError(`Description must be ${VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH} characters or less`);
      return;
    }
    if (
      normalizedBusinessCaseAgentUrl &&
      normalizedBusinessCaseAgentUrl.length > VALIDATION_CONSTANTS.URL_MAX_LENGTH
    ) {
      setError(`Business case URL must be ${VALIDATION_CONSTANTS.URL_MAX_LENGTH} characters or less`);
      return;
    }
    if (
      normalizedRegulatoryAssessmentAgentUrl &&
      normalizedRegulatoryAssessmentAgentUrl.length > VALIDATION_CONSTANTS.URL_MAX_LENGTH
    ) {
      setError(`Regulatory assessment URL must be ${VALIDATION_CONSTANTS.URL_MAX_LENGTH} characters or less`);
      return;
    }
    if (normalizedBusinessCaseAgentUrl && !isValidUrl(normalizedBusinessCaseAgentUrl)) {
      setError('Business case URL must be a valid URL');
      return;
    }
    if (normalizedRegulatoryAssessmentAgentUrl && !isValidUrl(normalizedRegulatoryAssessmentAgentUrl)) {
      setError('Regulatory assessment URL must be a valid URL');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'create') {
        const existingSlugs = new Set(canvases.map((canvas) => canvas.slug));
        const slug = generateUniqueSlug(trimmedTitle, existingSlugs);
        const createdCanvasId = await createCanvas(
          trimmedTitle,
          slug,
          normalizedDescription,
          normalizedBusinessCaseAgentUrl,
          normalizedRegulatoryAssessmentAgentUrl
        );
        showToast('Canvas created successfully', 'success');
        onCreated?.(createdCanvasId);
        onClose();
        return;
      }

      if (!canvasId) {
        setError('Canvas ID is required');
        return;
      }

      const normalizedCurrentDescription = currentDescription?.trim() || undefined;
      const normalizedCurrentBusinessCaseAgentUrl = currentBusinessCaseAgentUrl?.trim() || undefined;
      const normalizedCurrentRegulatoryAssessmentAgentUrl = currentRegulatoryAssessmentAgentUrl?.trim() || undefined;
      const normalizedCurrentTitle = currentTitle?.trim() || '';
      const hasTitleChanged = trimmedTitle !== normalizedCurrentTitle;
      const hasDescriptionChanged = normalizedDescription !== normalizedCurrentDescription;
      const hasBusinessCaseAgentUrlChanged = normalizedBusinessCaseAgentUrl !== normalizedCurrentBusinessCaseAgentUrl;
      const hasRegulatoryAssessmentAgentUrlChanged =
        normalizedRegulatoryAssessmentAgentUrl !== normalizedCurrentRegulatoryAssessmentAgentUrl;

      if (
        !hasTitleChanged &&
        !hasDescriptionChanged &&
        !hasBusinessCaseAgentUrlChanged &&
        !hasRegulatoryAssessmentAgentUrlChanged
      ) {
        onClose();
        return;
      }

      const updateData: Partial<Canvas> = {};
      if (hasTitleChanged) {
        updateData.title = trimmedTitle;
      }
      if (hasDescriptionChanged) {
        // Empty string intentionally clears description on backend.
        updateData.description = normalizedDescription ?? '';
      }
      if (hasBusinessCaseAgentUrlChanged) {
        // Empty string intentionally clears URL on backend.
        updateData.businessCaseAgentUrl = normalizedBusinessCaseAgentUrl ?? '';
      }
      if (hasRegulatoryAssessmentAgentUrlChanged) {
        // Empty string intentionally clears URL on backend.
        updateData.regulatoryAssessmentAgentUrl = normalizedRegulatoryAssessmentAgentUrl ?? '';
      }

      await updateCanvas(canvasId, updateData);
      showToast('Canvas updated successfully', 'success');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save canvas';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create Canvas' : 'Canvas Details'}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="canvas-title" className="form-label">
            Canvas Name
          </label>
          <input
            id="canvas-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter canvas name"
            autoFocus
            disabled={isSubmitting}
            maxLength={VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH}
          />
        </div>

        <div className="form-group">
          <label htmlFor="canvas-description" className="form-label">
            Description (Optional)
          </label>
          <textarea
            id="canvas-description"
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context about this canvas or company..."
            disabled={isSubmitting}
            rows={6}
            maxLength={VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH}
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {description.length}/{VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH} characters
          </p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="canvas-business-case-url" className="form-label">
              Business Case Agent URL (Optional)
            </label>
            <input
              id="canvas-business-case-url"
              type="url"
              className="form-input"
              value={businessCaseAgentUrl}
              onChange={(e) => setBusinessCaseAgentUrl(e.target.value)}
              placeholder="https://example.com/business-case-agent"
              disabled={isSubmitting}
              maxLength={VALIDATION_CONSTANTS.URL_MAX_LENGTH}
            />
          </div>

          <div className="form-group">
            <label htmlFor="canvas-regulatory-assessment-url" className="form-label">
              Regulatory Assessment Agent URL (Optional)
            </label>
            <input
              id="canvas-regulatory-assessment-url"
              type="url"
              className="form-input"
              value={regulatoryAssessmentAgentUrl}
              onChange={(e) => setRegulatoryAssessmentAgentUrl(e.target.value)}
              placeholder="https://example.com/regulatory-assessment-agent"
              disabled={isSubmitting}
              maxLength={VALIDATION_CONSTANTS.URL_MAX_LENGTH}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting
              ? (mode === 'create' ? 'Creating...' : 'Saving...')
              : (mode === 'create' ? 'Create Canvas' : 'Save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
