/**
 * Strategy layer domain types
 *
 * These types model the strategic reasoning chain:
 * Pressures → Objectives → Departments → Services → Flows → Deviations → Initiatives
 */

export interface StrategicPressure {
  id: string;
  type: 'external' | 'internal';
  title: string;
  description: string;
  evidence: string[];
}

export interface StrategicObjective {
  id: string;
  scope: 'enterprise' | 'department';
  title: string;
  description: string;
  departmentId?: string;
  linkedPressureIds: string[];
}

export interface Department {
  id: string;
  name: string;
  description: string;
  /** Top pain points / improvement areas surfaced to the overview level */
  keyIssues: string[];
}

export interface Service {
  id: string;
  departmentId: string;
  name: string;
  purpose: string;
  customer: string;
  trigger: string;
  outcome: string;
  constraints: string[];
  status: 'not-analyzed' | 'analyzed' | 'has-deviations';
  /** Qualitative: is the service achieving the right outcome? */
  effectivenessMetric: string;
  /** Qualitative: how much effort/time/cost to deliver the outcome? */
  efficiencyMetric: string;
}

export type FlowStepType =
  | 'input'
  | 'process'
  | 'output'
  | 'control'
  | 'approval'
  | 'handoff'
  | 'rework'
  | 'exception';

export interface FlowStep {
  id: string;
  serviceId: string;
  flowType: 'ideal' | 'current';
  order: number;
  description: string;
  stepType: FlowStepType;
  hasDeviation?: boolean;
  /** Steps with the same parallelGroup are visually grouped together */
  parallelGroup?: string;
  /** Optional label for the group (only needed on the first step) */
  groupLabel?: string;
}

export type DeviationImpact = 'high' | 'medium' | 'low';

export type DeviationTreatment = 'automate' | 'eliminate' | 'simplify' | 'accept';

export type DeviationClassification =
  | 'approval'
  | 'handoff'
  | 'rework'
  | 'system-constraint'
  | 'exception'
  | 'control';

export interface Deviation {
  id: string;
  serviceId: string;
  flowStepId?: string;
  what: string;
  why: string;
  necessary: boolean;
  impact: DeviationImpact;
  treatment: DeviationTreatment;
  classification: DeviationClassification;
}

export interface LinkedAgent {
  id: string;
  name: string;
  /** What this agent does for this initiative */
  role: string;
}

export interface Initiative {
  id: string;
  /** Initiatives are scoped to a service and may be informed by many factors, not only deviations. */
  serviceId: string;
  title: string;
  description: string;
  status: 'proposed' | 'approved' | 'in-progress' | 'done';
  linkedAgents: LinkedAgent[];
}

/** Computed summary for department cards */
export interface DepartmentSummary extends Department {
  serviceCount: number;
  deviationCount: number;
  analyzedCount: number;
}
