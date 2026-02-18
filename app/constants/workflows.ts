/**
 * Hardcoded workflow definitions for the prompt-to-workflow spike.
 *
 * For this spike, prompt matching is intentionally mocked and always
 * returns the first workflow in this library.
 */

import type { AgentWithOwner } from '@/types/agent';
import type { WorkflowDefinition, ResolvedWorkflowStep, WorkflowStepDefinition } from '@/types/workflow';

export const WORKFLOW_LIBRARY: WorkflowDefinition[] = [
  {
    id: 'proudfoot-poc-value-realization',
    name: 'Proudfoot POC Value Realization',
    description: 'Move from source-system data to quantified opportunities and client-ready executive deliverables.',
    suggestedPrompts: [
      'Run the Proudfoot POC workflow',
      'Show me the POC value realization flow',
      'Walk through the Proudfoot POC agents',
    ],
    steps: [
      {
        id: 'poc-data-ingestion-validation',
        label: 'Data Ingestion and Validation',
        agentNameIncludes: ['data ingestion & validation agent (poc)'],
        inputs: [
          'Raw CMMS exports, ERP records, and maintenance logs',
          'Source-system schema mappings and data quality rules',
          'Consultant-selected asset scope and timeframe',
        ],
        outputs: [
          'Validated and analysis-ready canonical dataset',
          'Data quality assessment with anomaly flags and fixes',
          'Transparent accept/reject rationale for source records',
        ],
      },
      {
        id: 'poc-advanced-analysis',
        label: 'Advanced Analysis and Insight Discovery',
        agentNameIncludes: ['advanced data analysis agent (poc)'],
        inputs: [
          'Validated operational dataset from ingestion',
          'Analysis objectives, hypotheses, and KPI focus areas',
          'TPS methodology context via RAG knowledge base',
        ],
        outputs: [
          'Failure patterns, utilization trends, and anomaly insights',
          'Context-aware findings linked to operational pain points',
          'Evidence package to support opportunity sizing',
        ],
      },
      {
        id: 'poc-opportunity-identification',
        label: 'Opportunity Identification and Prioritization',
        agentNameIncludes: ['opportunities identification agent (poc)'],
        inputs: [
          'Analytical findings and baseline performance gaps',
          'TPS benchmarks, playbooks, and relevant case patterns',
          'Impact and feasibility criteria from engagement team',
        ],
        outputs: [
          'Prioritized improvement opportunities across operations and maintenance',
          'Quantified prize model (cost, throughput, and revenue impact)',
          'Recommendation stack ordered by value and execution feasibility',
        ],
      },
      {
        id: 'poc-client-deliverables',
        label: 'Client Deliverable Generation',
        agentNameIncludes: ['client deliverables generator (poc)'],
        inputs: [
          'Prioritized opportunities and quantified value story',
          'Supporting evidence, visuals, and diagnostic findings',
          'Client communication format (deck, dashboard, or report)',
        ],
        outputs: [
          'Client-ready presentation, dashboard, and report artifacts',
          'Executive narrative from baseline gaps to value realization',
          'Actionable recommendation package for stakeholder decision-making',
        ],
      },
    ],
  },
  {
    id: 'customer-escalation-resolution',
    name: 'Customer Escalation Resolution',
    description: 'Guide a high-priority customer issue from intake through response and closeout.',
    suggestedPrompts: [
      'Resolve an urgent customer escalation',
      'Walk me through incident response for a customer issue',
      'How do we handle a high severity support request?',
    ],
    steps: [
      {
        id: 'triage-intake',
        label: 'Triage and Intake',
        agentNameIncludes: ['triage', 'intake'],
        fallbackAgentIndex: 0,
        inputs: [
          'Customer report and account context',
          'Severity signal and related logs',
        ],
        outputs: [
          'Structured incident brief',
          'Priority score and handoff package',
        ],
      },
      {
        id: 'investigation',
        label: 'Diagnosis and Root Cause',
        agentNameIncludes: ['investigation', 'diagnosis', 'analysis'],
        fallbackAgentIndex: 1,
        inputs: [
          'Incident brief from triage',
          'Historical incidents and system telemetry',
        ],
        outputs: [
          'Likely root cause hypotheses',
          'Recommended remediation path',
        ],
      },
      {
        id: 'response-comms',
        label: 'Response and Communication',
        agentNameIncludes: ['response', 'comms', 'communication'],
        fallbackAgentIndex: 2,
        inputs: [
          'Chosen remediation path',
          'Customer profile and communication preferences',
        ],
        outputs: [
          'Customer-facing update draft',
          'Internal execution checklist',
        ],
      },
      {
        id: 'resolution-closeout',
        label: 'Resolution and Closeout',
        agentNameIncludes: ['resolution', 'closeout', 'retrospective'],
        fallbackAgentIndex: 3,
        inputs: [
          'Execution checklist and final state',
          'Customer confirmation and timeline',
        ],
        outputs: [
          'Closed incident summary',
          'Follow-up actions and learning notes',
        ],
      },
    ],
  },
];

function normalizeAgentText(agent: AgentWithOwner): string {
  return `${agent.name} ${agent.objective ?? ''} ${agent.description ?? ''}`.toLowerCase();
}

function sortAgentsForFallback(agents: AgentWithOwner[]): AgentWithOwner[] {
  return [...agents].sort((a, b) => {
    const phaseCompare = a.phase.localeCompare(b.phase);
    if (phaseCompare !== 0) return phaseCompare;

    const orderCompare = a.agentOrder - b.agentOrder;
    if (orderCompare !== 0) return orderCompare;

    return a.name.localeCompare(b.name);
  });
}

function findByNameMatch(
  step: WorkflowStepDefinition,
  availableAgents: AgentWithOwner[]
): AgentWithOwner | null {
  if (!step.agentNameIncludes || step.agentNameIncludes.length === 0) {
    return null;
  }

  const normalizedMatchers = step.agentNameIncludes.map((value) => value.toLowerCase());
  return availableAgents.find((agent) => {
    const searchTarget = normalizeAgentText(agent);
    return normalizedMatchers.some((matcher) => searchTarget.includes(matcher));
  }) ?? null;
}

export function findWorkflowForPrompt(_prompt: string): WorkflowDefinition | null {
  // Mock behavior for spike: always return the first workflow.
  return WORKFLOW_LIBRARY[0] ?? null;
}

export function resolveWorkflowSteps(
  workflow: WorkflowDefinition,
  agents: AgentWithOwner[]
): ResolvedWorkflowStep[] {
  const fallbackSortedAgents = sortAgentsForFallback(agents);
  const usedAgentIds = new Set<string>();
  const resolvedSteps: ResolvedWorkflowStep[] = [];

  workflow.steps.forEach((step) => {
    const availableAgents = fallbackSortedAgents.filter((agent) => !usedAgentIds.has(agent._id));

    let matchedAgent = findByNameMatch(step, availableAgents);
    if (!matchedAgent && step.fallbackAgentIndex !== undefined) {
      matchedAgent = availableAgents[step.fallbackAgentIndex] ?? null;
    }
    if (!matchedAgent) return;

    usedAgentIds.add(matchedAgent._id);
    resolvedSteps.push({
      ...step,
      agent: matchedAgent,
    });
  });

  return resolvedSteps;
}
