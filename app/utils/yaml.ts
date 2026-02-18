/**
 * YAML import/export utilities for canvas data
 */

import * as yaml from 'js-yaml';
import { Agent, AgentFormData } from '@/types/agent';
import { DEFAULT_CATEGORY, DEFAULT_PHASE } from '@/utils/config';
import { VALIDATION_CONSTANTS, AGENT_STATUS, AgentStatus } from '@/types/validationConstants';

const YAML_SPEC_VERSION = 1;

/**
 * Valid status values for validation
 */
const VALID_STATUSES = new Set<string>(Object.values(AGENT_STATUS));

/**
 * Parse and validate status value from YAML
 * Returns undefined for invalid/missing values
 */
function parseStatus(value: string | undefined): AgentStatus | undefined {
  if (!value) return undefined;
  return VALID_STATUSES.has(value) ? (value as AgentStatus) : undefined;
}

/**
 * YAML document structure (flat format matching database schema)
 */
interface YamlAgent {
  name?: string;
  phase?: string;
  agentOrder?: number | string;
  objective?: string;
  description?: string;
  tools?: string[];
  journeySteps?: string[];
  demoLink?: string;
  videoLink?: string;
  metrics?: {
    numberOfUsers?: number | string;
    timesUsed?: number | string;
    timeSaved?: number | string; // hours
    roi?: number | string; // integer currency
  };
  category?: string;
  status?: string;
  ownerId?: string;
  tags?: {
    department?: string;
    status?: string;
  };
}

interface YamlAgentGroup {
  groupName?: string;
  agents?: YamlAgent[];
}

interface YamlDocument {
  specVersion?: number;
  documentTitle?: string;
  documentSlug?: string;
  documentDescription?: string;
  phases?: string[];
  categories?: string[];
  agents?: YamlAgent[];
  agentGroups?: YamlAgentGroup[]; // Legacy format
}

/**
 * Generate a unique slug from a title
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'canvas';
}

/**
 * Generate a unique slug by appending a number suffix if needed
 */
export function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const base = slugifyTitle(title);
  let candidate = base;
  let suffix = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}

/**
 * Generate a unique slug from an already-normalized base slug
 */
function generateUniqueSlugFromBase(baseSlug: string, existingSlugs: Set<string>): string {
  const base = slugifyTitle(baseSlug);
  let candidate = base;
  let suffix = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}

/**
 * Extract title from YAML text for preview
 */
export function extractTitleFromYaml(yamlText: string): string | null {
  try {
    const parsed = yaml.load(yamlText) as YamlDocument;
    if (parsed?.documentTitle) {
      return String(parsed.documentTitle).trim() || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Type guard for plain objects
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a potentially-empty string
 */
function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize a string array by trimming values and dropping empties.
 * Preserves ordering and duplicates.
 */
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  for (const item of value) {
    const str = normalizeString(item);
    if (!str) continue;
    normalized.push(str);
  }
  return normalized;
}

/**
 * Normalize a string array and remove duplicates while preserving first appearance.
 */
function normalizeUniqueStringArray(value: unknown): string[] {
  const normalized = normalizeStringArray(value);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of normalized) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }
  return unique;
}

/**
 * Merge ordered values while preserving first appearance.
 */
function mergeOrderedValues(primary: string[], secondary: string[], fallback: string): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...primary, ...secondary]) {
    if (seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }

  return merged.length > 0 ? merged : [fallback];
}

/**
 * Validate canvas title
 */
function validateTitle(title: string): void {
  const trimmed = normalizeString(title);
  if (!trimmed) {
    throw new Error('Canvas title is required');
  }
  if (trimmed.length > VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH) {
    throw new Error(`Canvas title must be ${VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH} characters or less`);
  }
}

/**
 * Validate canvas slug
 */
function validateSlug(slug: string): void {
  if (slug.length > VALIDATION_CONSTANTS.CANVAS_SLUG_MAX_LENGTH) {
    throw new Error(`Canvas slug must be ${VALIDATION_CONSTANTS.CANVAS_SLUG_MAX_LENGTH} characters or less`);
  }
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw new Error('Canvas slug must contain only lowercase letters, numbers, and single hyphens');
  }
}

/**
 * Validate canvas description
 */
