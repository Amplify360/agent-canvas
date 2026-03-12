import { describe, expect, it } from 'vitest';
import { linesToText, normalizeOptionalString, normalizeOrderedFlowSteps, textToLines } from '@/strategy/editorUtils';

describe('Transformation Map editor utils', () => {
  it('round-trips line-based textarea values', () => {
    const lines = textToLines(' One \n\nTwo\n  Three  ');
    expect(lines).toEqual(['One', 'Two', 'Three']);
    expect(linesToText(lines)).toBe('One\nTwo\nThree');
  });

  it('normalizes flow step ordering and optional group fields', () => {
    const normalized = normalizeOrderedFlowSteps([
      {
        id: 'step-2',
        serviceId: 'svc-1',
        flowType: 'ideal',
        order: 4,
        description: 'Later step',
        stepType: 'process',
        parallelGroup: '  ',
      },
      {
        id: 'step-1',
        serviceId: 'svc-1',
        flowType: 'ideal',
        order: 2,
        description: 'Earlier step',
        stepType: 'input',
        groupLabel: ' Inputs ',
      },
    ]);

    expect(normalized.map((step) => step.order)).toEqual([1, 2]);
    expect(normalized[0].groupLabel).toBe('Inputs');
    expect(normalized[1].parallelGroup).toBeUndefined();
  });

  it('normalizes optional strings', () => {
    expect(normalizeOptionalString('  label  ')).toBe('label');
    expect(normalizeOptionalString('   ')).toBeUndefined();
  });
});
