import type { Department, Service, StrategicObjective, StrategicPressure } from './types';

export const DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT =
  'Translate the notes into concrete service fields. Prefer specific, operational language. Preserve facts from the notes and context. Leave uncertain fields unchanged.';

export const DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT =
  'Improve this field so it is clearer, more operational, and better aligned with the surrounding form context. Keep the meaning intact and do not invent facts.';

export const SERVICE_ASSIST_MODEL_FALLBACK = 'openai/gpt-5.4';
export const SERVICE_TRANSCRIBE_MODEL_FALLBACK = 'openai/gpt-4o-audio-preview';

export interface ServiceEditorFormData {
  name: string;
  purpose: string;
  customer: string;
  trigger: string;
  outcome: string;
  constraintsText: string;
  status: Service['status'];
  effectivenessMetric: string;
  efficiencyMetric: string;
}

export type ServiceAssistField =
  | 'name'
  | 'purpose'
  | 'customer'
  | 'trigger'
  | 'outcome'
  | 'constraintsText'
  | 'effectivenessMetric'
  | 'efficiencyMetric';

export type ServiceAssistPatch = Partial<ServiceEditorFormData>;

export interface ServiceAssistFieldMeta {
  reason?: string;
}

export interface ServiceAssistContext {
  mapTitle?: string;
  pressures: Array<Pick<StrategicPressure, 'type' | 'title' | 'description'>>;
  enterpriseObjectives: Array<Pick<StrategicObjective, 'title' | 'description'>>;
  department?: Pick<Department, 'id' | 'name' | 'description' | 'keyIssues'> | null;
  departmentObjectives: Array<Pick<StrategicObjective, 'title' | 'description'>>;
  service: ServiceEditorFormData;
}

export interface ServiceAssistResult {
  patch: ServiceAssistPatch;
  fieldMeta: Partial<Record<keyof ServiceEditorFormData, ServiceAssistFieldMeta>>;
  warnings: string[];
  unmappedNotes: string[];
  model: string;
}

export interface ServiceFieldImproveResult {
  targetField: ServiceAssistField;
  suggestionText: string;
  reason?: string;
  model: string;
}

export type ServiceAssistRequest =
  | {
      mode: 'global_extract';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: ServiceAssistContext;
    }
  | {
      mode: 'field_improve';
      model?: string;
      promptOverride?: string;
      targetField: ServiceAssistField;
      context: ServiceAssistContext;
    };

export interface ServiceTranscribeResult {
  transcript: string;
  model: string;
}

export const SERVICE_ASSIST_FIELD_LABELS: Record<ServiceAssistField, string> = {
  name: 'Name',
  purpose: 'Purpose',
  customer: 'Customer',
  trigger: 'Trigger',
  outcome: 'Outcome',
  constraintsText: 'Constraints',
  effectivenessMetric: 'Effectiveness',
  efficiencyMetric: 'Efficiency',
};

export const SERVICE_ASSIST_FIELDS: ServiceAssistField[] = [
  'name',
  'purpose',
  'customer',
  'trigger',
  'outcome',
  'constraintsText',
  'effectivenessMetric',
  'efficiencyMetric',
];

export function buildServiceEditorFormData(service: Service): ServiceEditorFormData {
  return {
    name: service.name,
    purpose: service.purpose,
    customer: service.customer,
    trigger: service.trigger,
    outcome: service.outcome,
    constraintsText: service.constraints.join('\n'),
    status: service.status,
    effectivenessMetric: service.effectivenessMetric,
    efficiencyMetric: service.efficiencyMetric,
  };
}

export function applyServiceAssistPatch(
  current: ServiceEditorFormData,
  patch: ServiceAssistPatch,
  fillEmptyOnly = false
): ServiceEditorFormData {
  const next = { ...current };
  const effectivePatch = filterServiceAssistPatch(current, patch, fillEmptyOnly);

  for (const field of SERVICE_ASSIST_FIELDS) {
    const value = effectivePatch[field];
    if (value === undefined) {
      continue;
    }
    next[field] = value;
  }

  return next;
}

export function filterServiceAssistPatch(
  current: ServiceEditorFormData,
  patch: ServiceAssistPatch,
  fillEmptyOnly = false
): ServiceAssistPatch {
  if (!fillEmptyOnly) {
    return patch;
  }

  return SERVICE_ASSIST_FIELDS.reduce<ServiceAssistPatch>((acc, field) => {
    const value = patch[field];
    if (value === undefined) {
      return acc;
    }
    if (current[field].trim().length > 0) {
      return acc;
    }
    acc[field] = value;
    return acc;
  }, {});
}

export function getServiceAssistDiff(
  current: ServiceEditorFormData,
  patch: ServiceAssistPatch
): Array<{ field: ServiceAssistField; currentValue: string; proposedValue: string }> {
  return SERVICE_ASSIST_FIELDS.flatMap((field) => {
    const proposedValue = patch[field];
    if (proposedValue === undefined || proposedValue === current[field]) {
      return [];
    }

    return [{
      field,
      currentValue: current[field],
      proposedValue,
    }];
  });
}

export function createEmptyServiceAssistSelection(
  patch: ServiceAssistPatch
): Record<ServiceAssistField, boolean> {
  return SERVICE_ASSIST_FIELDS.reduce<Record<ServiceAssistField, boolean>>((acc, field) => {
    acc[field] = patch[field] !== undefined;
    return acc;
  }, {
    name: false,
    purpose: false,
    customer: false,
    trigger: false,
    outcome: false,
    constraintsText: false,
    effectivenessMetric: false,
    efficiencyMetric: false,
  });
}
