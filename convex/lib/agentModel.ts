import { Doc } from "../_generated/dataModel";
import {
  AGENT_MODEL_VERSION,
  AgentFieldValues,
  LegacyAgentFieldSubset,
  buildFieldValuesFromLegacyFields,
  buildLegacyFieldsFromFieldValues,
  mergeFieldValuesWithLegacy,
} from "../../shared/agentModel";

type AgentWriteInput = LegacyAgentFieldSubset & {
  fieldValues?: AgentFieldValues;
};

const LEGACY_AGENT_KEYS: Array<keyof LegacyAgentFieldSubset> = [
  "objective",
  "description",
  "tools",
  "journeySteps",
  "demoLink",
  "videoLink",
  "metrics",
  "category",
  "status",
];

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pickDefinedLegacyValues(
  values: Partial<LegacyAgentFieldSubset>
): Partial<LegacyAgentFieldSubset> {
  const picked: Partial<LegacyAgentFieldSubset> = {};
  for (const key of LEGACY_AGENT_KEYS) {
    if (!hasOwn(values, key)) {
      continue;
    }
    const value = values[key];
    if (value === undefined) {
      continue;
    }
    (picked as Record<string, unknown>)[key] = value;
  }
  return picked;
}

function hasLegacyInput(input: object): boolean {
  return LEGACY_AGENT_KEYS.some((key) => hasOwn(input, key));
}

/**
 * Build canonical agent model fields for create operations.
 */
export function normalizeAgentCreateInput<T extends AgentWriteInput>(input: T): T & {
  fieldValues: AgentFieldValues;
  modelVersion: number;
} {
  const fieldValues = mergeFieldValuesWithLegacy(input.fieldValues, input);
  const legacyFields = pickDefinedLegacyValues(
    buildLegacyFieldsFromFieldValues(fieldValues)
  );

  return {
    ...input,
    ...legacyFields,
    fieldValues,
    modelVersion: AGENT_MODEL_VERSION,
  };
}

/**
 * Normalize an agent update patch so legacy fields and fieldValues stay in sync.
 */
export function normalizeAgentUpdatePatch(
  existingAgent: Doc<"agents">,
  updates: AgentWriteInput
): Record<string, unknown> {
  const patch: Record<string, unknown> = { ...updates };
  const updatesFieldValues = hasOwn(updates, "fieldValues");
  const updatesLegacyValues = hasLegacyInput(updates);

  if (!updatesFieldValues && !updatesLegacyValues) {
    return patch;
  }

  const baselineFieldValues = mergeFieldValuesWithLegacy(
    existingAgent.fieldValues,
    existingAgent
  );
  const nextFieldValues: AgentFieldValues = { ...baselineFieldValues };

  if (updatesFieldValues && updates.fieldValues) {
    Object.assign(nextFieldValues, updates.fieldValues);
  }

  if (updatesLegacyValues) {
    Object.assign(nextFieldValues, buildFieldValuesFromLegacyFields(updates));
  }

  for (const [key, value] of Object.entries(nextFieldValues)) {
    if (value === undefined) {
      delete nextFieldValues[key];
    }
  }

  patch.fieldValues = nextFieldValues;
  patch.modelVersion = AGENT_MODEL_VERSION;

  const nextLegacy = pickDefinedLegacyValues(
    buildLegacyFieldsFromFieldValues(nextFieldValues)
  );
  Object.assign(patch, nextLegacy);

  return patch;
}

/**
 * Ensure an agent read always has modelVersion + fieldValues and derived legacy fields.
 */
export function hydrateAgentReadModel<T extends Doc<"agents">>(
  agent: T
): T & { fieldValues: AgentFieldValues; modelVersion: number } {
  const fieldValues = mergeFieldValuesWithLegacy(agent.fieldValues, agent);
  const legacy = pickDefinedLegacyValues(buildLegacyFieldsFromFieldValues(fieldValues));

  return {
    ...agent,
    ...legacy,
    fieldValues,
    modelVersion: agent.modelVersion ?? 1,
  };
}

/**
 * Returns true when an agent already has the new canonical model fields.
 */
export function isAgentModelMigrated(agent: Doc<"agents">): boolean {
  if (agent.modelVersion !== AGENT_MODEL_VERSION) {
    return false;
  }
  if (!agent.fieldValues || typeof agent.fieldValues !== "object") {
    return false;
  }

  const expectedFieldValues = mergeFieldValuesWithLegacy(agent.fieldValues, agent);
  return (
    JSON.stringify(expectedFieldValues) === JSON.stringify(agent.fieldValues)
  );
}
