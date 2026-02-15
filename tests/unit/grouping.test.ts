import { describe, expect, it } from 'vitest';
import { groupAgentsByTag, GroupAgentsOptions, filterAgents, getAgentTagValue, getAgentTagValueWithDefault } from '@/utils/grouping';
import { Agent } from '@/types/agent';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Create a mock agent for testing
 */
const NOW = 1_700_000_000_000;
let agentIdCounter = 0;
function mockAgent(overrides: Partial<Agent> = {}): Agent {
  agentIdCounter += 1;
  return {
    _id: `agent-${agentIdCounter}` as Id<"agents">,
    _creationTime: NOW,
    canvasId: 'canvas-id' as Id<"canvases">,
    phase: 'Phase 1',
    agentOrder: 0,
    name: 'Test Agent',
    tools: [],
    journeySteps: [],
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
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

describe('filterAgents', () => {
  it('returns all agents when no filters provided', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent 1', phase: 'Phase A' }),
      mockAgent({ name: 'Agent 2', phase: 'Phase B' }),
      mockAgent({ name: 'Agent 3', phase: 'Phase A' }),
    ];

    // Empty object
    expect(filterAgents(agents, {})).toHaveLength(3);

    // Null/undefined coerced — the function checks for falsy
    expect(filterAgents(agents, null as unknown as Record<string, string[]>)).toHaveLength(3);
    expect(filterAgents(agents, undefined as unknown as Record<string, string[]>)).toHaveLength(3);
  });

  it('filters agents by phase', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent A1', phase: 'Phase A' }),
      mockAgent({ name: 'Agent A2', phase: 'Phase A' }),
      mockAgent({ name: 'Agent B1', phase: 'Phase B' }),
    ];

    const result = filterAgents(agents, { phase: ['Phase A'] });

    expect(result).toHaveLength(2);
    expect(result.every(a => a.phase === 'Phase A')).toBe(true);
  });

  it('filters agents by category', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Sales Agent', category: 'Sales' }),
      mockAgent({ name: 'Support Agent', category: 'Support' }),
      mockAgent({ name: 'Sales Agent 2', category: 'Sales' }),
    ];

    const result = filterAgents(agents, { category: ['Support'] });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Support Agent');
  });

  it('filters agents by status', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Live Agent', status: 'live' }),
      mockAgent({ name: 'Idea Agent', status: 'idea' }),
      mockAgent({ name: 'Live Agent 2', status: 'live' }),
    ];

    const result = filterAgents(agents, { status: ['live'] });

    expect(result).toHaveLength(2);
    expect(result.every(a => a.status === 'live')).toBe(true);
  });

  it('filters by multiple tag types', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Match', phase: 'Phase A', category: 'Sales' }),
      mockAgent({ name: 'Phase Only', phase: 'Phase A', category: 'Support' }),
      mockAgent({ name: 'Category Only', phase: 'Phase B', category: 'Sales' }),
      mockAgent({ name: 'Neither', phase: 'Phase B', category: 'Support' }),
    ];

    const result = filterAgents(agents, {
      phase: ['Phase A'],
      category: ['Sales'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Match');
  });

  it('skips empty filter arrays', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent 1', phase: 'Phase A' }),
      mockAgent({ name: 'Agent 2', phase: 'Phase B' }),
    ];

    const result = filterAgents(agents, { phase: [] });

    expect(result).toHaveLength(2);
  });

  it('handles unknown tag types gracefully', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent 1', phase: 'Phase A' }),
      mockAgent({ name: 'Agent 2', phase: 'Phase B' }),
    ];

    const result = filterAgents(agents, { unknownTagType: ['some-value'] });

    expect(result).toHaveLength(2);
  });
});

describe('groupAgentsByTag categoryOrder', () => {
  it('sorts groups by canvas categoryOrder array', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent C', category: 'Category C', agentOrder: 0 }),
      mockAgent({ name: 'Agent A', category: 'Category A', agentOrder: 0 }),
      mockAgent({ name: 'Agent B', category: 'Category B', agentOrder: 0 }),
    ];

    const options: GroupAgentsOptions = {
      tagType: 'category',
      categoryOrder: ['Category A', 'Category B', 'Category C'],
    };

    const groups = groupAgentsByTag(agents, options);

    expect(groups.map(g => g.id)).toEqual(['Category A', 'Category B', 'Category C']);
  });

  it('places unknown categories at the end', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Agent Unknown', category: 'Unknown Category', agentOrder: 0 }),
      mockAgent({ name: 'Agent A', category: 'Category A', agentOrder: 0 }),
      mockAgent({ name: 'Agent B', category: 'Category B', agentOrder: 0 }),
    ];

    const options: GroupAgentsOptions = {
      tagType: 'category',
      categoryOrder: ['Category A', 'Category B'],
    };

    const groups = groupAgentsByTag(agents, options);

    expect(groups.map(g => g.id)).toEqual(['Category A', 'Category B', 'Unknown Category']);
  });
});

describe('getAgentTagValue', () => {
  it('returns phase value', () => {
    const agent = mockAgent({ phase: 'Discovery' });
    expect(getAgentTagValue(agent, 'phase')).toBe('Discovery');
  });

  it('returns category value', () => {
    const agent = mockAgent({ category: 'Sales' });
    expect(getAgentTagValue(agent, 'category')).toBe('Sales');
  });

  it('returns status value', () => {
    const agent = mockAgent({ status: 'live' });
    expect(getAgentTagValue(agent, 'status')).toBe('live');
  });

  it('returns undefined for unknown tag type', () => {
    const agent = mockAgent({ phase: 'Phase A' });
    expect(getAgentTagValue(agent, 'nonexistent')).toBeUndefined();
  });
});

describe('getAgentTagValueWithDefault', () => {
  it('returns value when present', () => {
    const agent = mockAgent({ phase: 'Discovery' });
    expect(getAgentTagValueWithDefault(agent, 'phase')).toBe('Discovery');
  });

  it('returns default for missing value', () => {
    const agent = mockAgent();
    // Agent without category set — should return the default 'unassigned'
    expect(getAgentTagValueWithDefault(agent, 'category')).toBe('unassigned');
  });

  it('returns custom default', () => {
    const agent = mockAgent();
    expect(getAgentTagValueWithDefault(agent, 'category', 'N/A')).toBe('N/A');
  });
});
