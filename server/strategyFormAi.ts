import type { OpenRouterMessage } from '@/server/openrouter';
import type { StructuredAssistResult } from '@/ai/formAssist';
import {
  DEVIATION_CLASSIFICATION_VALUES,
  DEVIATION_IMPACT_VALUES,
  DEVIATION_TREATMENT_VALUES,
  FLOW_STEP_TYPE_VALUES,
  INITIATIVE_STATUS_VALUES,
  type DepartmentEditorFormData,
  type DeviationEditorFormData,
  type FlowStepEditorFormData,
  type InitiativeAssistLinkedAgent,
  type InitiativeEditorFormData,
  type ObjectiveEditorFormData,
  type PressureEditorFormData,
  type StrategyFormAssistRequest,
} from '@/strategy/formAssist';

type RawStrategyAssistResponse = {
  patch?: Record<string, unknown>;
  fieldMeta?: Record<string, { reason?: unknown }>;
  warnings?: unknown;
  unmappedNotes?: unknown;
};

export function buildStrategyFormAssistMessages(
  request: StrategyFormAssistRequest,
  promptOverride: string
): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(request.formType),
    },
    {
      role: 'user',
      content: buildUserPrompt(request, promptOverride),
    },
  ];
}

export function normalizeStrategyFormAssistResult(
  raw: RawStrategyAssistResponse,
  request: StrategyFormAssistRequest,
  model: string
): StructuredAssistResult<any, string> {
  return {
    patch: normalizeStrategyPatch(raw.patch, request),
    fieldMeta: normalizeFieldMeta(raw.fieldMeta),
    warnings: normalizeStringArray(raw.warnings),
    unmappedNotes: normalizeStringArray(raw.unmappedNotes),
    model,
  };
}

function buildSystemPrompt(formType: StrategyFormAssistRequest['formType']) {
  const base = [
    'You convert freeform notes into a partial AgentCanvas strategy form patch.',
    'Return JSON only.',
    'Do not invent facts.',
    'Use concise, operational language.',
    'If a field is uncertain, omit it from the patch.',
  ];

  if (formType === 'objective') {
    base.push('Only link pressures clearly supported by the notes.');
  }
  if (formType === 'initiative') {
    base.push('Only include linked agents when both the name and role are explicit.');
  }
  return base.join('\n');
}

function buildUserPrompt(request: StrategyFormAssistRequest, promptOverride: string) {
  const contextBlock = JSON.stringify(request.context, null, 2);

  switch (request.formType) {
    case 'pressure':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "type"?: "external" | "internal",',
          '    "title"?: string,',
          '    "description"?: string,',
          '    "evidenceText"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n');
    case 'objective':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        'Available pressures:',
        request.context.availablePressures.map((pressure) => `- ${pressure.id}: ${pressure.title} (${pressure.type})`).join('\n'),
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "title"?: string,',
          '    "description"?: string,',
          '    "linkedPressures"?: string[]',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
          'Use pressure ids or exact pressure titles in linkedPressures.',
        ].join('\n'),
      ].join('\n\n');
    case 'department':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "name"?: string,',
          '    "description"?: string,',
          '    "keyIssuesText"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n');
    case 'flow-step':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        `Available step types: ${FLOW_STEP_TYPE_VALUES.join(', ')}`,
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "description"?: string,',
          '    "stepType"?: string,',
          '    "hasDeviation"?: boolean,',
          '    "parallelGroup"?: string,',
          '    "groupLabel"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n');
    case 'deviation':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        `Available impact values: ${DEVIATION_IMPACT_VALUES.join(', ')}`,
        `Available treatment values: ${DEVIATION_TREATMENT_VALUES.join(', ')}`,
        `Available classification values: ${DEVIATION_CLASSIFICATION_VALUES.join(', ')}`,
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "what"?: string,',
          '    "why"?: string,',
          '    "necessary"?: boolean,',
          '    "impact"?: string,',
          '    "treatment"?: string,',
          '    "classification"?: string',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n');
    case 'initiative':
      return [
        `Instruction:\n${promptOverride.trim()}`,
        `Available status values: ${INITIATIVE_STATUS_VALUES.join(', ')}`,
        'Current context:',
        contextBlock,
        'Notes/transcript:',
        request.notes.trim(),
        [
          'Return a JSON object with this shape:',
          '{',
          '  "patch": {',
          '    "title"?: string,',
          '    "description"?: string,',
          '    "status"?: string,',
          '    "linkedAgents"?: Array<{ "name": string, "role": string }>',
          '  },',
          '  "fieldMeta"?: { "<field>": { "reason"?: string } },',
          '  "warnings"?: string[],',
          '  "unmappedNotes"?: string[]',
          '}',
        ].join('\n'),
      ].join('\n\n');
  }
}

