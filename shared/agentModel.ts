/**
 * Shared agent model contracts used by both frontend and backend.
 *
 * The goal is to keep a stable core model while allowing new fields to be
 * introduced via a generic `fieldValues` map.
 */

export const AGENT_MODEL_VERSION = 2 as const;

export const AGENT_FIELD_KIND = {
  TEXT: "text",
  LONG_TEXT: "longText",
  STRING_LIST: "stringList",
  URL: "url",
  OBJECT: "object",
  ENUM: "enum",
} as const;

export type AgentFieldKind =
  (typeof AGENT_FIELD_KIND)[keyof typeof AGENT_FIELD_KIND];

export const AGENT_FIELD_SECTION = {
  BASIC: "basic",
  DETAILS: "details",
  CAPABILITIES: "capabilities",
  JOURNEY: "journey",
  METRICS: "metrics",
} as const;

export type AgentFieldSection =
  (typeof AGENT_FIELD_SECTION)[keyof typeof AGENT_FIELD_SECTION];

export interface AgentFieldOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  shortLabel?: string;
}

export interface AgentFieldDefinition {
  key: string;
  label: string;
  kind: AgentFieldKind;
  section: AgentFieldSection;
  description?: string;
  isCore?: boolean;
  isRequired?: boolean;
  isGroupable?: boolean;
  isFilterable?: boolean;
  isIndicatorEligible?: boolean;
  options?: AgentFieldOption[];
}

export const AGENT_STATUS_VALUES = [
  "idea",
  "approved",
  "wip",
  "testing",
  "live",
  "shelved",
] as const;

export type AgentStatusValue = (typeof AGENT_STATUS_VALUES)[number];

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

export type CoreAgentFieldKey =
  (typeof AGENT_FIELD_KEY)[keyof typeof AGENT_FIELD_KEY];

