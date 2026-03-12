import { describe, expect, it } from 'vitest';
import { countUniqueLinkedAgentsForService } from '@/strategy/utils';
import type { Initiative } from '@/strategy/types';

describe('countUniqueLinkedAgentsForService', () => {
  it('deduplicates linked agents by stable id within a service', () => {
    const initiatives: Initiative[] = [
      {
        id: 'init-1',
        serviceId: 'svc-a',
        title: 'Initiative One',
        description: 'First initiative',
        status: 'approved',
        linkedAgents: [
          { id: 'agent-a', name: 'Integration Builder', role: 'Build the sync' },
          { id: 'agent-b', name: 'Data Mapper', role: 'Map source fields' },
        ],
      },
      {
        id: 'init-2',
        serviceId: 'svc-a',
        title: 'Initiative Two',
        description: 'Second initiative',
        status: 'proposed',
        linkedAgents: [
          { id: 'agent-a', name: 'Integration Builder', role: 'Validate deployment' },
          { id: 'agent-c', name: 'QA Agent', role: 'Run regression checks' },
        ],
      },
      {
        id: 'init-3',
        serviceId: 'svc-b',
        title: 'Other Service Initiative',
        description: 'Different service',
        status: 'done',
        linkedAgents: [
          { id: 'agent-a', name: 'Integration Builder', role: 'Different service reuse' },
        ],
      },
    ];

    expect(countUniqueLinkedAgentsForService(initiatives, 'svc-a')).toBe(3);
  });
});
