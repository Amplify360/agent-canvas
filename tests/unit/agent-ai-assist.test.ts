import { describe, expect, it } from 'vitest';
import type { AgentFormData } from '@/types/agent';
import { AGENT_STATUS } from '@/types/validationConstants';
import {
  applyAgentAssistPatch,
  buildAgentAssistFormData,
  createEmptyAgentAssistSelection,
  filterAgentAssistPatch,
  getAgentAssistDiff,
} from '@/agents/aiAssist';
import {
  buildAgentGlobalExtractMessages,
  normalizeAgentAssistPatch,
  normalizeAgentAssistResult,
} from '@/server/agentAi';

const BASE_FORM: AgentFormData = {
  name: 'Lead Qualifier',
  phase: 'Backlog',
  objective: '',
  description: 'Qualifies inbound leads before SDR handoff.',
  tools: [],
  journeySteps: [],
  demoLink: '',
  videoLink: '',
  metrics: {},
  category: '',
  status: AGENT_STATUS.IDEA,
  fieldValues: {},
  agentOrder: 0,
};

const ASSIST_CONTEXT = {
  current: buildAgentAssistFormData(BASE_FORM),
  availableTools: [
    { id: 'forms', label: 'Forms' },
    { id: 'web-search', label: 'Web Search' },
  ],
  availableStatuses: [
    { value: AGENT_STATUS.IDEA, label: 'Idea' },
    { value: AGENT_STATUS.APPROVED, label: 'Approved' },
    { value: AGENT_STATUS.LIVE, label: 'Live' },
  ],
  existingCategories: ['Sales', 'Support'],
};

describe('Agent AI helpers', () => {
  it('normalizes structured agent patches from model JSON', () => {
    expect(
      normalizeAgentAssistPatch({
        objective: '  Qualify inbound leads faster  ',
        tools: ['Forms', 'web search', 'unknown'],
        metrics: {
          numberOfUsers: '12',
          timeSaved: 4,
          roi: 'bad-data',
        },
        status: 'Live',
        demoLink: 'https://example.com/demo',
        videoLink: 'not-a-url',
      }, ASSIST_CONTEXT)
    ).toEqual({
      objective: 'Qualify inbound leads faster',
      tools: ['forms', 'web-search'],
      metrics: {
        numberOfUsers: 12,
        timeSaved: 4,
      },
      status: AGENT_STATUS.LIVE,
      demoLink: 'https://example.com/demo',
    });
  });

  it('filters agent assist patches when only empty fields should be filled', () => {
    expect(
      filterAgentAssistPatch(ASSIST_CONTEXT.current, {
        description: 'Should not replace existing description',
        objective: 'Qualify and route leads',
        tools: ['forms'],
      }, true)
    ).toEqual({
      objective: 'Qualify and route leads',
      tools: ['forms'],
    });
  });

  it('applies structured agent patches to the form state', () => {
    expect(
      applyAgentAssistPatch(ASSIST_CONTEXT.current, {
        objective: 'Qualify and route leads',
        tools: ['forms'],
      })
    ).toEqual({
      ...ASSIST_CONTEXT.current,
      objective: 'Qualify and route leads',
      tools: ['forms'],
    });
  });

  it('computes the diff between current and proposed values', () => {
    expect(
      getAgentAssistDiff(ASSIST_CONTEXT.current, {
        objective: 'Qualify and route leads',
        tools: ['forms'],
        description: ASSIST_CONTEXT.current.description,
      })
    ).toEqual([
      {
        field: 'objective',
        currentValue: 'Empty',
        proposedValue: 'Qualify and route leads',
      },
      {
        field: 'tools',
        currentValue: 'Empty',
        proposedValue: 'forms',
      },
    ]);
  });

  it('creates field-selection state from a proposed patch', () => {
    expect(
      createEmptyAgentAssistSelection({
        objective: 'Qualify and route leads',
        tools: ['forms'],
      })
    ).toEqual({
      name: false,
      phase: false,
      objective: true,
      description: false,
      tools: true,
      journeySteps: false,
      demoLink: false,
      videoLink: false,
      metrics: false,
      category: false,
      status: false,
    });
  });

  it('builds prompt messages with tool and status context', () => {
    const messages = buildAgentGlobalExtractMessages({
      promptOverride: 'Fill what you can.',
      notes: 'Lead qualification workflow.',
      context: ASSIST_CONTEXT,
    });

    expect(messages[1]?.content).toContain('forms: Forms');
    expect(messages[1]?.content).toContain('live: Live');
    expect(messages[1]?.content).toContain('Lead qualification workflow.');
  });

  it('normalizes complete assist responses', () => {
    expect(
      normalizeAgentAssistResult({
        patch: {
          objective: 'Qualify and route leads',
          tools: ['Forms'],
        },
        fieldMeta: {
          objective: { reason: 'Explicit in notes' },
        },
        warnings: ['No metrics provided'],
      }, 'openai/gpt-5.4', ASSIST_CONTEXT)
    ).toEqual({
      patch: {
        objective: 'Qualify and route leads',
        tools: ['forms'],
      },
      fieldMeta: {
        objective: { reason: 'Explicit in notes' },
      },
      warnings: ['No metrics provided'],
      unmappedNotes: [],
      model: 'openai/gpt-5.4',
    });
  });
});
