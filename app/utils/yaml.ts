/**
 * YAML import/export utilities for canvas data
 */

import * as yaml from 'js-yaml';
import { Agent, AgentMutationInput } from '@/types/agent';
import { VALIDATION_CONSTANTS, AGENT_STATUS, AgentStatus } from '@/types/validationConstants';
import { getAgentCoreFields } from '@/utils/agentModel';
import {
  buildAgentFieldValues,
  getExtensionFieldValues,
  parseYamlFields,
} from '../../shared/agentModel';

const VALID_STATUSES = new Set<string>(Object.values(AGENT_STATUS));

function parseStatus(value: string | undefined): AgentStatus | undefined {
  if (!value) return undefined;
  return VALID_STATUSES.has(value) ? (value as AgentStatus) : undefined;
}

interface YamlAgent {
  name?: string;
  phase?: string;
  agentOrder?: number;
  objective?: string;
  description?: string;
  tools?: string[];
  journeySteps?: string[];
  demoLink?: string;
  videoLink?: string;
  metrics?: {
    numberOfUsers?: number | string;
    timesUsed?: number | string;
    timeSaved?: number | string;
    roi?: number | string;
  };
  category?: string;
  status?: string;
  fields?: Record<string, unknown>;
}

interface YamlDocument {
  specVersion?: number;
  documentTitle?: string;
  agents?: YamlAgent[];
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'canvas';
}

export function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const base = slugifyTitle(title);
  let candidate = base;
  let suffix = 2;

  while (existingSlugs.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}

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

function validateTitle(title: string): void {
  const trimmed = title?.trim();
  if (!trimmed) {
    throw new Error('Canvas title is required');
  }
  if (trimmed.length > VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH) {
    throw new Error(`Canvas title must be ${VALIDATION_CONSTANTS.CANVAS_TITLE_MAX_LENGTH} characters or less`);
  }
}

interface YamlConversionResult {
  agents: AgentMutationInput[];
  phases: string[];
  categories: string[];
}

function parseMetricValue(val: number | string | undefined): number | undefined {
  if (val === undefined) return undefined;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? undefined : num;
}

function yamlToConvexAgents(yamlDoc: YamlDocument): YamlConversionResult {
  if (!yamlDoc || !yamlDoc.agents || !Array.isArray(yamlDoc.agents)) {
    return { agents: [], phases: [], categories: [] };
  }

  const agents: AgentMutationInput[] = [];
  const phasesSet = new Set<string>();
  const categoriesSet = new Set<string>();

  for (const agent of yamlDoc.agents) {
    if (!agent.name?.trim()) {
      throw new Error('Agent is missing a name');
    }

    const phase = agent.phase?.trim() || 'Backlog';
    phasesSet.add(phase);

    const metrics: { numberOfUsers?: number; timesUsed?: number; timeSaved?: number; roi?: number } = {};
    const numberOfUsers = parseMetricValue(agent.metrics?.numberOfUsers);
    const timesUsed = parseMetricValue(agent.metrics?.timesUsed);
    const timeSaved = parseMetricValue(agent.metrics?.timeSaved);
    const roi = parseMetricValue(agent.metrics?.roi);

    if (numberOfUsers !== undefined) metrics.numberOfUsers = numberOfUsers;
    if (timesUsed !== undefined) metrics.timesUsed = timesUsed;
    if (timeSaved !== undefined) metrics.timeSaved = timeSaved;
    if (roi !== undefined) metrics.roi = roi;

    const fieldValues = buildAgentFieldValues(
      {
        objective: agent.objective?.trim() || undefined,
        description: agent.description?.trim() || undefined,
        tools: Array.isArray(agent.tools) ? agent.tools : [],
        journeySteps: Array.isArray(agent.journeySteps) ? agent.journeySteps : [],
        demoLink: agent.demoLink?.trim() || undefined,
        videoLink: agent.videoLink?.trim() || undefined,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
        category: agent.category?.trim() || undefined,
        status: parseStatus(agent.status),
      },
      parseYamlFields(agent.fields)
    );

    const coreFields = getAgentCoreFields({ fieldValues });
    if (coreFields.category) {
      categoriesSet.add(coreFields.category);
    }

    agents.push({
      phase,
      agentOrder: agent.agentOrder ?? 0,
      name: agent.name.trim(),
      fieldValues,
    });
  }

  const phases = Array.from(phasesSet);

  return {
    agents,
    phases: phases.length > 0 ? phases : ['Backlog'],
    categories: categoriesSet.size > 0 ? Array.from(categoriesSet) : ['Uncategorized'],
  };
}

