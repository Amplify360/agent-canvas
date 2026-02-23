'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { explorePhases } from '@/explore/data/exploreData';
import ExploreHeader from '@/explore/components/ExploreHeader';
import PhaseBrowser from '@/explore/components/PhaseBrowser';
import PhaseDetail from '@/explore/components/PhaseDetail';
import UseCaseDetail from '@/explore/components/UseCaseDetail';
import type { ExplorePhase, ExploreUseCase } from '@/explore/data/types';

type View = 'phases' | 'phase' | 'usecase';

interface ViewState {
  view: View;
  phaseId?: string;
  useCaseId?: string;
}

export default function ExploreClient() {
  const [state, setState] = useState<ViewState>({ view: 'phases' });
  const [transitioning, setTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentPhase: ExplorePhase | undefined = state.phaseId
    ? explorePhases.find((p) => p.id === state.phaseId)
    : undefined;

  const currentUseCase: ExploreUseCase | undefined =
    currentPhase && state.useCaseId
      ? currentPhase.useCases.find((uc) => uc.id === state.useCaseId)
      : undefined;

  const navigateTo = useCallback((view: View, phaseId?: string, useCaseId?: string) => {
    setTransitioning(true);
    // Short exit animation, then swap content
    setTimeout(() => {
      setState({ view, phaseId, useCaseId });
      setTransitioning(false);
      // Scroll to top on view change
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 200);
  }, []);

  const handleSelectPhase = useCallback(
    (phaseId: string) => navigateTo('phase', phaseId),
    [navigateTo]
  );

  const handleSelectUseCase = useCallback(
    (useCaseId: string) => {
      if (state.phaseId) {
        navigateTo('usecase', state.phaseId, useCaseId);
      }
    },
    [navigateTo, state.phaseId]
  );

  const handleNavigate = useCallback(
    (view: View, phaseId?: string, useCaseId?: string) => {
      navigateTo(view, phaseId, useCaseId);
    },
    [navigateTo]
  );

  // Re-trigger stagger animations on view change by toggling a key
  const [viewKey, setViewKey] = useState(0);
  useEffect(() => {
    setViewKey((k) => k + 1);
  }, [state.view, state.phaseId, state.useCaseId]);

  return (
    <div className="explore-page">
      <ExploreHeader
        phase={currentPhase}
        useCase={currentUseCase}
        onNavigate={handleNavigate}
      />
      <div
        ref={contentRef}
        className={`explore-content ${transitioning ? 'explore-view-exit-active' : 'explore-view-enter-active'}`}
        key={viewKey}
      >
        {state.view === 'phases' && (
          <PhaseBrowser phases={explorePhases} onSelectPhase={handleSelectPhase} />
        )}
        {state.view === 'phase' && currentPhase && (
          <PhaseDetail phase={currentPhase} onSelectUseCase={handleSelectUseCase} />
        )}
        {state.view === 'usecase' && currentPhase && currentUseCase && (
          <UseCaseDetail useCase={currentUseCase} phase={currentPhase} />
        )}
      </div>
    </div>
  );
}
