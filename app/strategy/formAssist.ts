import type {
  Department,
  Deviation,
  DeviationClassification,
  DeviationImpact,
  DeviationTreatment,
  FlowStep,
  FlowStepType,
  Initiative,
  LinkedAgent,
  StrategicObjective,
  StrategicPressure,
} from '@/strategy/types';
import type { StructuredAssistFieldConfig } from '@/ai/formAssist';

export type PressureEditorFormData = Pick<StrategicPressure, 'type' | 'title' | 'description'> & {
  evidenceText: string;
};

export type ObjectiveEditorFormData = Pick<StrategicObjective, 'title' | 'description' | 'linkedPressureIds'>;

export type DepartmentEditorFormData = Pick<Department, 'name' | 'description'> & {
  keyIssuesText: string;
};

export type FlowStepEditorFormData = Pick<FlowStep, 'description' | 'stepType'> & {
  hasDeviation: boolean;
  parallelGroup: string;
  groupLabel: string;
};

export type DeviationEditorFormData = Pick<Deviation, 'what' | 'why' | 'necessary' | 'impact' | 'treatment' | 'classification'>;

export type InitiativeAssistLinkedAgent = Pick<LinkedAgent, 'name' | 'role'>;

export type InitiativeEditorFormData = Pick<Initiative, 'title' | 'description' | 'status'> & {
  linkedAgents: InitiativeAssistLinkedAgent[];
};

export const DEFAULT_PRESSURE_ASSIST_PROMPT =
  'Translate the notes into a concrete strategic pressure entry. Keep the title crisp, the description specific, and include evidence only when explicitly supported by the notes.';

export const DEFAULT_OBJECTIVE_ASSIST_PROMPT =
  'Translate the notes into a concrete strategic objective. Keep the title crisp, the description operational, and link only the pressures clearly supported by the notes.';

export const DEFAULT_DEPARTMENT_ASSIST_PROMPT =
  'Translate the notes into a concrete department profile. Keep the description concise and convert key issues into distinct bullet-style lines.';

export const DEFAULT_FLOW_STEP_ASSIST_PROMPT =
  'Translate the notes into a concrete flow step. Choose the step type that best matches the described work and set deviation flags only when clearly implied.';

export const DEFAULT_DEVIATION_ASSIST_PROMPT =
  'Translate the notes into a concrete process deviation. Be precise about what happens, why it happens, and choose the impact, treatment, and classification that best match the notes.';

export const DEFAULT_INITIATIVE_ASSIST_PROMPT =
  'Translate the notes into a concrete improvement initiative. Keep the title crisp, the description specific, and include linked agents only when their role is explicit in the notes.';

export const STRATEGY_FORM_ASSIST_MODEL_FALLBACK = 'openai/gpt-5.4';

export const PRESSURE_FIELDS: ReadonlyArray<StructuredAssistFieldConfig<PressureEditorFormData, keyof PressureEditorFormData & string>> = [
  { key: 'type', label: 'Type', formatValue: (value) => value === 'external' ? 'External' : 'Internal' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'evidenceText', label: 'Evidence', formatValue: (value) => formatTextBlock(value) },
] as const;

export const DEPARTMENT_FIELDS: ReadonlyArray<StructuredAssistFieldConfig<DepartmentEditorFormData, keyof DepartmentEditorFormData & string>> = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'keyIssuesText', label: 'Key Issues', formatValue: (value) => formatTextBlock(value) },
] as const;

export const FLOW_STEP_FIELDS: ReadonlyArray<StructuredAssistFieldConfig<FlowStepEditorFormData, keyof FlowStepEditorFormData & string>> = [
  { key: 'description', label: 'Description' },
  { key: 'stepType', label: 'Step Type' },
  { key: 'hasDeviation', label: 'Highlights a deviation', formatValue: (value) => value ? 'Yes' : 'No' },
  { key: 'parallelGroup', label: 'Parallel Group' },
  { key: 'groupLabel', label: 'Group Label' },
] as const;