export function parseYaml(yamlText: string): {
  title: string;
  agents: AgentMutationInput[];
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

  const title = parsed.documentTitle?.trim() || 'Imported Canvas';
  validateTitle(title);

  const { agents, phases, categories } = yamlToConvexAgents(parsed);

  return { title, agents, phases, categories };
}

export interface ImportYamlParams {
  yamlText: string;
  overrideTitle?: string;
  existingSlugs: Set<string>;
}

export interface ImportYamlResult {
  title: string;
  slug: string;
  agents: AgentMutationInput[];
  phases: string[];
  categories: string[];
}

export function prepareYamlImport({
  yamlText,
  overrideTitle,
  existingSlugs,
}: ImportYamlParams): ImportYamlResult {
  const { title: parsedTitle, agents, phases, categories } = parseYaml(yamlText);
  const title = overrideTitle?.trim() || parsedTitle;
  validateTitle(title);

  const slug = generateUniqueSlug(title, existingSlugs);

  return { title, slug, agents, phases, categories };
}

function agentsToYamlDoc(title: string, agents: Agent[], phaseOrder?: string[]): YamlDocument {
  const sortedAgents = [...agents].sort((a, b) => {
    let phaseCompare: number;
    if (phaseOrder && phaseOrder.length > 0) {
      const aIndex = phaseOrder.indexOf(a.phase);
      const bIndex = phaseOrder.indexOf(b.phase);
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

    if (phaseCompare !== 0) return phaseCompare;
    return a.agentOrder - b.agentOrder;
  });

  const yamlAgents: YamlAgent[] = sortedAgents.map((agent): YamlAgent => {
    const coreFields = getAgentCoreFields(agent);

    const yamlAgent: YamlAgent = {
      name: agent.name,
      phase: agent.phase,
      agentOrder: agent.agentOrder,
    };

    if (coreFields.objective) yamlAgent.objective = coreFields.objective;
    if (coreFields.description) yamlAgent.description = coreFields.description;
    if (coreFields.tools.length > 0) yamlAgent.tools = coreFields.tools;
    if (coreFields.journeySteps.length > 0) yamlAgent.journeySteps = coreFields.journeySteps;
    if (coreFields.demoLink) yamlAgent.demoLink = coreFields.demoLink;
    if (coreFields.videoLink) yamlAgent.videoLink = coreFields.videoLink;

    if (coreFields.metrics && Object.keys(coreFields.metrics).length > 0) {
      yamlAgent.metrics = {};
      if (coreFields.metrics.numberOfUsers !== undefined) yamlAgent.metrics.numberOfUsers = coreFields.metrics.numberOfUsers;
      if (coreFields.metrics.timesUsed !== undefined) yamlAgent.metrics.timesUsed = coreFields.metrics.timesUsed;
      if (coreFields.metrics.timeSaved !== undefined) yamlAgent.metrics.timeSaved = coreFields.metrics.timeSaved;
      if (coreFields.metrics.roi !== undefined) yamlAgent.metrics.roi = coreFields.metrics.roi;
    }

    if (coreFields.category) yamlAgent.category = coreFields.category;
    if (coreFields.status) yamlAgent.status = coreFields.status;

    const extensionFields = getExtensionFieldValues(agent.fieldValues);
    if (Object.keys(extensionFields).length > 0) {
      yamlAgent.fields = extensionFields;
    }

    return yamlAgent;
  });

  return {
    specVersion: 2,
    documentTitle: title,
    agents: yamlAgents,
  };
}

export function exportToYaml(title: string, agents: Agent[], phaseOrder?: string[]): string {
  validateTitle(title);
  const doc = agentsToYamlDoc(title, agents, phaseOrder);
  return yaml.dump(doc, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}
