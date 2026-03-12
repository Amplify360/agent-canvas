import { getAvailableTools } from '@/utils/config';
import { AGENT_STATUS_OPTIONS } from '@/types/validationConstants';

export interface ImportYamlAssistFormData {
  customTitle: string;
  yamlText: string;
}

export interface ImportYamlAssistRequest {
  model?: string;
  promptOverride?: string;
  notes: string;
  context: {
    current: ImportYamlAssistFormData;
    availableTools: string[];
    availableStatuses: string[];
  };
}

export const DEFAULT_IMPORT_YAML_ASSIST_PROMPT =
  'Translate the notes into a valid AgentCanvas YAML document. Produce a coherent canvas title and a realistic agent list. Only include details supported by the notes.';

export const IMPORT_YAML_ASSIST_MODEL_FALLBACK = 'openai/gpt-5.4';

export function buildImportYamlAssistContext(current: ImportYamlAssistFormData) {
  return {
    current,
    availableTools: getAvailableTools(),
    availableStatuses: AGENT_STATUS_OPTIONS.map((option) => option.value),
  };
}
