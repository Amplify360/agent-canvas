import { describe, expect, it } from 'vitest';
import {
  applyServiceAssistPatch,
  createEmptyServiceAssistSelection,
  filterServiceAssistPatch,
  getServiceAssistDiff,
  type ServiceEditorFormData,
} from '@/strategy/aiAssist';
import {
  extractOpenRouterTextContent,
  normalizeServiceAssistPatch,
  normalizeServiceAssistResult,
  normalizeServiceFieldImproveResult,
  parseJsonObject,
} from '@/server/transformationMapAi';

const BASE_FORM: ServiceEditorFormData = {
  name: 'Invoice Processing',
  purpose: 'Generate and deliver invoices',
  customer: '',
  trigger: 'Deal closed in CRM',
  outcome: '',
  constraintsText: 'Tax rules apply',
  status: 'has-deviations',
  effectivenessMetric: '',
  efficiencyMetric: 'Manual entry',
};

describe('Transformation Map AI helpers', () => {
  it('normalizes structured service patches from model JSON', () => {
    expect(
      normalizeServiceAssistPatch({
        purpose: '  Generate accurate invoices from closed deals  ',
        constraints: [' Tax rules ', '', 'Net-60 needs approval'],
        status: 'analyzed',
      })
    ).toEqual({
      purpose: 'Generate accurate invoices from closed deals',
      constraintsText: 'Tax rules\nNet-60 needs approval',
    });
  });

  it('filters service assist patches when only empty fields should be filled', () => {
    expect(
      filterServiceAssistPatch(BASE_FORM, {
        purpose: 'Should not replace',
        customer: 'Billing contacts',
        outcome: 'Invoice sent and payment tracked',
      }, true)
    ).toEqual({
      customer: 'Billing contacts',
      outcome: 'Invoice sent and payment tracked',
    });
  });

  it('applies structured service patches to the form state', () => {
    expect(
      applyServiceAssistPatch(BASE_FORM, {
        customer: 'Billing contacts',
        outcome: 'Invoice sent and payment tracked',
      })
    ).toEqual({
      ...BASE_FORM,
      customer: 'Billing contacts',
      outcome: 'Invoice sent and payment tracked',
    });
  });

  it('computes the diff between current and proposed values', () => {
    expect(
      getServiceAssistDiff(BASE_FORM, {
        customer: 'Billing contacts',
        outcome: 'Invoice sent and payment tracked',
        purpose: BASE_FORM.purpose,
      })
    ).toEqual([
      {
        field: 'customer',
        currentValue: '',
        proposedValue: 'Billing contacts',
      },
      {
        field: 'outcome',
        currentValue: '',
        proposedValue: 'Invoice sent and payment tracked',
      },
    ]);
  });

  it('creates field-selection state from a proposed patch', () => {
    expect(
      createEmptyServiceAssistSelection({
        customer: 'Billing contacts',
      })
    ).toEqual({
      name: false,
      purpose: false,
      customer: true,
      trigger: false,
      outcome: false,
      constraintsText: false,
      effectivenessMetric: false,
      efficiencyMetric: false,
    });
  });

  it('parses json objects from fenced model output', () => {
    expect(
      parseJsonObject<{ patch: { purpose: string } }>('```json\n{"patch":{"purpose":"One"}}\n```')
    ).toEqual({ patch: { purpose: 'One' } });
  });

  it('extracts text content from string and part-based OpenRouter responses', () => {
    expect(
      extractOpenRouterTextContent({
        choices: [{ message: { content: 'plain text' } }],
      })
    ).toBe('plain text');

    expect(
      extractOpenRouterTextContent({
        choices: [{ message: { content: [{ text: 'first' }, { text: 'second' }] } }],
      })
    ).toBe('first\nsecond');
  });

  it('normalizes assist and field-improve responses', () => {
    expect(
      normalizeServiceAssistResult({
        patch: {
          customer: 'Billing contacts',
          constraints: ['Tax rules'],
        },
        fieldMeta: {
          customer: { reason: 'Explicit in notes' },
        },
        warnings: ['No outcome provided'],
      }, 'openai/gpt-5.4')
    ).toEqual({
      patch: {
        customer: 'Billing contacts',
        constraintsText: 'Tax rules',
      },
      fieldMeta: {
        customer: { reason: 'Explicit in notes' },
      },
      warnings: ['No outcome provided'],
      unmappedNotes: [],
      model: 'openai/gpt-5.4',
    });

    expect(
      normalizeServiceFieldImproveResult({
        suggestionText: 'Generate and issue accurate customer invoices.',
        reason: 'Adds specificity.',
      }, 'openai/gpt-5.4', 'purpose')
    ).toEqual({
      targetField: 'purpose',
      suggestionText: 'Generate and issue accurate customer invoices.',
      reason: 'Adds specificity.',
      model: 'openai/gpt-5.4',
    });
  });
});
