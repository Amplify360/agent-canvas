/**
 * Workflow types for prompt-driven workflow spotlight mode.
 */

import type { AgentWithOwner } from '@/types/agent';

export interface WorkflowStepDefinition {
  id: string;
  label: string;
  agentNameIncludes?: string[];
  fallbackAgentIndex?: number;
  inputs: string[];
  outputs: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  suggestedPrompts: string[];
  steps: WorkflowStepDefinition[];
}

export interface ResolvedWorkflowStep extends WorkflowStepDefinition {
  agent: AgentWithOwner;
}

export interface WorkflowRunState {
  workflow: WorkflowDefinition;
  prompt: string;
  steps: ResolvedWorkflowStep[];
  activeStepIndex: number;
}

export interface WorkflowHighlightState {
  isActive: boolean;
  activeAgentId: string | null;
  sequenceByAgentId: Record<string, number>;
}
