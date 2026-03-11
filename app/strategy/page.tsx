/**
 * Strategy page - Strategic reasoning layer entry point
 */

'use client';

import { Suspense } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { StrategyExplorer } from '@/components/strategy/StrategyExplorer';

export default function StrategyPage() {
  return (
    <AppProviders>
      <Suspense>
        <StrategyExplorer />
      </Suspense>
    </AppProviders>
  );
}
