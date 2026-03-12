import type { OpenRouterMessage } from '@/server/openrouter';
import {
  SERVICE_ASSIST_FIELDS,
  SERVICE_ASSIST_FIELD_LABELS,
  type ServiceAssistContext,
  type ServiceAssistField,
  type ServiceAssistPatch,
  type ServiceFieldImproveResult,
  type ServiceAssistResult,
} from '@/strategy/aiAssist';

const SERVICE_ASSIST_OUTPUT_FIELDS = [
  'name',
  'purpose',
  'customer',
  'trigger',
  'outcome',
  'constraints',
  'effectivenessMetric',
  'efficiencyMetric',
] as const;

type RawServiceAssistResponse = {
  patch?: Record<string, unknown>;
  fieldMeta?: Record<string, { reason?: unknown }>;
  warnings?: unknown;
  unmappedNotes?: unknown;
};

type RawFieldImproveResponse = {
  suggestionText?: unknown;
  reason?: unknown;
};

export function buildServiceGlobalExtractMessages({
  promptOverride,
  notes,
  context,
}: {
  promptOverride: string;
  notes: string;
  context: ServiceAssistContext;
}): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You convert freeform notes into a partial Transformation Map service form patch.',
        'Return JSON only.',
        'Do not invent facts.',
        'Use concise, operational language.',
        'If a field is uncertain, omit it from the patch.',
        'For constraints, return an array of strings.',
        'Do not return unchanged fields unless the notes clearly support an improvement.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Instruction:\n${promptOverride.trim()}`,
        'Service form fields:',
        SERVICE_ASSIST_OUTPUT_FIELDS.map((field) => `- ${field}`).join('\n'),
        'Current context:',
        JSON.stringify(context, null, 2),
        'Notes/transcript:',
        notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "name"?: string,',
          '    "purpose"?: string,',
          '    "customer"?: string,',
          '    "trigger"?: string,',
          '    "outcome"?: string,',
          '    "constraints"?: string[],',
          '    "effectivenessMetric"?: string,',
          '    "efficiencyMetric"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n'),
    },
  ];
}

export function buildServiceFieldImproveMessages({
  instruction,
  targetField,
  context,
}: {
  instruction: string;
  targetField: ServiceAssistField;
  context: ServiceAssistContext;
}): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You improve one field in a Transformation Map service form.',
        'Return JSON only.',
        'Do not invent facts.',
        'Preserve the underlying meaning and scope.',
        'Keep the output concise and operational.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Instruction:\n${instruction.trim()}`,
        `Target field: ${targetField} (${SERVICE_ASSIST_FIELD_LABELS[targetField]})`,
        'Full context:',
        JSON.stringify(context, null, 2),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "suggestionText": string,',
          '  "reason"?: string',
          '}',
        ].join('\n'),
      ].join('\n\n'),
    },
  ];
}

export function extractOpenRouterTextContent(response: unknown): string {
  const content = (response as {
    choices?: Array<{ message?: { content?: unknown } }>;
  })?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .flatMap((part) => {
        if (!part || typeof part !== 'object') {
          return [];
        }
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? [text] : [];
      })
      .join('\n')
      .trim();
  }

  throw new Error('OpenRouter response did not contain text content');
}

export function parseJsonObject<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('Model response did not contain a JSON object');
  }

  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as T;
}

export function normalizeServiceAssistResult(
  raw: RawServiceAssistResponse,
  model: string
): ServiceAssistResult {
  const patch = normalizeServiceAssistPatch(raw.patch);
  const fieldMeta = normalizeFieldMeta(raw.fieldMeta);
  return {
    patch,
    fieldMeta,
    warnings: normalizeStringArray(raw.warnings),
    unmappedNotes: normalizeStringArray(raw.unmappedNotes),
    model,
  };
}

export function normalizeServiceFieldImproveResult(
  raw: RawFieldImproveResponse,
  model: string,
  targetField: ServiceAssistField
): ServiceFieldImproveResult {
  const suggestionText = normalizeString(raw.suggestionText);
  if (!suggestionText) {
    throw new Error('Model response did not include suggestionText');
  }

  return {
    targetField,
    suggestionText,
    reason: normalizeString(raw.reason),
    model,
  };
}

export function normalizeServiceAssistPatch(rawPatch: unknown): ServiceAssistPatch {
  if (!rawPatch || typeof rawPatch !== 'object') {
    return {};
  }

  const patch = rawPatch as Record<string, unknown>;
  const normalized: ServiceAssistPatch = {};

  assignNormalizedString(normalized, 'name', patch.name);
  assignNormalizedString(normalized, 'purpose', patch.purpose);
  assignNormalizedString(normalized, 'customer', patch.customer);
  assignNormalizedString(normalized, 'trigger', patch.trigger);
  assignNormalizedString(normalized, 'outcome', patch.outcome);
  assignNormalizedString(normalized, 'effectivenessMetric', patch.effectivenessMetric);
  assignNormalizedString(normalized, 'efficiencyMetric', patch.efficiencyMetric);

  const normalizedConstraints = normalizeStringArray(patch.constraints);
  if (normalizedConstraints.length > 0) {
    normalized.constraintsText = normalizedConstraints.join('\n');
  }
  return normalized;
}

function normalizeFieldMeta(raw: unknown): Partial<Record<ServiceAssistField, { reason?: string }>> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const rawMeta = raw as Record<string, { reason?: unknown }>;
  return SERVICE_ASSIST_FIELDS.reduce<Partial<Record<ServiceAssistField, { reason?: string }>>>((acc, field) => {
    const entry = rawMeta[field];
    if (!entry || typeof entry !== 'object') {
      return acc;
    }
    const reason = normalizeString(entry.reason);
    if (reason) {
      acc[field] = { reason };
    }
    return acc;
  }, {});
}

function assignNormalizedString(
  patch: ServiceAssistPatch,
  field: keyof ServiceAssistPatch,
  value: unknown
) {
  const normalized = normalizeString(value);
  if (normalized) {
    patch[field] = normalized as never;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
}
