/**
 * AvatarPopover - Avatar with hover popover showing larger image and name
 */

'use client';

import React, { useState } from 'react';
import { Avatar } from './Avatar';

interface AvatarPopoverProps {
  src: string;
  alt: string;
  name: string;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function AvatarPopover({
  src,
  alt,
  name,
  title,
  size = 'sm',
  className = '',
  onOpenChange,
}: AvatarPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);

  const handleOpen = () => {
    setShowPopover(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setShowPopover(false);
    onOpenChange?.(false);
  };

  return (
    <div
      className={`avatar-popover-container ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <Avatar
        src={src}
        alt={alt}
        size={size}
      />

      {showPopover && (
        <div className="avatar-popover">
          <Avatar
            src={src}
            alt={alt}
            size="lg"
          />
          <div className="avatar-popover__name">{name}</div>
          {title && <div className="avatar-popover__title">{title}</div>}
        </div>
      )}
    </div>
  );
}
