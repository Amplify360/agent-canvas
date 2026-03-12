import type { AgentFormData, AgentMetrics } from '@/types/agent';
import { AGENT_STATUS, type AgentStatus } from '@/types/validationConstants';

export const DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT =
  'Translate the notes into concrete agent form fields. Prefer specific, operational language. Preserve facts from the notes and context. Leave uncertain fields unchanged.';

export const AGENT_ASSIST_MODEL_FALLBACK = 'openai/gpt-5.4';
export const AGENT_TRANSCRIBE_MODEL_FALLBACK = 'openai/gpt-4o-audio-preview';

export interface AgentAssistFormData {
  name: string;
  phase: string;
  objective: string;
  description: string;
  tools: string[];
  journeySteps: string[];
  demoLink: string;
  videoLink: string;
  metrics: AgentMetrics;
  category: string;
  status: AgentStatus;
}

export type AgentAssistField =
  | 'name'
  | 'phase'
  | 'objective'
  | 'description'
  | 'tools'
  | 'journeySteps'
  | 'demoLink'
  | 'videoLink'
  | 'metrics'
  | 'category'
  | 'status';

export type AgentAssistPatch = Partial<AgentAssistFormData>;

export interface AgentAssistFieldMeta {
  reason?: string;
}

export interface AgentAssistContext {
  current: AgentAssistFormData;
  availableTools: Array<{ id: string; label: string }>;
  availableStatuses: Array<{ value: AgentStatus; label: string }>;
  existingCategories: string[];
}

export interface AgentAssistResult {
  patch: AgentAssistPatch;
  fieldMeta: Partial<Record<AgentAssistField, AgentAssistFieldMeta>>;
  warnings: string[];
  unmappedNotes: string[];
  model: string;
}

export interface AgentAssistRequest {
  model?: string;
  promptOverride?: string;
  notes: string;
  context: AgentAssistContext;
}

export interface AgentTranscribeResult {
  transcript: string;
  model: string;
}

export const AGENT_ASSIST_FIELD_LABELS: Record<AgentAssistField, string> = {
  name: 'Agent Name',
  phase: 'Implementation Phase',
  objective: 'Objective',
  description: 'Description',
  tools: 'Tools',
  journeySteps: 'Journey Steps',
  demoLink: 'Demo Link',
  videoLink: 'Video Link',
  metrics: 'Metrics',
  category: 'Category',
  status: 'Status',
};

export const AGENT_ASSIST_FIELDS: AgentAssistField[] = [
  'name',
  'phase',
  'objective',
  'description',
  'tools',
  'journeySteps',
  'demoLink',
  'videoLink',
  'metrics',
  'category',
  'status',
];

const AGENT_METRIC_LABELS: Record<keyof AgentMetrics, string> = {
  numberOfUsers: 'Number of users',
  timesUsed: 'Times used',
  timeSaved: 'Time saved (hours)',
  roi: 'ROI ($)',
};

export function buildAgentAssistFormData(formData: AgentFormData): AgentAssistFormData {
  return {
    name: formData.name,
    phase: formData.phase,
    objective: formData.objective || '',
    description: formData.description || '',
    tools: formData.tools,
    journeySteps: formData.journeySteps,
    demoLink: formData.demoLink || '',
    videoLink: formData.videoLink || '',
    metrics: formData.metrics || {},
    category: formData.category || '',
    status: formData.status || AGENT_STATUS.IDEA,
  };
}

export function filterAgentAssistPatch(
  current: AgentAssistFormData,
  patch: AgentAssistPatch,
  fillEmptyOnly = false
): AgentAssistPatch {
  if (!fillEmptyOnly) {
    return patch;
  }

  return AGENT_ASSIST_FIELDS.reduce<AgentAssistPatch>((acc, field) => {
    const value = patch[field];
    if (value === undefined) {
      return acc;
    }
    if (isAgentAssistFieldPopulated(current, field)) {
      return acc;
    }
    acc[field] = value as never;
    return acc;
  }, {});
}

export function applyAgentAssistPatch(
  current: AgentAssistFormData,
  patch: AgentAssistPatch,
  fillEmptyOnly = false
): AgentAssistFormData {
  const effectivePatch = filterAgentAssistPatch(current, patch, fillEmptyOnly);
  return {
    ...current,
    ...effectivePatch,
    metrics: effectivePatch.metrics
      ? {
          ...current.metrics,
          ...effectivePatch.metrics,
        }
      : current.metrics,
  };
}

export function getAgentAssistDiff(
  current: AgentAssistFormData,
  patch: AgentAssistPatch
): Array<{ field: AgentAssistField; currentValue: string; proposedValue: string }> {
  return AGENT_ASSIST_FIELDS.flatMap((field) => {
    const proposedValue = patch[field];
    if (proposedValue === undefined || areAgentAssistValuesEqual(current[field], proposedValue)) {
      return [];
    }

    return [{
      field,
      currentValue: formatAgentAssistValue(field, current[field]),
      proposedValue: formatAgentAssistValue(field, proposedValue),
    }];
  });
}

export function createEmptyAgentAssistSelection(
  patch: AgentAssistPatch
): Record<AgentAssistField, boolean> {
  return AGENT_ASSIST_FIELDS.reduce<Record<AgentAssistField, boolean>>((acc, field) => {
    acc[field] = patch[field] !== undefined;
    return acc;
  }, {
    name: false,
    phase: false,
    objective: false,
    description: false,
    tools: false,
    journeySteps: false,
    demoLink: false,
    videoLink: false,
    metrics: false,
    category: false,
    status: false,
  });
}

export function formatAgentAssistValue(
  field: AgentAssistField,
  value: AgentAssistFormData[AgentAssistField] | NonNullable<AgentAssistPatch[AgentAssistField]>
): string {
  if (field === 'tools' || field === 'journeySteps') {
    return Array.isArray(value) && value.length > 0 ? value.join('\n') : 'Empty';
  }

  if (field === 'metrics') {
    const metrics = value as AgentMetrics | undefined;
    const entries = Object.entries(metrics || {}).flatMap(([key, metricValue]) => {
      if (metricValue === undefined || metricValue === null) {
        return [];
      }
      const typedKey = key as keyof AgentMetrics;
      return [`${AGENT_METRIC_LABELS[typedKey]}: ${metricValue}`];
    });
    return entries.length > 0 ? entries.join('\n') : 'Empty';
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || 'Empty';
}

function isAgentAssistFieldPopulated(
  current: AgentAssistFormData,
  field: AgentAssistField
): boolean {
  const value = current[field];
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Object.keys(value || {}).length > 0;
}

function areAgentAssistValuesEqual(
  current: AgentAssistFormData[AgentAssistField],
  proposed: NonNullable<AgentAssistPatch[AgentAssistField]>
): boolean {
  if (typeof current === 'string' && typeof proposed === 'string') {
    return current === proposed;
  }
  if (Array.isArray(current) && Array.isArray(proposed)) {
    return current.length === proposed.length &&
      current.every((entry, index) => entry === proposed[index]);
  }
  return JSON.stringify(current || {}) === JSON.stringify(proposed || {});
}
