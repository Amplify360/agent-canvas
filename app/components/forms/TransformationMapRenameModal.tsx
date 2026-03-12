'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useMutation } from '@/hooks/useConvex';
import { useAppState } from '@/contexts/AppStateContext';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface TransformationMapRenameModalProps {
  isOpen: boolean;
  mapId: string;
  currentTitle: string;
  onClose: () => void;
}

export function TransformationMapRenameModal({
  isOpen,
  mapId,
  currentTitle,
  onClose,
}: TransformationMapRenameModalProps) {
  const updateMap = useMutation(api.transformationMaps.update);
  const { showToast } = useAppState();
  const [title, setTitle] = useState(currentTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(currentTitle);
    setError(null);
  }, [currentTitle, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    if (trimmedTitle === currentTitle) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateMap({
        mapId: mapId as Id<"transformationMaps">,
        title: trimmedTitle,
      });
      showToast('Transformation map renamed successfully', 'success');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename transformation map');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Transformation Map" size="small" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="transformation-map-title" className="form-label">
            Transformation Map Name
          </label>
          <input
            id="transformation-map-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter transformation map name"
            autoFocus
            disabled={isSubmitting}
          />
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
