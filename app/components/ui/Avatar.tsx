/**
 * Avatar component - displays user profile pictures
 */

'use client';

import React from 'react';
import { Tooltip } from './Tooltip';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

export function Avatar({ src, alt, size = 'md', title, className = '' }: AvatarProps) {
  const sizeClass = `avatar--${size}`;

  const avatar = (
    <img
      src={src}
      alt={alt}
      className={`avatar ${sizeClass} ${className}`}
      loading="lazy"
    />
  );

  if (title) {
    return (
      <Tooltip content={title} placement="top">
        {avatar}
      </Tooltip>
    );
  }

  return avatar;
}
