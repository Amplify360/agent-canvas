import { Suspense } from 'react';
import { StrategyExplorer } from '@/components/strategy/StrategyExplorer';

export default function TransformationMapPage() {
  return (
    <Suspense>
      <StrategyExplorer />
    </Suspense>
  );
}
