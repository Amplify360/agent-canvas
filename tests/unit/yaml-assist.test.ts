import { describe, expect, it } from 'vitest';
import { buildImportYamlAssistContext } from '@/canvas/yamlAssist';
import {
  buildYamlAssistMessages,
  normalizeYamlAssistResult,
} from '@/server/yamlAssist';

describe('yaml assist helpers', () => {
  it('builds prompt messages with available tool and status context', () => {
    const context = buildImportYamlAssistContext({
      customTitle: '',
      yamlText: '',
    });

    const messages = buildYamlAssistMessages({
      notes: 'Generate a sales workflow canvas',
      context,
    }, 'Create YAML');

    expect(messages[1]?.content).toContain('Available tool ids:');
    expect(messages[1]?.content).toContain('Available status values:');
    expect(messages[1]?.content).toContain('Generate a sales workflow canvas');
  });

  it('normalizes yaml assist responses', () => {
    expect(
      normalizeYamlAssistResult({
        patch: {
          customTitle: ' Revenue Ops ',
          yamlText: 'specVersion: 2\ndocumentTitle: Revenue Ops',
        },
        fieldMeta: {
          yamlText: { reason: 'Derived from workshop notes' },
        },
        warnings: ['Metrics omitted'],
      }, 'openai/gpt-5.4')
    ).toEqual({
      patch: {
        customTitle: 'Revenue Ops',
        yamlText: 'specVersion: 2\ndocumentTitle: Revenue Ops',
      },
      fieldMeta: {
        yamlText: { reason: 'Derived from workshop notes' },
      },
      warnings: ['Metrics omitted'],
      unmappedNotes: [],
      model: 'openai/gpt-5.4',
    });
  });
});
