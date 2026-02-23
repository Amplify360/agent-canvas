'use client';

import { ChevronRight, ArrowLeft } from 'lucide-react';
import type { ExplorePhase, ExploreUseCase } from '@/explore/data/types';

interface ExploreHeaderProps {
  phase?: ExplorePhase;
  useCase?: ExploreUseCase;
  onNavigate: (view: 'phases' | 'phase' | 'usecase', phaseId?: string, useCaseId?: string) => void;
}

export default function ExploreHeader({ phase, useCase, onNavigate }: ExploreHeaderProps) {
  return (
    <header className="explore-header">
      <nav className="explore-breadcrumb">
        <button
          className="explore-breadcrumb-item"
          onClick={() => onNavigate('phases')}
        >
          Explore
        </button>
        {phase && (
          <>
            <ChevronRight size={14} className="explore-breadcrumb-separator" />
            <button
              className="explore-breadcrumb-item"
              onClick={() => onNavigate('phase', phase.id)}
            >
              {phase.name}
            </button>
          </>
        )}
        {useCase && (
          <>
            <ChevronRight size={14} className="explore-breadcrumb-separator" />
            <span className="explore-breadcrumb-item active">{useCase.title}</span>
          </>
        )}
      </nav>
      <a className="explore-back-link" href="/">
        <ArrowLeft size={16} />
        Canvas
      </a>
    </header>
  );
}
