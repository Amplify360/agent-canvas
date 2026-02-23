'use client';

import type { ExploreUseCase } from '@/explore/data/types';

interface UseCaseCardProps {
  useCase: ExploreUseCase;
  phaseColorVar: string;
  index: number;
  onClick: () => void;
}

export default function UseCaseCard({ useCase, phaseColorVar, index, onClick }: UseCaseCardProps) {
  return (
    <div
      className={`explore-usecase-card explore-stagger-${index + 1}`}
      style={{ '--phase-color': `var(${phaseColorVar})` } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="explore-usecase-number">{useCase.id}</span>
      <h3 className="explore-usecase-title">{useCase.title}</h3>
      <p className="explore-usecase-challenge">{useCase.challenge}</p>
      <div className="explore-usecase-impact-chip">{useCase.impact}</div>
    </div>
  );
}
