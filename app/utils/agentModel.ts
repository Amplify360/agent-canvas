import { Agent, AgentFieldValues } from '@/types/agent';
import {
  LegacyAgentFieldSubset,
  buildLegacyFieldsFromFieldValues,
  mergeFieldValuesWithLegacy,
} from '../../shared/agentModel';

type AgentLike = Pick<
  Partial<Agent>,
  | 'objective'
  | 'description'
  | 'tools'
  | 'journeySteps'
  | 'demoLink'
  | 'videoLink'
  | 'metrics'
  | 'category'
  | 'status'
  | 'fieldValues'
>;

/**
 * Returns canonical fieldValues for a given agent by merging legacy values.
 */
export function getAgentFieldValues(agent: AgentLike): AgentFieldValues {
  return mergeFieldValuesWithLegacy(agent.fieldValues, agent);
}

/**
 * Returns legacy view of agent fields for existing UI paths.
 */
export function getAgentLegacyFields(agent: AgentLike): LegacyAgentFieldSubset {
  const fieldValues = getAgentFieldValues(agent);
  return {
    ...agent,
    ...buildLegacyFieldsFromFieldValues(fieldValues),
  };
}

export function getAgentStatus(agent: AgentLike): string | undefined {
  return getAgentLegacyFields(agent).status;
}

export function getAgentCategory(agent: AgentLike): string | undefined {
  return getAgentLegacyFields(agent).category;
}