export const CORE_AGENT_FIELD_KEYS: ReadonlyArray<CoreAgentFieldKey> = [
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

const CORE_AGENT_FIELD_KEY_SET = new Set<string>(CORE_AGENT_FIELD_KEYS);

export interface AgentMetricsValue {
  numberOfUsers?: number;
  timesUsed?: number;
  timeSaved?: number;
  roi?: number;
}

export interface LegacyAgentFieldSubset {
  objective?: string;
  description?: string;
  tools?: string[];
  journeySteps?: string[];
  demoLink?: string;
  videoLink?: string;
  metrics?: AgentMetricsValue;
  category?: string;
  status?: string;
}

export type AgentFieldValues = Record<string, unknown>;

export const CORE_AGENT_FIELD_DEFINITIONS: ReadonlyArray<AgentFieldDefinition> = [
  {
    key: AGENT_FIELD_KEY.OBJECTIVE,
    label: "Objective",
    kind: AGENT_FIELD_KIND.LONG_TEXT,
    section: AGENT_FIELD_SECTION.DETAILS,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.DESCRIPTION,
    label: "Description",
    kind: AGENT_FIELD_KIND.LONG_TEXT,
    section: AGENT_FIELD_SECTION.DETAILS,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.TOOLS,
    label: "Tools",
    kind: AGENT_FIELD_KIND.STRING_LIST,
    section: AGENT_FIELD_SECTION.CAPABILITIES,
    isCore: true,
    isIndicatorEligible: true,
  },
  {
    key: AGENT_FIELD_KEY.JOURNEY_STEPS,
    label: "Journey Steps",
    kind: AGENT_FIELD_KIND.STRING_LIST,
    section: AGENT_FIELD_SECTION.JOURNEY,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.DEMO_LINK,
    label: "Demo Link",
    kind: AGENT_FIELD_KIND.URL,
    section: AGENT_FIELD_SECTION.DETAILS,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.VIDEO_LINK,
    label: "Video Link",
    kind: AGENT_FIELD_KIND.URL,
    section: AGENT_FIELD_SECTION.DETAILS,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.METRICS,
    label: "Metrics",
    kind: AGENT_FIELD_KIND.OBJECT,
    section: AGENT_FIELD_SECTION.METRICS,
    isCore: true,
  },
  {
    key: AGENT_FIELD_KEY.CATEGORY,
    label: "Category",
    kind: AGENT_FIELD_KIND.TEXT,
    section: AGENT_FIELD_SECTION.BASIC,
    isCore: true,
    isGroupable: true,
    isFilterable: true,
  },
  {
    key: AGENT_FIELD_KEY.STATUS,
    label: "Status",
    kind: AGENT_FIELD_KIND.ENUM,
    section: AGENT_FIELD_SECTION.BASIC,
    isCore: true,
    isGroupable: true,
    isFilterable: true,
    isIndicatorEligible: true,
    options: AGENT_STATUS_VALUES.map((value) => ({
      value,
      label: value,
    })),
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeMetrics(value: unknown): AgentMetricsValue | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const metrics: AgentMetricsValue = {};
  const numberOfUsers = toNumber(value.numberOfUsers);
  const timesUsed = toNumber(value.timesUsed);
  const timeSaved = toNumber(value.timeSaved);
  const roi = toNumber(value.roi);

  if (numberOfUsers !== undefined) metrics.numberOfUsers = numberOfUsers;
  if (timesUsed !== undefined) metrics.timesUsed = timesUsed;
  if (timeSaved !== undefined) metrics.timeSaved = timeSaved;
  if (roi !== undefined) metrics.roi = roi;

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const next = value.filter((entry): entry is string => typeof entry === "string");
  return next;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Build fieldValues entries from legacy agent fields.
 */
export function buildFieldValuesFromLegacyFields(
  legacy: LegacyAgentFieldSubset
): AgentFieldValues {
  const fieldValues: AgentFieldValues = {};

  if (legacy.objective !== undefined) {
    fieldValues[AGENT_FIELD_KEY.OBJECTIVE] = legacy.objective;
  }
  if (legacy.description !== undefined) {
    fieldValues[AGENT_FIELD_KEY.DESCRIPTION] = legacy.description;
  }
  if (legacy.tools !== undefined) {
    fieldValues[AGENT_FIELD_KEY.TOOLS] = [...legacy.tools];
  }
  if (legacy.journeySteps !== undefined) {
    fieldValues[AGENT_FIELD_KEY.JOURNEY_STEPS] = [...legacy.journeySteps];
  }
  if (legacy.demoLink !== undefined) {
    fieldValues[AGENT_FIELD_KEY.DEMO_LINK] = legacy.demoLink;
  }
  if (legacy.videoLink !== undefined) {
    fieldValues[AGENT_FIELD_KEY.VIDEO_LINK] = legacy.videoLink;
  }
  if (legacy.metrics !== undefined) {
    fieldValues[AGENT_FIELD_KEY.METRICS] = legacy.metrics;
  }
  if (legacy.category !== undefined) {
    fieldValues[AGENT_FIELD_KEY.CATEGORY] = legacy.category;
  }
  if (legacy.status !== undefined) {
    fieldValues[AGENT_FIELD_KEY.STATUS] = legacy.status;
  }

  return fieldValues;
}

/**
 * Build legacy fields from fieldValues so existing code paths can keep working.
 */
export function buildLegacyFieldsFromFieldValues(
  fieldValues: AgentFieldValues | undefined
): Partial<LegacyAgentFieldSubset> {
  if (!fieldValues) {
    return {};
  }

  const legacy: Partial<LegacyAgentFieldSubset> = {};

  if (typeof fieldValues[AGENT_FIELD_KEY.OBJECTIVE] === "string") {
    legacy.objective = fieldValues[AGENT_FIELD_KEY.OBJECTIVE] as string;
  }
  if (typeof fieldValues[AGENT_FIELD_KEY.DESCRIPTION] === "string") {
    legacy.description = fieldValues[AGENT_FIELD_KEY.DESCRIPTION] as string;
  }

  const tools = sanitizeStringArray(fieldValues[AGENT_FIELD_KEY.TOOLS]);
  if (tools !== undefined) {
    legacy.tools = tools;
  }

  const journeySteps = sanitizeStringArray(
    fieldValues[AGENT_FIELD_KEY.JOURNEY_STEPS]
  );
  if (journeySteps !== undefined) {
    legacy.journeySteps = journeySteps;
  }

  if (typeof fieldValues[AGENT_FIELD_KEY.DEMO_LINK] === "string") {
    legacy.demoLink = fieldValues[AGENT_FIELD_KEY.DEMO_LINK] as string;
  }
  if (typeof fieldValues[AGENT_FIELD_KEY.VIDEO_LINK] === "string") {
    legacy.videoLink = fieldValues[AGENT_FIELD_KEY.VIDEO_LINK] as string;
  }

  const metrics = sanitizeMetrics(fieldValues[AGENT_FIELD_KEY.METRICS]);
  if (metrics !== undefined) {
    legacy.metrics = metrics;
  }

  if (typeof fieldValues[AGENT_FIELD_KEY.CATEGORY] === "string") {
    legacy.category = fieldValues[AGENT_FIELD_KEY.CATEGORY] as string;
  }
  if (typeof fieldValues[AGENT_FIELD_KEY.STATUS] === "string") {
    legacy.status = fieldValues[AGENT_FIELD_KEY.STATUS] as string;
  }

  return legacy;
}

/**
 * Merge explicit fieldValues with legacy fields.
 * Legacy values win so callers can continue passing top-level fields.
 */
export function mergeFieldValuesWithLegacy(
  fieldValues: AgentFieldValues | undefined,
  legacy: LegacyAgentFieldSubset
): AgentFieldValues {
  const merged: AgentFieldValues = {};
  if (fieldValues && isRecord(fieldValues)) {
    Object.assign(merged, fieldValues);
  }

  Object.assign(merged, buildFieldValuesFromLegacyFields(legacy));

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) {
      delete merged[key];
    }
  }

  return merged;
}

/**
 * Return extension-only values (non-core keys).
 */
export function getExtensionFieldValues(
  fieldValues: AgentFieldValues | undefined
): AgentFieldValues {
  if (!fieldValues) {
    return {};
  }

  const extension: AgentFieldValues = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (CORE_AGENT_FIELD_KEY_SET.has(key)) {
      continue;
    }
    extension[key] = value;
  }
  return extension;
}

/**
 * Build fieldValues from canonical YAML `fields` payload.
 */
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

/**
 * True when the given legacy key is represented in a fieldValues object.
 */
export function hasCoreField(
  fieldValues: AgentFieldValues | undefined,
  key: CoreAgentFieldKey
): boolean {
  return !!fieldValues && hasOwn(fieldValues, key);
}
