/**
 * Transformation Map page - top-down reasoning layer entry point
 */

'use client';

import { Suspense } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { StrategyExplorer } from '@/components/strategy/StrategyExplorer';

export default function TransformationMapPage() {
  return (
    <AppProviders>
      <Suspense>
        <StrategyExplorer />
      </Suspense>
    </AppProviders>
  );
}
