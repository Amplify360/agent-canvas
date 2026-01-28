/**
 * CopyCanvasModal - Modal for copying a canvas to other organizations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@/hooks/useConvex';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { Icon } from '@/components/ui/Icon';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface CopyCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  canvasTitle: string;
}

export function CopyCanvasModal({ isOpen, onClose, canvasId, canvasTitle }: CopyCanvasModalProps) {
  const { userOrgs, currentOrgId } = useAuth();
  const executeOperation = useAsyncOperation();

  const copyToOrgsMutation = useMutation(api.canvases.copyToOrgs);

  const [newTitle, setNewTitle] = useState(`${canvasTitle} (Copy)`);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter out current org from available targets
  const availableOrgs = userOrgs.filter((org) => org.id !== currentOrgId);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewTitle(`${canvasTitle} (Copy)`);
      setSelectedOrgIds([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, canvasTitle]);

  const handleOrgToggle = (orgId: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const handleCopy = async () => {
    if (!newTitle.trim()) {
      setError('Please enter a title');
      return;
    }

    if (selectedOrgIds.length === 0) {
      setError('Please select at least one organization');
      return;
    }

    setError(null);
    setIsLoading(true);

    await executeOperation(
      async () => {
        await copyToOrgsMutation({
          sourceCanvasId: canvasId as Id<'canvases'>,
          targetOrgIds: selectedOrgIds,
          newTitle: newTitle.trim(),
        });
      },
      {
        loadingMessage: `Copying to ${selectedOrgIds.length} organization${selectedOrgIds.length > 1 ? 's' : ''}...`,
        successMessage: `Canvas copied to ${selectedOrgIds.length} organization${selectedOrgIds.length > 1 ? 's' : ''}`,
        errorMessage: 'Failed to copy canvas',
        onSuccess: handleClose,
        onError: (err) => {
          setError(err.message);
          setIsLoading(false);
        },
      }
    );
  };

  const handleClose = () => {
    setNewTitle('');
    setSelectedOrgIds([]);
    setError(null);
    onClose();
  };

  const selectedCount = selectedOrgIds.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Copy Canvas" closeOnOverlayClick={false}>
      <div className="modal__body">
        {/* Title Input */}
        <div className="form-group">
          <label htmlFor="copy-canvas-title" className="form-label">
            Title for copies
          </label>
          <input
            id="copy-canvas-title"
            type="text"
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter canvas title"
          />
        </div>

        {/* Organization Selection */}
        <div className="form-group">
          <label className="form-label">Select organizations</label>
          {availableOrgs.length === 0 ? (
            <p className="form-help">No other organizations available.</p>
          ) : (
            <div className="checkbox-list">
              {availableOrgs.map((org) => (
                <label
                  key={org.id}
                  className={`checkbox-item ${selectedOrgIds.includes(org.id) ? 'is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrgIds.includes(org.id)}
                    onChange={() => handleOrgToggle(org.id)}
                  />
                  <div className="checkbox-item__check">
                    <Icon name="check" />
                  </div>
                  <span>{org.name || org.id}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert--error u-mt-4">
            {error}
          </div>
        )}
      </div>

      <div className="modal__footer">
        <button type="button" className="btn btn--secondary" onClick={handleClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCopy}
          disabled={isLoading || selectedCount === 0 || !newTitle.trim()}
        >
          {isLoading
            ? 'Copying...'
            : selectedCount === 0
              ? 'Select organizations'
              : `Copy to ${selectedCount} organization${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </Modal>
  );
}
