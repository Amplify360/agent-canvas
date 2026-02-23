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

interface PhaseBrowserProps {
  phases: ExplorePhase[];
  onSelectPhase: (phaseId: string) => void;
}

export default function PhaseBrowser({ phases, onSelectPhase }: PhaseBrowserProps) {
  return (
    <>
      <div className="explore-hero">
        <h1>Explore Use Cases</h1>
        <p>
          Discover AI-powered solutions across the Proudfoot transformation
          journey
        </p>
      </div>
      <div className="explore-phase-grid">
        {phases.map((phase, index) => {
          const Icon = getPhaseIcon(phase.icon);
          return (
            <div
              key={phase.id}
              className={`explore-phase-card explore-stagger-${index + 1}`}
              style={{ '--phase-color': `var(${phase.colorVar})` } as React.CSSProperties}
              onClick={() => onSelectPhase(phase.id)}
            >
              <span className="explore-phase-number">{phase.number}</span>
              <Icon size={28} className="explore-phase-icon" />
              <h2 className="explore-phase-name">{phase.name}</h2>
              <p className="explore-phase-subtitle">{phase.subtitle}</p>
              <p className="explore-phase-description">{phase.description}</p>
              <span className="explore-phase-badge">
                {phase.useCases.length} use case{phase.useCases.length !== 1 ? 's' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
