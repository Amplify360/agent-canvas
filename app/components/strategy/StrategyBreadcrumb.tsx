/**
 * StrategyBreadcrumb - Navigation trail for the strategy drill-down
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface StrategyBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (href: string) => void;
}

export function StrategyBreadcrumb({ items, onNavigate }: StrategyBreadcrumbProps) {
  return (
    <nav className="strategy-breadcrumb" aria-label="Strategy navigation">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <Icon name="chevron-right" size={14} className="strategy-breadcrumb__separator" />
            )}
            {isLast || !item.href ? (
              <span className="strategy-breadcrumb__item strategy-breadcrumb__item--current">
                {item.label}
              </span>
            ) : (
              <button
                className="strategy-breadcrumb__item strategy-breadcrumb__item--link"
                onClick={() => onNavigate(item.href!)}
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
