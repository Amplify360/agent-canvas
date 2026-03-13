import type { OpenRouterMessage } from '@/server/openrouter';
import type { AgentStatus } from '@/types/validationConstants';
import {
  AGENT_ASSIST_FIELDS,
  type AgentAssistContext,
  type AgentAssistField,
  type AgentAssistPatch,
  type AgentAssistResult,
} from '@/agents/aiAssist';

type RawAgentAssistResponse = {
  patch?: Record<string, unknown>;
  fieldMeta?: Record<string, { reason?: unknown }>;
  warnings?: unknown;
  unmappedNotes?: unknown;
};

const AGENT_METRIC_KEYS = [
  'numberOfUsers',
  'timesUsed',
  'timeSaved',
  'roi',
] as const;

export function buildAgentGlobalExtractMessages({
  promptOverride,
  notes,
  context,
}: {
  promptOverride: string;
  notes: string;
  context: AgentAssistContext;
}): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You convert freeform notes into a partial Agent Canvas agent form patch.',
        'Return JSON only.',
        'Do not invent facts.',
        'Use concise, operational language.',
        'If a field is uncertain, omit it from the patch.',
        'Use only tool ids from the available tool list.',
        'Use only status values from the available status list.',
        'Only set demoLink or videoLink if the notes explicitly provide them.',
        'Metrics must be numeric when provided.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Instruction:\n${promptOverride.trim()}`,
        'Available tools:',
        context.availableTools.map((tool) => `- ${tool.id}: ${tool.label}`).join('\n'),
        'Available statuses:',
        context.availableStatuses.map((status) => `- ${status.value}: ${status.label}`).join('\n'),
        'Existing categories:',
        context.existingCategories.length > 0
          ? context.existingCategories.map((category) => `- ${category}`).join('\n')
          : '- None',
        'Current context:',
        JSON.stringify(context, null, 2),
        'Notes/transcript:',
        notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "name"?: string,',
          '    "phase"?: string,',
          '    "objective"?: string,',
          '    "description"?: string,',
          '    "tools"?: string[],',
          '    "journeySteps"?: string[],',
          '    "demoLink"?: string,',
          '    "videoLink"?: string,',
          '    "metrics"?: {',
          '      "numberOfUsers"?: number,',
          '      "timesUsed"?: number,',
          '      "timeSaved"?: number,',
          '      "roi"?: number',
          '    },',
          '    "category"?: string,',
          '    "status"?: string',
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

export function normalizeAgentAssistResult(
  raw: RawAgentAssistResponse,
  model: string,
  context: AgentAssistContext
): AgentAssistResult {
  const patch = normalizeAgentAssistPatch(raw.patch, context);
  const fieldMeta = normalizeFieldMeta(raw.fieldMeta);
  return {
    patch,
    fieldMeta,
    warnings: normalizeStringArray(raw.warnings),
    unmappedNotes: normalizeStringArray(raw.unmappedNotes),
    model,
  };
}

export function normalizeAgentAssistPatch(
  rawPatch: unknown,
  context: AgentAssistContext
): AgentAssistPatch {
  if (!rawPatch || typeof rawPatch !== 'object') {
    return {};
  }

  const patch = rawPatch as Record<string, unknown>;
  const normalized: AgentAssistPatch = {};

  assignNormalizedString(normalized, 'name', patch.name);
  assignNormalizedString(normalized, 'phase', patch.phase);
  assignNormalizedString(normalized, 'objective', patch.objective);
  assignNormalizedString(normalized, 'description', patch.description);
  assignNormalizedString(normalized, 'category', patch.category);

  const normalizedStatus = normalizeStatus(patch.status, context.availableStatuses.map((status) => status.value));
  if (normalizedStatus) {
    normalized.status = normalizedStatus;
  }

  const normalizedTools = normalizeToolList(patch.tools, context);
  if (normalizedTools.length > 0) {
    normalized.tools = normalizedTools;
  }

  const normalizedJourneySteps = normalizeStringArray(patch.journeySteps);
  if (normalizedJourneySteps.length > 0) {
    normalized.journeySteps = normalizedJourneySteps;
  }

  const demoLink = normalizeUrl(patch.demoLink);
  if (demoLink) {
    normalized.demoLink = demoLink;
  }

  const videoLink = normalizeUrl(patch.videoLink);
  if (videoLink) {
    normalized.videoLink = videoLink;
  }

  const metrics = normalizeMetrics(patch.metrics);
  if (metrics) {
    normalized.metrics = metrics;
  }

  return normalized;
}

function normalizeFieldMeta(raw: unknown): Partial<Record<AgentAssistField, { reason?: string }>> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const rawMeta = raw as Record<string, { reason?: unknown }>;
  return AGENT_ASSIST_FIELDS.reduce<Partial<Record<AgentAssistField, { reason?: string }>>>((acc, field) => {
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
  patch: AgentAssistPatch,
  field: keyof AgentAssistPatch,
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

  return value.flatMap((entry) => {
    const normalized = normalizeString(entry);
    return normalized ? [normalized] : [];
  });
}

function normalizeStatus(
  value: unknown,
  availableStatuses: AgentStatus[]
): AgentStatus | undefined {
  const normalized = normalizeString(value)?.toLowerCase().replace(/\s+/g, '-');
  if (!normalized) {
    return undefined;
  }
  return availableStatuses.includes(normalized as AgentStatus) ? normalized as AgentStatus : undefined;
}

function normalizeToolList(value: unknown, context: AgentAssistContext): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const toolLookup = new Map<string, string>();
  for (const tool of context.availableTools) {
    toolLookup.set(canonicalizeToolToken(tool.id), tool.id);
    toolLookup.set(canonicalizeToolToken(tool.label), tool.id);
  }

  const tools: string[] = [];
  for (const entry of value) {
    const token = normalizeString(entry);
    if (!token) {
      continue;
    }
    const mappedTool = toolLookup.get(canonicalizeToolToken(token));
    if (mappedTool && !tools.includes(mappedTool)) {
      tools.push(mappedTool);
    }
  }
  return tools;
}

function canonicalizeToolToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-');
}

function normalizeMetrics(value: unknown): NonNullable<AgentAssistPatch['metrics']> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const rawMetrics = value as Record<string, unknown>;
  const metrics: NonNullable<AgentAssistPatch['metrics']> = {};

  for (const key of AGENT_METRIC_KEYS) {
    const metricValue = normalizeNumber(rawMetrics[key]);
    if (metricValue !== undefined) {
      metrics[key] = metricValue;
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeUrl(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  try {
    new URL(normalized);
    return normalized;
  } catch {
    return undefined;
  }
}
