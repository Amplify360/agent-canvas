import { describe, it, expect } from 'vitest';
import {
  getAgentStatusConfig,
  AGENT_STATUS_CONFIG,
  AGENT_STATUS,
} from '@/types/validationConstants';

describe('getAgentStatusConfig', () => {
  it("returns correct config for known status 'live'", () => {
    const config = getAgentStatusConfig('live');
    expect(config.label).toBe('Live');
    expect(config.color).toBe('#10B981');
    expect(config.bgColor).toBeDefined();
    expect(config.icon).toBeDefined();
  });

  it("returns correct config for known status 'idea'", () => {
    const config = getAgentStatusConfig('idea');
    expect(config.label).toBe('Idea');
    expect(config.color).toBe('#6B7280');
  });

  it("returns correct config for known status 'wip'", () => {
    const config = getAgentStatusConfig('wip');
    expect(config.label).toBe('WIP');
  });

  it('returns custom label for unknown status', () => {
    const config = getAgentStatusConfig('custom-status');
    expect(config.label).toBe('custom-status');
  });

  it('returns Unknown label for undefined status', () => {
    const config = getAgentStatusConfig(undefined);
    expect(config.label).toBe('Unknown');
  });

  it('returns fallback color for unknown status', () => {
    const config = getAgentStatusConfig('nonexistent');
    expect(config.color).toBe('#6366F1');
  });

  it('all known statuses have required fields', () => {
    for (const status of Object.values(AGENT_STATUS)) {
      const config = AGENT_STATUS_CONFIG[status];
      expect(config.label).toBeDefined();
      expect(config.color).toBeDefined();
      expect(config.bgColor).toBeDefined();
      expect(config.icon).toBeDefined();
      expect(config.badgeVariant).toBeDefined();
    }
  });
});
