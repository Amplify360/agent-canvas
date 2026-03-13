import type { OpenRouterMessage } from '@/server/openrouter';
import type { StructuredAssistResult } from '@/ai/formAssist';
import type { ImportYamlAssistFormData, ImportYamlAssistRequest } from '@/canvas/yamlAssist';

type RawYamlAssistResponse = {
  patch?: Record<string, unknown>;
  fieldMeta?: Record<string, { reason?: unknown }>;
  warnings?: unknown;
  unmappedNotes?: unknown;
};

export function buildYamlAssistMessages(
  request: ImportYamlAssistRequest,
  promptOverride: string
): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You convert freeform notes into a valid AgentCanvas YAML document.',
        'Return JSON only.',
        'Do not invent facts.',
        'Use the exact YAML schema shown.',
        'Use only the provided tool ids and status values.',
        'If a field is uncertain, omit it from the YAML rather than guessing.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Instruction:\n${promptOverride.trim()}`,
        `Available tool ids: ${request.context.availableTools.join(', ')}`,
        `Available status values: ${request.context.availableStatuses.join(', ')}`,
        'Current context:',
        JSON.stringify(request.context.current, null, 2),
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "customTitle"?: string,',
          '    "yamlText"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
          'The yamlText must be valid YAML in this schema:',
          'specVersion: 2',
          'documentTitle: Example Canvas',
          'agents:',
          '  - name: Example Agent',
          '    phase: Backlog',
          '    agentOrder: 0',
          '    objective: Optional objective',
          '    description: Optional description',
          '    tools: [forms, web-search]',
          '    journeySteps: [Step 1, Step 2]',
          '    demoLink: https://example.com/demo',
          '    videoLink: https://example.com/video',
          '    metrics:',
          '      numberOfUsers: 10',
          '      timesUsed: 100',
          '      timeSaved: 5',
          '      roi: 2500',
          '    category: Example category',
          '    status: idea',
          '    fields:',
          '      customField: value',
        ].join('\n'),
      ].join('\n\n'),
    },
  ];
}

export function normalizeYamlAssistResult(
  raw: RawYamlAssistResponse,
  model: string
): StructuredAssistResult<ImportYamlAssistFormData, keyof ImportYamlAssistFormData & string> {
  const patch = normalizeYamlAssistPatch(raw.patch);
  return {
    patch,
    fieldMeta: normalizeFieldMeta(raw.fieldMeta),
    warnings: normalizeStringArray(raw.warnings),
    unmappedNotes: normalizeStringArray(raw.unmappedNotes),
    model,
  };
}

function normalizeYamlAssistPatch(rawPatch: unknown): Partial<ImportYamlAssistFormData> {
  if (!rawPatch || typeof rawPatch !== 'object') {
    return {};
  }

  const patch = rawPatch as Record<string, unknown>;
  const normalized: Partial<ImportYamlAssistFormData> = {};
  assignNormalizedString(normalized, 'customTitle', patch.customTitle);
  assignNormalizedString(normalized, 'yamlText', patch.yamlText);
  return normalized;
}

function normalizeFieldMeta(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw as Record<string, { reason?: unknown }>).reduce<Record<string, { reason?: string }>>((acc, [field, entry]) => {
    const reason = normalizeString(entry?.reason);
    if (reason) {
      acc[field] = { reason };
    }
    return acc;
  }, {});
}

function assignNormalizedString(target: Record<string, unknown>, field: string, value: unknown) {
  const normalized = normalizeString(value);
  if (normalized) {
    target[field] = normalized;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const normalized = normalizeString(entry);
    return normalized ? [normalized] : [];
  });
}
