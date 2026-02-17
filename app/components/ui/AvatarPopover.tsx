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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarPopover({
  src,
  alt,
  name,
  title,
  size = 'sm',
  className = ''
}: AvatarPopoverProps) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <div
      className="avatar-popover-container"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <Avatar
        src={src}
        alt={alt}
        size={size}
        className={className}
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