function validateDescription(description: string | undefined): void {
  if (!description) return;
  if (description.length > VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Canvas description must be ${VALIDATION_CONSTANTS.CANVAS_DESCRIPTION_MAX_LENGTH} characters or less`);
  }
}

/**
 * Result of converting YAML document
 */
interface YamlConversionResult {
  agents: AgentFormData[];
  phases: string[];
  categories: string[];
}

/**
 * Collect agents from supported YAML shapes.
 * Supports canonical `agents[]` and legacy `agentGroups[].agents[]`.
 */
function collectYamlAgents(yamlDoc: YamlDocument): Array<{ agent: YamlAgent; fallbackPhase?: string }> {
  const collected: Array<{ agent: YamlAgent; fallbackPhase?: string }> = [];

  if (Array.isArray(yamlDoc.agents)) {
    for (const raw of yamlDoc.agents) {
      if (isRecord(raw)) {
        collected.push({ agent: raw as YamlAgent });
      }
    }
  }

  if (Array.isArray(yamlDoc.agentGroups)) {
    for (let i = 0; i < yamlDoc.agentGroups.length; i += 1) {
      const group = yamlDoc.agentGroups[i];
      if (!isRecord(group) || !Array.isArray(group.agents)) continue;
      const fallbackPhase = normalizeString(group.groupName) || `Phase ${i + 1}`;
      for (const rawAgent of group.agents) {
        if (isRecord(rawAgent)) {
          collected.push({ agent: rawAgent as YamlAgent, fallbackPhase });
        }
      }
    }
  }

  return collected;
}

/**
 * Parse a metric value from YAML (can be number or string)
 */
function parseMetricValue(val: number | string | undefined): number | undefined {
  if (val === undefined) return undefined;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? undefined : num;
}

/**
 * Parse metric value and enforce non-negative constraints where needed.
 */
function parseMetricField(
  val: number | string | undefined,
  fieldName: string,
  { allowNegative = false }: { allowNegative?: boolean } = {}
): number | undefined {
  const parsed = parseMetricValue(val);
  if (parsed === undefined) return undefined;
  if (!allowNegative && parsed < VALIDATION_CONSTANTS.METRIC_MIN_VALUE) {
    throw new Error(`${fieldName} must be ${VALIDATION_CONSTANTS.METRIC_MIN_VALUE} or greater`);
  }
  return parsed;
}

/**
 * Parse a numeric agent order value from YAML.
 */
function parseAgentOrder(value: number | string | undefined): number {
  const parsed = parseMetricValue(value);
  return parsed !== undefined ? parsed : 0;
}

/**
 * Convert YAML document to Convex agent format
 * Also extracts phases and categories for canvas-level storage
 */
function yamlToConvexAgents(yamlDoc: YamlDocument): YamlConversionResult {
  const topLevelPhases = normalizeUniqueStringArray(yamlDoc.phases);
  const topLevelCategories = normalizeUniqueStringArray(yamlDoc.categories);
  const sourceAgents = collectYamlAgents(yamlDoc);
  if (sourceAgents.length === 0) {
    return {
      agents: [],
      phases: mergeOrderedValues(topLevelPhases, [], DEFAULT_PHASE),
      categories: mergeOrderedValues(topLevelCategories, [], DEFAULT_CATEGORY),
    };
  }

  const agents: AgentFormData[] = [];
  const phasesFromAgents: string[] = [];
  const categoriesFromAgents: string[] = [];
  const seenPhases = new Set<string>();
  const seenCategories = new Set<string>();

  for (const { agent, fallbackPhase } of sourceAgents) {
    // Validate required fields
    const name = normalizeString(agent.name);
    if (!name) {
      throw new Error('Agent is missing a name');
    }

    // Phase is optional, defaults to "Backlog"
    const phase = normalizeString(agent.phase) || fallbackPhase || DEFAULT_PHASE;
    if (!seenPhases.has(phase)) {
      seenPhases.add(phase);
      phasesFromAgents.push(phase);
    }

    // Parse metrics - convert string values to numbers and apply validation constraints
    const metrics: { numberOfUsers?: number; timesUsed?: number; timeSaved?: number; roi?: number } = {};
    const numberOfUsers = parseMetricField(agent.metrics?.numberOfUsers, 'numberOfUsers');
    const timesUsed = parseMetricField(agent.metrics?.timesUsed, 'timesUsed');
    const timeSaved = parseMetricField(agent.metrics?.timeSaved, 'timeSaved');
    const roi = parseMetricField(agent.metrics?.roi, 'roi', { allowNegative: true });

    if (numberOfUsers !== undefined) metrics.numberOfUsers = numberOfUsers;
    if (timesUsed !== undefined) metrics.timesUsed = timesUsed;
    if (timeSaved !== undefined) metrics.timeSaved = timeSaved;
    if (roi !== undefined) metrics.roi = roi;

    // Legacy compatibility: tags.department maps to category
    const legacyCategory = normalizeString(agent.tags?.department);
    const category = normalizeString(agent.category) || legacyCategory || undefined;
    if (category && !seenCategories.has(category)) {
      seenCategories.add(category);
      categoriesFromAgents.push(category);
    }

    // Legacy compatibility: tags.status maps to status
    const legacyStatus = normalizeString(agent.tags?.status);
    const status = parseStatus(normalizeString(agent.status) || legacyStatus);

    agents.push({
      phase,
      agentOrder: parseAgentOrder(agent.agentOrder),
      name,
      objective: normalizeString(agent.objective),
      description: normalizeString(agent.description),
      tools: normalizeStringArray(agent.tools),
      journeySteps: normalizeStringArray(agent.journeySteps),
      demoLink: normalizeString(agent.demoLink),
      videoLink: normalizeString(agent.videoLink),
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      category,
      status,
      ownerId: normalizeString(agent.ownerId) as AgentFormData['ownerId'] | undefined,
    });
  }

  return {
    agents,
    phases: mergeOrderedValues(topLevelPhases, phasesFromAgents, DEFAULT_PHASE),
    categories: mergeOrderedValues(topLevelCategories, categoriesFromAgents, DEFAULT_CATEGORY),
  };
}

/**
 * Parse and validate YAML text
 */
export function parseYaml(yamlText: string): {
  title: string;
  sourceSlug?: string;
  description?: string;
  agents: AgentFormData[];
  phases: string[];
  categories: string[];
} {
  if (!yamlText || typeof yamlText !== 'string') {
    throw new Error('YAML text is required');
  }

  let parsed: YamlDocument;
  try {
    parsed = yaml.load(yamlText) as YamlDocument;
  } catch (e: any) {
    throw new Error(`YAML parse error: ${e.message || String(e)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('YAML document must be an object');
  }

  const title = normalizeString(parsed.documentTitle) || 'Imported Canvas';
  const sourceSlug = normalizeString(parsed.documentSlug);
  const description = normalizeString(parsed.documentDescription);
  validateTitle(title);
  if (sourceSlug) {
    validateSlug(sourceSlug);
  }
  validateDescription(description);

  const { agents, phases, categories } = yamlToConvexAgents(parsed);

  return { title, sourceSlug, description, agents, phases, categories };
}

/**
 * Import parameters
 */
export interface ImportYamlParams {
  yamlText: string;
  overrideTitle?: string;
  existingSlugs: Set<string>;
}

/**
 * Import result
 */
export interface ImportYamlResult {
  title: string;
  slug: string;
  description?: string;
  agents: AgentFormData[];
  phases: string[];
  categories: string[];
}

/**
 * Prepare YAML for import (parse and generate slug)
 * Does not actually perform the import - that's done by calling Convex mutations
 */
export function prepareYamlImport({
  yamlText,
  overrideTitle,
  existingSlugs,
}: ImportYamlParams): ImportYamlResult {
  const { title: parsedTitle, sourceSlug, description, agents, phases, categories } = parseYaml(yamlText);
  const title = overrideTitle?.trim() || parsedTitle;
  validateTitle(title);

  const slugBase = overrideTitle?.trim() ? slugifyTitle(title) : (sourceSlug || slugifyTitle(title));
  const slug = generateUniqueSlugFromBase(slugBase, existingSlugs);

  return { title, slug, description, agents, phases, categories };
}

/**
 * Agent fields exported to YAML
 */
type ExportableAgent = Pick<
  Agent,
  | 'name'
  | 'phase'
  | 'agentOrder'
  | 'objective'
  | 'description'
  | 'tools'
  | 'journeySteps'
  | 'demoLink'
  | 'videoLink'
  | 'metrics'
  | 'category'
  | 'status'
  | 'ownerId'
>;

/**
 * YAML export input for full-canvas round trips
 */
export interface ExportYamlInput {
  title: string;
  slug?: string;
  description?: string;
  phases?: string[];
  categories?: string[];
  agents: ExportableAgent[];
}

/**
 * Convert agents to YAML document structure.
 * Uses canvas-level phase order for stable output.
 */
function agentsToYamlDoc(input: ExportYamlInput): YamlDocument {
  const phaseOrder = normalizeUniqueStringArray(input.phases);
  const categoryOrder = normalizeUniqueStringArray(input.categories);

  // Sort agents by phase order, then by agentOrder within phase
  const sortedAgents = [...input.agents].sort((a, b) => {
    // First sort by phase
    let phaseCompare: number;
    if (phaseOrder.length > 0) {
      const aIndex = phaseOrder.indexOf(a.phase);
      const bIndex = phaseOrder.indexOf(b.phase);
      // Unknown phases go to the end alphabetically
      if (aIndex === -1 && bIndex === -1) {
        phaseCompare = a.phase.localeCompare(b.phase);
      } else if (aIndex === -1) {
        phaseCompare = 1;
      } else if (bIndex === -1) {
        phaseCompare = -1;
      } else {
        phaseCompare = aIndex - bIndex;
      }
    } else {
      phaseCompare = a.phase.localeCompare(b.phase);
    }

    // If same phase, sort by agentOrder
    if (phaseCompare !== 0) return phaseCompare;
    return a.agentOrder - b.agentOrder;
  });

  const yamlAgents: YamlAgent[] = sortedAgents.map((agent): YamlAgent => {
    const yamlAgent: YamlAgent = {
      name: agent.name,
      phase: agent.phase,
      agentOrder: agent.agentOrder,
    };

    if (agent.objective) yamlAgent.objective = agent.objective;
    if (agent.description) yamlAgent.description = agent.description;
    if (agent.tools?.length) yamlAgent.tools = agent.tools;
    if (agent.journeySteps?.length) yamlAgent.journeySteps = agent.journeySteps;
    if (agent.demoLink) yamlAgent.demoLink = agent.demoLink;
    if (agent.videoLink) yamlAgent.videoLink = agent.videoLink;

    if (agent.metrics && Object.keys(agent.metrics).length > 0) {
      yamlAgent.metrics = {};
      if (agent.metrics.numberOfUsers !== undefined) yamlAgent.metrics.numberOfUsers = agent.metrics.numberOfUsers;
      if (agent.metrics.timesUsed !== undefined) yamlAgent.metrics.timesUsed = agent.metrics.timesUsed;
      if (agent.metrics.timeSaved !== undefined) yamlAgent.metrics.timeSaved = agent.metrics.timeSaved;
      if (agent.metrics.roi !== undefined) yamlAgent.metrics.roi = agent.metrics.roi;
    }

    if (agent.category) yamlAgent.category = agent.category;
    if (agent.status) yamlAgent.status = agent.status;
    if (agent.ownerId) yamlAgent.ownerId = agent.ownerId;

    return yamlAgent;
  });

  const doc: YamlDocument = {
    specVersion: YAML_SPEC_VERSION,
    documentTitle: input.title,
    agents: yamlAgents,
  };
  const slug = normalizeString(input.slug);
  if (slug) {
    validateSlug(slug);
    doc.documentSlug = slug;
  }
  const description = normalizeString(input.description);
  if (description) {
    doc.documentDescription = description;
  }
  if (phaseOrder.length > 0) {
    doc.phases = phaseOrder;
  }
  if (categoryOrder.length > 0) {
    doc.categories = categoryOrder;
  }

  return doc;
}

/**
 * Export canvas and agents to YAML string
 * @throws Error if title is invalid
 */
export function exportToYaml(title: string, agents: ExportableAgent[], phaseOrder?: string[]): string;
export function exportToYaml(input: ExportYamlInput): string;
export function exportToYaml(
  titleOrInput: string | ExportYamlInput,
  maybeAgents?: ExportableAgent[],
  maybePhaseOrder?: string[]
): string {
  const input: ExportYamlInput = typeof titleOrInput === 'string'
    ? {
      title: titleOrInput,
      agents: maybeAgents ?? [],
      phases: maybePhaseOrder,
    }
    : titleOrInput;

  validateTitle(input.title);
  validateDescription(normalizeString(input.description));

  const doc = agentsToYamlDoc(input);
  return yaml.dump(doc, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
    sortKeys: false,
  });
}
