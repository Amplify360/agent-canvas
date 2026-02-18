/**
 * Base Modal component
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  /** Whether clicking outside the modal closes it. Defaults to true. Set to false for forms with unsaved data. */
  closeOnOverlayClick?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'medium', closeOnOverlayClick = true }: ModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Escape should close the top-most overlay only.
  useEscapeKey(isOpen, onClose);
  useBodyScrollLock(isOpen);

  if (!isOpen || !isMounted) return null;

  const sizeClass = {
    small: 'modal--small',
    medium: '',
    large: 'modal--large',
  }[size];

  return createPortal(
    <div className="modal-overlay show" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div className={`modal ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
