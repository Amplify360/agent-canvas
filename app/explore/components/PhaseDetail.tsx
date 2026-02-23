'use client';

import {
  Telescope,
  BarChart3,
  Lightbulb,
  Rocket,
  RefreshCw,
  Layers,
} from 'lucide-react';
import type { ExplorePhase } from '@/explore/data/types';
import type { LucideIcon } from 'lucide-react';
import UseCaseCard from './UseCaseCard';

const phaseIconMap: Record<string, LucideIcon> = {
  Telescope,
  BarChart3,
  Lightbulb,
  Rocket,
  RefreshCw,
  Layers,
};

function getPhaseIcon(iconName: string): LucideIcon {
  return phaseIconMap[iconName] || Telescope;
}

interface PhaseDetailProps {
  phase: ExplorePhase;
  onSelectUseCase: (useCaseId: string) => void;
}

export default function PhaseDetail({ phase, onSelectUseCase }: PhaseDetailProps) {
  const Icon = getPhaseIcon(phase.icon);

  return (
    <>
      <div
        className="explore-phase-hero"
        style={{ '--phase-color': `var(${phase.colorVar})` } as React.CSSProperties}
      >
        <Icon size={32} style={{ color: 'var(--phase-color)' }} />
        <h1 className="explore-phase-hero-title">{phase.name}</h1>
        <p className="explore-phase-hero-subtitle">{phase.subtitle}</p>
      </div>
      <div className="explore-usecase-grid">
        {phase.useCases.map((useCase, index) => (
          <UseCaseCard
            key={useCase.id}
            useCase={useCase}
            phaseColorVar={phase.colorVar}
            index={index}
            onClick={() => onSelectUseCase(useCase.id)}
          />
        ))}
      </div>
    </>
  );
}
