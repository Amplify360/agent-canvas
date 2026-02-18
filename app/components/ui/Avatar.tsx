/**
 * Avatar component - displays user profile pictures
 *
 * @param src - URL to avatar image
 * @param alt - Alt text for accessibility
 * @param size - Avatar size variant (sm: 24px, md: 32px, lg: 48px)
 * @param title - Tooltip text shown on hover
 * @param className - Additional CSS classes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

export function Avatar({ src, alt, size = 'md', title, className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [src]);
  const sizeClass = `avatar--${size}`;

  // Generate initials from alt text as fallback
  const initials = alt
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatar = imageError ? (
    <div className={`avatar avatar--fallback ${sizeClass} ${className}`}>
      <span>{initials}</span>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={`avatar ${sizeClass} ${className}`}
      loading="lazy"
      onError={() => setImageError(true)}
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