export const DEVIATION_FIELDS: ReadonlyArray<StructuredAssistFieldConfig<DeviationEditorFormData, keyof DeviationEditorFormData & string>> = [
  { key: 'what', label: 'What' },
  { key: 'why', label: 'Why' },
  { key: 'necessary', label: 'Required?', formatValue: (value) => value ? 'Yes' : 'No' },
  { key: 'impact', label: 'Impact' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'classification', label: 'Classification' },
] as const;

export const OBJECTIVE_FIELDS = (
  pressureTitleById: Map<string, string>
): ReadonlyArray<StructuredAssistFieldConfig<ObjectiveEditorFormData, keyof ObjectiveEditorFormData & string>> => [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  {
    key: 'linkedPressureIds',
    label: 'Linked Pressures',
    formatValue: (value) => formatIdList(value as string[], pressureTitleById),
    isEqual: (currentValue, proposedValue) => normalizeStringArray(currentValue).join('|') === normalizeStringArray(proposedValue).join('|'),
  },
] as const;

export const INITIATIVE_FIELDS: ReadonlyArray<StructuredAssistFieldConfig<InitiativeEditorFormData, keyof InitiativeEditorFormData & string>> = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  {
    key: 'linkedAgents',
    label: 'Linked Agents',
    formatValue: (value) => formatLinkedAgents(value as InitiativeAssistLinkedAgent[]),
    isEqual: (currentValue, proposedValue) => formatLinkedAgents(currentValue as InitiativeAssistLinkedAgent[]) === formatLinkedAgents(proposedValue as InitiativeAssistLinkedAgent[]),
  },
] as const;

export type StrategyFormAssistRequest =
  | {
      formType: 'pressure';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: PressureEditorFormData;
      };
    }
  | {
      formType: 'objective';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: ObjectiveEditorFormData;
        availablePressures: Array<Pick<StrategicPressure, 'id' | 'type' | 'title' | 'description'>>;
      };
    }
  | {
      formType: 'department';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: DepartmentEditorFormData;
      };
    }
  | {
      formType: 'flow-step';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: FlowStepEditorFormData;
        flowLabel: string;
      };
    }
  | {
      formType: 'deviation';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: DeviationEditorFormData;
      };
    }
  | {
      formType: 'initiative';
      model?: string;
      promptOverride?: string;
      notes: string;
      context: {
        current: InitiativeEditorFormData;
      };
    };

export const FLOW_STEP_TYPE_VALUES: FlowStepType[] = [
  'input',
  'process',
  'output',
  'control',
  'approval',
  'handoff',
  'rework',
  'exception',
];

export const DEVIATION_IMPACT_VALUES: DeviationImpact[] = ['high', 'medium', 'low'];
export const DEVIATION_TREATMENT_VALUES: DeviationTreatment[] = ['automate', 'eliminate', 'simplify', 'accept'];
export const DEVIATION_CLASSIFICATION_VALUES: DeviationClassification[] = [
  'approval',
  'handoff',
  'rework',
  'system-constraint',
  'exception',
  'control',
];
export const INITIATIVE_STATUS_VALUES: Initiative['status'][] = ['proposed', 'approved', 'in-progress', 'done', 'parked'];

function formatTextBlock(value: string) {
  return value.trim() || 'Empty';
}

function formatIdList(value: string[], titleById: Map<string, string>) {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Empty';
  }
  return value.map((id) => titleById.get(id) || id).join('\n');
}

function formatLinkedAgents(value: InitiativeAssistLinkedAgent[]) {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Empty';
  }
  return value
    .map((agent) => {
      const name = agent.name.trim();
      const role = agent.role.trim();
      if (!name && !role) {
        return '';
      }
      return role ? `${name}: ${role}` : name;
    })
    .filter(Boolean)
    .join('\n') || 'Empty';
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}
