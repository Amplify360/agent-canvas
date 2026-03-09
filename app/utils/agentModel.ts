import { Agent, AgentCoreFields, AgentFormData, AgentMutationInput } from '@/types/agent';
import {
  buildAgentFieldValues,
  readAgentCoreFields,
} from '../../shared/agentModel';

type AgentFieldCarrier = Pick<Agent, 'fieldValues'>;

export function getAgentCoreFields(agent: AgentFieldCarrier): AgentCoreFields {
  return readAgentCoreFields(agent.fieldValues);
}

export function getAgentCategory(agent: AgentFieldCarrier): string | undefined {
  return getAgentCoreFields(agent).category;
}

export function getAgentStatus(agent: AgentFieldCarrier): string | undefined {
  return getAgentCoreFields(agent).status;
}

export function buildAgentMutationInput(formData: AgentFormData): AgentMutationInput {
  const {
    name,
    phase,
    agentOrder,
    fieldValues,
    objective,
    description,
    tools,
    journeySteps,
    demoLink,
    videoLink,
    metrics,
    category,
    status,
  } = formData;

  return {
    name,
    phase,
    agentOrder,
    fieldValues: buildAgentFieldValues(
      {
        objective,
        description,
        tools,
        journeySteps,
        demoLink,
        videoLink,
        metrics,
        category,
        status,
      },
      fieldValues
    ),
  };
}