function normalizeStrategyPatch(rawPatch: unknown, request: StrategyFormAssistRequest) {
  if (!rawPatch || typeof rawPatch !== 'object') {
    return {};
  }

  const patch = rawPatch as Record<string, unknown>;

  switch (request.formType) {
    case 'pressure':
      return normalizePressurePatch(patch);
    case 'objective':
      return normalizeObjectivePatch(patch, request.context.availablePressures);
    case 'department':
      return normalizeDepartmentPatch(patch);
    case 'flow-step':
      return normalizeFlowStepPatch(patch);
    case 'deviation':
      return normalizeDeviationPatch(patch);
    case 'initiative':
      return normalizeInitiativePatch(patch);
  }
}

function normalizePressurePatch(patch: Record<string, unknown>): Partial<PressureEditorFormData> {
  const normalized: Partial<PressureEditorFormData> = {};
  const type = normalizeEnum(patch.type, ['external', 'internal'] as const);
  if (type) normalized.type = type;
  assignNormalizedString(normalized, 'title', patch.title);
  assignNormalizedString(normalized, 'description', patch.description);
  assignNormalizedString(normalized, 'evidenceText', patch.evidenceText);
  return normalized;
}

function normalizeObjectivePatch(
  patch: Record<string, unknown>,
  availablePressures: Array<{ id: string; title: string }>
): Partial<ObjectiveEditorFormData> {
  const normalized: Partial<ObjectiveEditorFormData> = {};
  assignNormalizedString(normalized, 'title', patch.title);
  assignNormalizedString(normalized, 'description', patch.description);

  const linkedPressures = normalizePressureRefs(patch.linkedPressures, availablePressures);
  if (linkedPressures.length > 0) {
    normalized.linkedPressureIds = linkedPressures;
  }
  return normalized;
}

function normalizeDepartmentPatch(patch: Record<string, unknown>): Partial<DepartmentEditorFormData> {
  const normalized: Partial<DepartmentEditorFormData> = {};
  assignNormalizedString(normalized, 'name', patch.name);
  assignNormalizedString(normalized, 'description', patch.description);
  assignNormalizedString(normalized, 'keyIssuesText', patch.keyIssuesText);
  return normalized;
}

function normalizeFlowStepPatch(patch: Record<string, unknown>): Partial<FlowStepEditorFormData> {
  const normalized: Partial<FlowStepEditorFormData> = {};
  assignNormalizedString(normalized, 'description', patch.description);
  const stepType = normalizeEnum(patch.stepType, FLOW_STEP_TYPE_VALUES);
  if (stepType) normalized.stepType = stepType;
  const hasDeviation = normalizeBoolean(patch.hasDeviation);
  if (hasDeviation !== undefined) normalized.hasDeviation = hasDeviation;
  assignNormalizedString(normalized, 'parallelGroup', patch.parallelGroup);
  assignNormalizedString(normalized, 'groupLabel', patch.groupLabel);
  return normalized;
}

function normalizeDeviationPatch(patch: Record<string, unknown>): Partial<DeviationEditorFormData> {
  const normalized: Partial<DeviationEditorFormData> = {};
  assignNormalizedString(normalized, 'what', patch.what);
  assignNormalizedString(normalized, 'why', patch.why);
  const necessary = normalizeBoolean(patch.necessary);
  if (necessary !== undefined) normalized.necessary = necessary;
  const impact = normalizeEnum(patch.impact, DEVIATION_IMPACT_VALUES);
  if (impact) normalized.impact = impact;
  const treatment = normalizeEnum(patch.treatment, DEVIATION_TREATMENT_VALUES);
  if (treatment) normalized.treatment = treatment;
  const classification = normalizeEnum(patch.classification, DEVIATION_CLASSIFICATION_VALUES);
  if (classification) normalized.classification = classification;
  return normalized;
}

function normalizeInitiativePatch(patch: Record<string, unknown>): Partial<InitiativeEditorFormData> {
  const normalized: Partial<InitiativeEditorFormData> = {};
  assignNormalizedString(normalized, 'title', patch.title);
  assignNormalizedString(normalized, 'description', patch.description);
  const status = normalizeEnum(patch.status, INITIATIVE_STATUS_VALUES);
  if (status) normalized.status = status;
  const linkedAgents = normalizeLinkedAgents(patch.linkedAgents);
  if (linkedAgents.length > 0) {
    normalized.linkedAgents = linkedAgents;
  }
  return normalized;
}

function normalizePressureRefs(
  value: unknown,
  availablePressures: Array<{ id: string; title: string }>
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const byId = new Map(availablePressures.map((pressure) => [pressure.id, pressure.id]));
  const byTitle = new Map(availablePressures.map((pressure) => [pressure.title.trim().toLowerCase(), pressure.id]));

  const ids: string[] = [];
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    const mapped = byId.get(normalized) || byTitle.get(normalized.toLowerCase());
    if (mapped && !ids.includes(mapped)) {
      ids.push(mapped);
    }
  }
  return ids;
}

function normalizeLinkedAgents(value: unknown): InitiativeAssistLinkedAgent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }
    const candidate = entry as Record<string, unknown>;
    const name = normalizeString(candidate.name);
    const role = normalizeString(candidate.role);
    return name && role ? [{ name, role }] : [];
  });
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

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === 'no') return false;
  }
  return undefined;
}

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? normalized as T[number] : undefined;
}
