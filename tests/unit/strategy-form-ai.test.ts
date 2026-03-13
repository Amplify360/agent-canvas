import { describe, expect, it } from 'vitest';
import {
  buildStrategyFormAssistMessages,
  normalizeStrategyFormAssistResult,
} from '@/server/strategyFormAi';
import type { StrategyFormAssistRequest } from '@/strategy/formAssist';

describe('strategy form AI helpers', () => {
  it('normalizes objective linked pressures from ids and titles', () => {
    const request: StrategyFormAssistRequest = {
      formType: 'objective',
      notes: 'Notes',
      context: {
        current: {
          title: '',
          description: '',
          linkedPressureIds: [],
        },
        availablePressures: [
          { id: 'p-1', type: 'external', title: 'New competitor', description: 'desc' },
          { id: 'p-2', type: 'internal', title: 'Manual work', description: 'desc' },
        ],
      },
    };

    expect(
      normalizeStrategyFormAssistResult({
        patch: {
          title: 'Improve throughput',
          linkedPressures: ['p-1', 'Manual work', 'unknown'],
        },
      }, request, 'openai/gpt-5.4')
    ).toEqual({
      patch: {
        title: 'Improve throughput',
        linkedPressureIds: ['p-1', 'p-2'],
      },
      fieldMeta: {},
      warnings: [],
      unmappedNotes: [],
      model: 'openai/gpt-5.4',
    });
  });

  it('normalizes deviation enums and booleans', () => {
    const request: StrategyFormAssistRequest = {
      formType: 'deviation',
      notes: 'Notes',
      context: {
        current: {
          what: '',
          why: '',
          necessary: false,
          impact: 'medium',
          treatment: 'simplify',
          classification: 'handoff',
        },
      },
    };

    expect(
      normalizeStrategyFormAssistResult({
        patch: {
          what: 'Extra approval',
          why: 'Legacy risk policy',
          necessary: 'yes',
          impact: 'high',
          treatment: 'automate',
          classification: 'approval',
        },
      }, request, 'openai/gpt-5.4')
    ).toEqual({
      patch: {
        what: 'Extra approval',
        why: 'Legacy risk policy',
        necessary: true,
        impact: 'high',
        treatment: 'automate',
        classification: 'approval',
      },
      fieldMeta: {},
      warnings: [],
      unmappedNotes: [],
      model: 'openai/gpt-5.4',
    });
  });

  it('builds initiative prompts with allowed statuses', () => {
    const request: StrategyFormAssistRequest = {
      formType: 'initiative',
      notes: 'Notes',
      context: {
        current: {
          title: '',
          description: '',
          status: 'proposed',
          linkedAgents: [],
        },
      },
    };

    const messages = buildStrategyFormAssistMessages(request, 'Fill it out');
    expect(messages[1]?.content).toContain('Available status values: proposed, approved, in-progress, done, parked');
  });
});
