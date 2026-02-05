import { describe, expect, it } from 'vitest';
import { groupAgentsByTag, GroupAgentsOptions } from '@/utils/grouping';
import { Agent } from '@/types/agent';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Create a mock agent for testing
 */
function mockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    _id: `agent-${Math.random()}` as Id<"agents">,
    _creationTime: Date.now(),
    canvasId: 'canvas-id' as Id<"canvases">,
    phase: 'Phase 1',
    agentOrder: 0,
    name: 'Test Agent',
    tools: [],
    journeySteps: [],
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('groupAgentsByTag', () => {
  it('groups agents by phase', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent 1', phase: 'Phase A' }),
      mockAgent({ name: 'Agent 2', phase: 'Phase B' }),
      mockAgent({ name: 'Agent 3', phase: 'Phase A' }),
    ];

    const groups = groupAgentsByTag(agents, 'phase');

    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.id === 'Phase A')?.agents).toHaveLength(2);
    expect(groups.find(g => g.id === 'Phase B')?.agents).toHaveLength(1);
  });

  it('excludes soft-deleted agents', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Active', phase: 'Phase A' }),
      mockAgent({ name: 'Deleted', phase: 'Phase A', deletedAt: Date.now() }),
    ];

    const groups = groupAgentsByTag(agents, 'phase');

    expect(groups).toHaveLength(1);
    expect(groups[0].agents).toHaveLength(1);
    expect(groups[0].agents[0].name).toBe('Active');
  });

  it('sorts groups by canvas phaseOrder array', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent C', phase: 'Phase C', agentOrder: 0 }),
      mockAgent({ name: 'Agent A', phase: 'Phase A', agentOrder: 0 }),
      mockAgent({ name: 'Agent B', phase: 'Phase B', agentOrder: 0 }),
    ];

    const options: GroupAgentsOptions = {
      tagType: 'phase',
      phaseOrder: ['Phase A', 'Phase B', 'Phase C'],
    };

    const groups = groupAgentsByTag(agents, options);

    expect(groups.map(g => g.id)).toEqual(['Phase A', 'Phase B', 'Phase C']);
  });

  it('places unknown phases at the end', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent Unknown', phase: 'Unknown Phase', agentOrder: 0 }),
      mockAgent({ name: 'Agent A', phase: 'Phase A', agentOrder: 0 }),
      mockAgent({ name: 'Agent B', phase: 'Phase B', agentOrder: 0 }),
    ];

    const options: GroupAgentsOptions = {
      tagType: 'phase',
      phaseOrder: ['Phase A', 'Phase B'],
    };

    const groups = groupAgentsByTag(agents, options);

    expect(groups.map(g => g.id)).toEqual(['Phase A', 'Phase B', 'Unknown Phase']);
  });

  it('sorts agents by agentOrder within each group', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Third', phase: 'Phase A', agentOrder: 2 }),
      mockAgent({ name: 'First', phase: 'Phase A', agentOrder: 0 }),
      mockAgent({ name: 'Second', phase: 'Phase A', agentOrder: 1 }),
    ];

    const groups = groupAgentsByTag(agents, 'phase');

    expect(groups[0].agents.map(a => a.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('defaults to category grouping when no options provided', () => {
    const agents: Agent[] = [
      mockAgent({ phase: 'Phase A', category: 'Sales' }),
      mockAgent({ phase: 'Phase B', category: 'Support' }),
    ];

    const groups = groupAgentsByTag(agents);

    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.id).sort()).toEqual(['Sales', 'Support']);
  });
});
