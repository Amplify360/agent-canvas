export const AGENT_MODEL_VERSION = 2 as const;

export const AGENT_FIELD_KEY = {
  OBJECTIVE: "objective",
  DESCRIPTION: "description",
  TOOLS: "tools",
  JOURNEY_STEPS: "journeySteps",
  DEMO_LINK: "demoLink",
  VIDEO_LINK: "videoLink",
  METRICS: "metrics",
  CATEGORY: "category",
  STATUS: "status",
} as const;

export type AgentFieldKey =
  (typeof AGENT_FIELD_KEY)[keyof typeof AGENT_FIELD_KEY];

export const CORE_AGENT_FIELD_KEYS: readonly AgentFieldKey[] = [
  AGENT_FIELD_KEY.OBJECTIVE,
  AGENT_FIELD_KEY.DESCRIPTION,
  AGENT_FIELD_KEY.TOOLS,
  AGENT_FIELD_KEY.JOURNEY_STEPS,
  AGENT_FIELD_KEY.DEMO_LINK,
  AGENT_FIELD_KEY.VIDEO_LINK,
  AGENT_FIELD_KEY.METRICS,
  AGENT_FIELD_KEY.CATEGORY,
  AGENT_FIELD_KEY.STATUS,
];

export const AGENT_STATUS_VALUES = [
  "idea",
  "approved",
  "wip",
  "testing",
  "live",
  "shelved",
] as const;

export type AgentStatusValue = (typeof AGENT_STATUS_VALUES)[number];

export interface AgentMetricsValue {
  numberOfUsers?: number;
  timesUsed?: number;
  timeSaved?: number;
  roi?: number;
}

export type AgentFieldValues = Record<string, unknown>;

export interface AgentCoreFields {
  objective?: string;
  description?: string;
  tools: string[];
  journeySteps: string[];
  demoLink?: string;
  videoLink?: string;
  metrics?: AgentMetricsValue;
  category?: string;
  status?: AgentStatusValue;
}

const CORE_AGENT_FIELD_KEY_SET = new Set<string>(CORE_AGENT_FIELD_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function sanitizeMetric(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeMetrics(value: unknown): AgentMetricsValue | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const metrics: AgentMetricsValue = {};
  const numberOfUsers = sanitizeMetric(value.numberOfUsers);
  const timesUsed = sanitizeMetric(value.timesUsed);
  const timeSaved = sanitizeMetric(value.timeSaved);
  const roi = sanitizeMetric(value.roi);

  if (numberOfUsers !== undefined) metrics.numberOfUsers = numberOfUsers;
  if (timesUsed !== undefined) metrics.timesUsed = timesUsed;
  if (timeSaved !== undefined) metrics.timeSaved = timeSaved;
  if (roi !== undefined) metrics.roi = roi;

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function sanitizeStatus(value: unknown): AgentStatusValue | undefined {
  return typeof value === "string" &&
    (AGENT_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as AgentStatusValue)
    : undefined;
}

export function readAgentCoreFields(
  fieldValues: AgentFieldValues | undefined
): AgentCoreFields {
  return {
    objective: sanitizeString(fieldValues?.[AGENT_FIELD_KEY.OBJECTIVE]),
    description: sanitizeString(fieldValues?.[AGENT_FIELD_KEY.DESCRIPTION]),
    tools: sanitizeStringArray(fieldValues?.[AGENT_FIELD_KEY.TOOLS]),
    journeySteps: sanitizeStringArray(fieldValues?.[AGENT_FIELD_KEY.JOURNEY_STEPS]),
    demoLink: sanitizeString(fieldValues?.[AGENT_FIELD_KEY.DEMO_LINK]),
    videoLink: sanitizeString(fieldValues?.[AGENT_FIELD_KEY.VIDEO_LINK]),
    metrics: sanitizeMetrics(fieldValues?.[AGENT_FIELD_KEY.METRICS]),
    category: sanitizeString(fieldValues?.[AGENT_FIELD_KEY.CATEGORY]),
    status: sanitizeStatus(fieldValues?.[AGENT_FIELD_KEY.STATUS]),
  };
}

export function getExtensionFieldValues(
  fieldValues: AgentFieldValues | undefined
): AgentFieldValues {
  if (!isRecord(fieldValues)) {
    return {};
  }

  const extensionValues: AgentFieldValues = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (CORE_AGENT_FIELD_KEY_SET.has(key)) {
      continue;
    }
    extensionValues[key] = value;
  }
  return extensionValues;
}

export function buildAgentFieldValues(
  coreFields: Partial<AgentCoreFields>,
  baseFieldValues?: AgentFieldValues
): AgentFieldValues {
  const nextFieldValues: AgentFieldValues = {
    ...getExtensionFieldValues(baseFieldValues),
  };

  const objective = sanitizeString(coreFields.objective);
  const description = sanitizeString(coreFields.description);
  const tools = sanitizeStringArray(coreFields.tools);
  const journeySteps = sanitizeStringArray(coreFields.journeySteps);
  const demoLink = sanitizeString(coreFields.demoLink);
  const videoLink = sanitizeString(coreFields.videoLink);
  const metrics = sanitizeMetrics(coreFields.metrics);
  const category = sanitizeString(coreFields.category);
  const status = sanitizeStatus(coreFields.status);

  if (objective) nextFieldValues[AGENT_FIELD_KEY.OBJECTIVE] = objective;
  if (description) nextFieldValues[AGENT_FIELD_KEY.DESCRIPTION] = description;
  if (tools.length > 0) nextFieldValues[AGENT_FIELD_KEY.TOOLS] = tools;
  if (journeySteps.length > 0) {
    nextFieldValues[AGENT_FIELD_KEY.JOURNEY_STEPS] = journeySteps;
  }
  if (demoLink) nextFieldValues[AGENT_FIELD_KEY.DEMO_LINK] = demoLink;
  if (videoLink) nextFieldValues[AGENT_FIELD_KEY.VIDEO_LINK] = videoLink;
  if (metrics) nextFieldValues[AGENT_FIELD_KEY.METRICS] = metrics;
  if (category) nextFieldValues[AGENT_FIELD_KEY.CATEGORY] = category;
  if (status) nextFieldValues[AGENT_FIELD_KEY.STATUS] = status;

  return nextFieldValues;
}

export function parseYamlFields(value: unknown): AgentFieldValues {
  if (!isRecord(value)) {
    return {};
  }

  const fieldValues: AgentFieldValues = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!key.trim()) {
      continue;
    }
    fieldValues[key] = entry;
  }
  return fieldValues;
}
