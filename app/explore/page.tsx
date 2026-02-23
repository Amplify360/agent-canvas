'use client';

import { ExploreProviders } from '@/explore/ExploreProviders';
import ExploreClient from '@/explore/ExploreClient';

export default function ExplorePage() {
  return (
    <ExploreProviders>
      <ExploreClient />
    </ExploreProviders>
  );
}
