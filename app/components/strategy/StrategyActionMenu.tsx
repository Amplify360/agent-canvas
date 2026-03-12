'use client';

import React, { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface StrategyActionMenuItem {
  label: string;
  icon: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
  disabled?: boolean;
}

interface StrategyActionMenuProps {
  actions: StrategyActionMenuItem[];
  ariaLabel?: string;
  className?: string;
}

export function StrategyActionMenu({
  actions,
  ariaLabel = 'More actions',
  className = '',
}: StrategyActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  return (
    <div
      ref={menuRef}
      className={`strategy-action-menu ${className}`.trim()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="strategy-action-menu__trigger"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <Icon name="more-vertical" size={16} />
      </button>
      {isOpen && (
        <div className="strategy-action-menu__dropdown dropdown-menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`dropdown-item ${action.tone === 'danger' ? 'dropdown-item--danger' : ''}`.trim()}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                action.onSelect();
              }}
            >
              <Icon name={action.icon} size={16} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
