/**
 * Mock data for the strategy layer prototype
 *
 * Scenario: A B2B SaaS company facing growth challenges.
 * Realistic enough to test navigation and information hierarchy.
 */

import type {
  StrategicPressure,
  StrategicObjective,
  Department,
  Service,
  FlowStep,
  Deviation,
  Initiative,
} from './types';

// ── Pressures ──────────────────────────────────────────────

export const MOCK_PRESSURES: StrategicPressure[] = [
  {
    id: 'p-1',
    type: 'external',
    title: 'Market Consolidation',
    description:
      'Competitors acquiring niche players and creating all-in-one platforms. Three acquisitions in the last 12 months have shifted buyer expectations toward integrated suites.',
    evidence: [
      'Competitor A acquired DataSync (Jan 2026)',
      'Competitor B launched unified platform (Mar 2026)',
      'Win rate down 8% in competitive deals',
    ],
  },
  {
    id: 'p-2',
    type: 'external',
    title: 'AI-Driven Disruption',
    description:
      'Customers expect AI-native workflows, not bolt-on features. New entrants are shipping AI-first products that automate what our customers do manually today.',
    evidence: [
      'Three AI-native competitors entered market in Q4 2025',
      'Customer survey: 67% want AI automation in next renewal',
      'Two enterprise prospects chose AI-first competitor',
    ],
  },
  {
    id: 'p-3',
    type: 'external',
    title: 'Regulatory Expansion',
    description:
      'New data privacy and AI governance regulations in target markets require compliance investment and operational changes.',
    evidence: [
      'EU AI Act enforcement begins 2026',
      'Updated SOC 2 requirements for AI systems',
      'Two enterprise deals blocked by compliance gaps',
    ],
  },
  {
    id: 'p-4',
    type: 'internal',
    title: 'Manual Revenue Operations',
    description:
      'Sales-to-finance handoffs require 6+ manual steps across 3 separate systems. Error rate of 12% on deal data entry causes billing disputes.',
    evidence: [
      '6.2 manual touchpoints per deal (avg)',
      '12% data entry error rate',
      '23 billing disputes last quarter',
    ],
  },
  {
    id: 'p-5',
    type: 'internal',
    title: 'Slow Customer Onboarding',
    description:
      'Average 23 days from signed contract to first value milestone. Industry benchmark is 7 days. Directly impacts NPS and early churn.',
    evidence: [
      '23-day avg onboarding (vs 7-day benchmark)',
      'NPS drops 15 points during onboarding',
      '18% of churn happens in first 90 days',
    ],
  },
  {
    id: 'p-6',
    type: 'internal',
    title: 'Fragmented Customer Data',
    description:
      'Customer health signals scattered across CRM, support ticketing, product analytics, and spreadsheets. No single view of customer risk.',
    evidence: [
      'Data in 4 disconnected systems',
      'CSMs spend 3hrs/week assembling health reports',
      'Missed churn signals for 3 enterprise accounts in Q1',
    ],
  },
];

// ── Objectives ─────────────────────────────────────────────

export const MOCK_OBJECTIVES: StrategicObjective[] = [
  {
    id: 'obj-1',
    scope: 'enterprise',
    title: 'Reduce time-to-value to under 10 days',
    description:
      'Cut onboarding time from 23 days to under 10 days to match competitive benchmarks and reduce early churn.',
    linkedPressureIds: ['p-5', 'p-2'],
  },
  {
    id: 'obj-2',
    scope: 'enterprise',
    title: 'Automate 80% of revenue operations handoffs',
    description:
      'Eliminate manual touchpoints between sales, finance, and customer success to reduce errors and accelerate deal-to-revenue cycle.',
    linkedPressureIds: ['p-4', 'p-1'],
  },
  {
    id: 'obj-3',
    scope: 'enterprise',
    title: 'Achieve unified customer health scoring',
    description:
      'Build a single, real-time view of customer health that combines product usage, support signals, and engagement data.',
    linkedPressureIds: ['p-6', 'p-2'],
  },
  {
    id: 'obj-4',
    scope: 'enterprise',
    title: 'Complete SOC 2 Type II certification',
    description:
      'Achieve SOC 2 Type II certification to unblock enterprise deals and meet updated regulatory requirements.',
    linkedPressureIds: ['p-3'],
  },
  {
    id: 'obj-5',
    scope: 'department',
    title: 'Reduce onboarding time to under 10 days',
    description: 'Streamline the customer onboarding process from contract signature to first value milestone.',
    departmentId: 'dept-cs',
    linkedPressureIds: ['p-5'],
  },
  {
    id: 'obj-6',
    scope: 'department',
    title: 'Automate deal-to-revenue pipeline',
    description: 'Eliminate manual handoffs between sales closing and finance invoicing.',
    departmentId: 'dept-sales',
    linkedPressureIds: ['p-4'],
  },
  {
    id: 'obj-7',
    scope: 'department',
    title: 'Reduce month-end close to 3 days',
    description: 'Accelerate financial close by automating data flows and reconciliation.',
    departmentId: 'dept-finance',
    linkedPressureIds: ['p-4'],
  },
];

// ── Departments ────────────────────────────────────────────

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'dept-cs',
    name: 'Customer Success',
    description:
      'Responsible for customer onboarding, health monitoring, and retention. Primary interface between the product and customer outcomes.',
    keyIssues: [
      'Onboarding takes 23 days vs. 7-day industry benchmark',
      'Manual handoffs between Sales, CS, and Enablement cause delays',
      'No unified view of customer health across systems',
      '18% of churn occurs in first 90 days',
    ],
  },
  {
    id: 'dept-sales',
    name: 'Sales Operations',
    description:
      'Manages deal processing, revenue forecasting, and sales-to-finance handoffs. Owns the pipeline from qualified opportunity to closed deal.',
    keyIssues: [
      '6+ manual steps per deal from close to revenue recognition',
      '12% error rate on deal data entry causes billing disputes',
      'Proposals manually assembled from templates — no CPQ',
      'Finance notification via email — no system integration',
    ],
  },
  {
    id: 'dept-finance',
    name: 'Finance',
    description:
      'Handles invoicing, revenue recognition, and compliance. Responsible for accurate billing and regulatory reporting.',
    keyIssues: [
      'Manual data entry from email into billing system',
      'Payment tracking is a weekly manual process',
      'SOC 2 compliance gaps blocking enterprise deals',
      'Month-end close takes 8 days vs. 3-day target',
    ],
  },
];

// ── Services ───────────────────────────────────────────────

export const MOCK_SERVICES: Service[] = [
  // Customer Success
  {
    id: 'svc-onboarding',
    departmentId: 'dept-cs',
    name: 'Customer Onboarding',
    purpose: 'Guide new customers from signed contract to first value milestone',
    customer: 'New customers (post-sale)',
    trigger: 'Signed contract in CRM',
    outcome: 'Customer achieves first value milestone and is self-sufficient',
    constraints: ['Must comply with data residency requirements', 'Enterprise customers require dedicated environment'],
    status: 'has-deviations',
    effectivenessMetric: 'Customers eventually reach value milestone, but 18% churn before completing onboarding — the outcome is achieved too late to prevent early attrition.',
    efficiencyMetric: '23-day average vs. 7-day benchmark. 6 handoffs, 3 systems touched manually, ~4 hours CSM time per customer.',
  },
  {
    id: 'svc-health',
    departmentId: 'dept-cs',
    name: 'Health Monitoring & Intervention',
    purpose: 'Proactively identify at-risk customers and intervene before churn',
    customer: 'Active customers',
    trigger: 'Health score drops below threshold or usage pattern changes',
    outcome: 'At-risk customer re-engaged with clear action plan',
    constraints: ['Health data must update within 24 hours', 'Intervention SLA: 48 hours from signal'],
    status: 'analyzed',
    effectivenessMetric: 'Interventions recover ~60% of flagged accounts, but signals are often detected too late — 3 enterprise accounts churned in Q1 before any alert was raised.',
    efficiencyMetric: 'CSMs spend 3 hours/week manually assembling health data from 4 systems. Reactive rather than predictive.',
  },
  {
    id: 'svc-renewal',
    departmentId: 'dept-cs',
    name: 'Renewal Management',
    purpose: 'Manage contract renewals to maximize retention and expansion',
    customer: 'Customers approaching renewal window',
    trigger: '90 days before contract end date',
    outcome: 'Customer renews or expands contract',
    constraints: ['Renewal process must start 90 days out', 'Pricing changes require VP approval'],
    status: 'not-analyzed',
    effectivenessMetric: 'Not yet assessed.',
    efficiencyMetric: 'Not yet assessed.',
  },
  // Sales Operations
  {
    id: 'svc-deal',
    departmentId: 'dept-sales',
    name: 'Deal Processing',
    purpose: 'Move qualified opportunities through proposal, negotiation, and close',
    customer: 'Sales representatives and prospects',
    trigger: 'Opportunity reaches proposal stage',
    outcome: 'Signed deal with accurate revenue schedule recorded',
    constraints: ['All deals require signed MSA', 'Discounts above 15% require VP approval'],
    status: 'has-deviations',
    effectivenessMetric: 'Deals close successfully, but 12% have data entry errors that cause downstream billing disputes. Revenue schedule accuracy is inconsistent.',
    efficiencyMetric: '6+ manual touchpoints per deal. Proposal creation takes 2-3 hours. Finance handoff adds 1-2 day delay.',
  },
  {
    id: 'svc-forecast',
    departmentId: 'dept-sales',
    name: 'Revenue Forecasting',
    purpose: 'Produce accurate weekly and monthly revenue forecasts',
    customer: 'Executive team and board',
    trigger: 'Weekly forecast cycle (Monday)',
    outcome: 'Forecast within ±5% of actual revenue',
    constraints: ['Must incorporate pipeline, renewal, and expansion data', 'Board-ready format required monthly'],
    status: 'not-analyzed',
    effectivenessMetric: 'Not yet assessed.',
    efficiencyMetric: 'Not yet assessed.',
  },
  // Finance
  {
    id: 'svc-invoice',
    departmentId: 'dept-finance',
    name: 'Invoice Processing',
    purpose: 'Generate and deliver accurate invoices from closed deals',
    customer: 'Customers (billing contacts) and internal accounting',
    trigger: 'Deal closed in CRM',
    outcome: 'Invoice delivered and payment received on schedule',
    constraints: ['Invoices must comply with tax jurisdiction rules', 'Net-30 standard, Net-60 requires approval'],
    status: 'has-deviations',
    effectivenessMetric: 'Invoices eventually go out, but 23 billing disputes last quarter from data entry errors. Late invoicing delays cash collection by avg 5 days.',
    efficiencyMetric: 'Fully manual: email trigger, manual data entry, manual payment tracking. ~45 min per invoice.',
  },
  {
    id: 'svc-revrec',
    departmentId: 'dept-finance',
    name: 'Revenue Recognition',
    purpose: 'Recognize revenue according to ASC 606 standards',
    customer: 'CFO, auditors, and board',
    trigger: 'Invoice issued or payment received',
    outcome: 'Revenue correctly recognized in financial statements',
    constraints: ['Must comply with ASC 606', 'Multi-year deals require allocation across performance obligations'],
    status: 'not-analyzed',
    effectivenessMetric: 'Not yet assessed.',
    efficiencyMetric: 'Not yet assessed.',
  },
];

// ── Flow Steps ─────────────────────────────────────────────

export const MOCK_FLOW_STEPS: FlowStep[] = [
  // Customer Onboarding – Ideal (multiple inputs, parallel provisioning steps)
  { id: 'fs-1', serviceId: 'svc-onboarding', flowType: 'ideal', order: 1, stepType: 'input', description: 'Contract data received from CRM', parallelGroup: 'onboard-inputs', groupLabel: 'Inputs' },
  { id: 'fs-1b', serviceId: 'svc-onboarding', flowType: 'ideal', order: 2, stepType: 'input', description: 'Customer profile and technical requirements captured', parallelGroup: 'onboard-inputs' },
  { id: 'fs-2', serviceId: 'svc-onboarding', flowType: 'ideal', order: 3, stepType: 'process', description: 'Provision account and access credentials', parallelGroup: 'onboard-provision', groupLabel: 'Provisioning' },
  { id: 'fs-3', serviceId: 'svc-onboarding', flowType: 'ideal', order: 4, stepType: 'process', description: 'Apply configuration template based on plan tier', parallelGroup: 'onboard-provision' },
  { id: 'fs-4', serviceId: 'svc-onboarding', flowType: 'ideal', order: 5, stepType: 'process', description: 'Deliver guided onboarding session' },
  { id: 'fs-5', serviceId: 'svc-onboarding', flowType: 'ideal', order: 6, stepType: 'control', description: 'Verify customer completes activation checklist' },
  { id: 'fs-6', serviceId: 'svc-onboarding', flowType: 'ideal', order: 7, stepType: 'output', description: 'Customer achieves first value milestone' },
  { id: 'fs-6b', serviceId: 'svc-onboarding', flowType: 'ideal', order: 8, stepType: 'output', description: 'Onboarding summary delivered to account team' },

  // Customer Onboarding – Current
  { id: 'fs-7', serviceId: 'svc-onboarding', flowType: 'current', order: 1, stepType: 'input', description: 'Contract data received from CRM' },
  { id: 'fs-8', serviceId: 'svc-onboarding', flowType: 'current', order: 2, stepType: 'handoff', description: 'Sales rep emails CS team with deal details', hasDeviation: true },
  { id: 'fs-9', serviceId: 'svc-onboarding', flowType: 'current', order: 3, stepType: 'approval', description: 'CS manager reviews and assigns CSM', hasDeviation: true },
  { id: 'fs-10', serviceId: 'svc-onboarding', flowType: 'current', order: 4, stepType: 'process', description: 'CSM manually creates accounts in 3 separate systems', hasDeviation: true },
  { id: 'fs-11', serviceId: 'svc-onboarding', flowType: 'current', order: 5, stepType: 'process', description: 'CSM configures settings based on sales notes' },
  { id: 'fs-12', serviceId: 'svc-onboarding', flowType: 'current', order: 6, stepType: 'handoff', description: 'CSM requests training slot from enablement team', hasDeviation: true },
  { id: 'fs-13', serviceId: 'svc-onboarding', flowType: 'current', order: 7, stepType: 'approval', description: 'Enablement manager approves training schedule' },
  { id: 'fs-14', serviceId: 'svc-onboarding', flowType: 'current', order: 8, stepType: 'process', description: 'Enablement delivers training session' },
  { id: 'fs-15', serviceId: 'svc-onboarding', flowType: 'current', order: 9, stepType: 'rework', description: 'CSM follows up on incomplete setup items', hasDeviation: true },
  { id: 'fs-16', serviceId: 'svc-onboarding', flowType: 'current', order: 10, stepType: 'exception', description: 'Handle custom integration requests via engineering ticket' },
  { id: 'fs-17', serviceId: 'svc-onboarding', flowType: 'current', order: 11, stepType: 'control', description: 'Manager reviews onboarding completion' },
  { id: 'fs-18', serviceId: 'svc-onboarding', flowType: 'current', order: 12, stepType: 'output', description: 'Customer marked as "onboarded" in CRM' },

  // Deal Processing – Ideal (parallel outputs)
  { id: 'fs-19', serviceId: 'svc-deal', flowType: 'ideal', order: 1, stepType: 'input', description: 'Qualified opportunity reaches proposal stage' },
  { id: 'fs-20', serviceId: 'svc-deal', flowType: 'ideal', order: 2, stepType: 'process', description: 'Generate proposal from pricing rules' },
  { id: 'fs-21', serviceId: 'svc-deal', flowType: 'ideal', order: 3, stepType: 'control', description: 'Validate terms against approval matrix' },
  { id: 'fs-22', serviceId: 'svc-deal', flowType: 'ideal', order: 4, stepType: 'process', description: 'Execute contract' },
  { id: 'fs-23', serviceId: 'svc-deal', flowType: 'ideal', order: 5, stepType: 'output', description: 'Signed deal recorded with revenue schedule', parallelGroup: 'deal-outputs', groupLabel: 'Outputs' },
  { id: 'fs-23b', serviceId: 'svc-deal', flowType: 'ideal', order: 6, stepType: 'output', description: 'CS notified with deal context for onboarding', parallelGroup: 'deal-outputs' },

  // Deal Processing – Current
  { id: 'fs-24', serviceId: 'svc-deal', flowType: 'current', order: 1, stepType: 'input', description: 'Qualified opportunity reaches proposal stage' },
  { id: 'fs-25', serviceId: 'svc-deal', flowType: 'current', order: 2, stepType: 'process', description: 'Rep manually builds proposal in Google Docs', hasDeviation: true },
  { id: 'fs-26', serviceId: 'svc-deal', flowType: 'current', order: 3, stepType: 'approval', description: 'Manager reviews pricing for any discount' },
  { id: 'fs-27', serviceId: 'svc-deal', flowType: 'current', order: 4, stepType: 'handoff', description: 'Legal reviews non-standard terms' },
  { id: 'fs-28', serviceId: 'svc-deal', flowType: 'current', order: 5, stepType: 'approval', description: 'VP approval for deals over $50k' },
  { id: 'fs-29', serviceId: 'svc-deal', flowType: 'current', order: 6, stepType: 'process', description: 'Contract sent via DocuSign' },
  { id: 'fs-30', serviceId: 'svc-deal', flowType: 'current', order: 7, stepType: 'handoff', description: 'Rep notifies finance of closed deal via email', hasDeviation: true },
  { id: 'fs-31', serviceId: 'svc-deal', flowType: 'current', order: 8, stepType: 'output', description: 'Finance manually enters deal into billing system', hasDeviation: true },

  // Invoice Processing – Ideal (parallel inputs, parallel mid-process, parallel outputs)
  { id: 'fs-32', serviceId: 'svc-invoice', flowType: 'ideal', order: 1, stepType: 'input', description: 'Deal data synced from CRM with revenue schedule', parallelGroup: 'inv-inputs', groupLabel: 'Inputs' },
  { id: 'fs-32b', serviceId: 'svc-invoice', flowType: 'ideal', order: 2, stepType: 'input', description: 'Customer billing profile confirmed from account record', parallelGroup: 'inv-inputs' },
  { id: 'fs-33', serviceId: 'svc-invoice', flowType: 'ideal', order: 3, stepType: 'process', description: 'Generate invoice from contract terms', parallelGroup: 'inv-generate', groupLabel: 'Invoice generation' },
  { id: 'fs-33b', serviceId: 'svc-invoice', flowType: 'ideal', order: 4, stepType: 'process', description: 'Apply tax jurisdiction rules automatically', parallelGroup: 'inv-generate' },
  { id: 'fs-34', serviceId: 'svc-invoice', flowType: 'ideal', order: 5, stepType: 'process', description: 'Send invoice to customer' },
  { id: 'fs-35', serviceId: 'svc-invoice', flowType: 'ideal', order: 6, stepType: 'control', description: 'Track payment against terms with automated alerts' },
  { id: 'fs-36', serviceId: 'svc-invoice', flowType: 'ideal', order: 7, stepType: 'output', description: 'Payment received and recorded in ledger', parallelGroup: 'inv-outputs', groupLabel: 'Outputs' },
  { id: 'fs-36b', serviceId: 'svc-invoice', flowType: 'ideal', order: 8, stepType: 'output', description: 'Revenue recognition schedule updated', parallelGroup: 'inv-outputs' },

  // Invoice Processing – Current
  { id: 'fs-37', serviceId: 'svc-invoice', flowType: 'current', order: 1, stepType: 'input', description: 'Finance receives email notification of closed deal' },
  { id: 'fs-38', serviceId: 'svc-invoice', flowType: 'current', order: 2, stepType: 'process', description: 'Accountant manually enters data into billing system', hasDeviation: true },
  { id: 'fs-39', serviceId: 'svc-invoice', flowType: 'current', order: 3, stepType: 'process', description: 'Accountant looks up tax rules for customer jurisdiction' },
  { id: 'fs-40', serviceId: 'svc-invoice', flowType: 'current', order: 4, stepType: 'control', description: 'Senior accountant reviews invoice before sending' },
  { id: 'fs-41', serviceId: 'svc-invoice', flowType: 'current', order: 5, stepType: 'process', description: 'Invoice sent to customer via email' },
  { id: 'fs-42', serviceId: 'svc-invoice', flowType: 'current', order: 6, stepType: 'process', description: 'Accountant manually tracks payment status weekly', hasDeviation: true },
  { id: 'fs-43', serviceId: 'svc-invoice', flowType: 'current', order: 7, stepType: 'exception', description: 'Escalate overdue invoices to account manager' },
  { id: 'fs-44', serviceId: 'svc-invoice', flowType: 'current', order: 8, stepType: 'output', description: 'Payment matched manually in bank reconciliation' },
  { id: 'fs-45', serviceId: 'svc-invoice', flowType: 'current', order: 9, stepType: 'handoff', description: 'Finance emails rev rec team to update schedules' },
];

// ── Deviations ─────────────────────────────────────────────

export const MOCK_DEVIATIONS: Deviation[] = [
  // Customer Onboarding
  {
    id: 'dev-1',
    serviceId: 'svc-onboarding',
    flowStepId: 'fs-8',
    what: 'Manual email handoff from Sales to CS',
    why: 'No automated trigger when deal closes in CRM',
    necessary: false,
    impact: 'high',
    treatment: 'automate',
    classification: 'handoff',
  },
  {
    id: 'dev-2',
    serviceId: 'svc-onboarding',
    flowStepId: 'fs-9',
    what: 'Manager approval required for CSM assignment',
    why: 'No assignment rules or capacity model exists',
    necessary: false,
    impact: 'medium',
    treatment: 'eliminate',
    classification: 'approval',
  },
  {
    id: 'dev-3',
    serviceId: 'svc-onboarding',
    flowStepId: 'fs-10',
    what: 'Manual account provisioning across 3 systems',
    why: 'Systems lack a unified provisioning API',
    necessary: false,
    impact: 'high',
    treatment: 'automate',
    classification: 'system-constraint',
  },
  {
    id: 'dev-4',
    serviceId: 'svc-onboarding',
    flowStepId: 'fs-12',
    what: 'Training handoff to separate enablement team',
    why: 'Historical org structure separates CS from enablement',
    necessary: false,
    impact: 'medium',
    treatment: 'simplify',
    classification: 'handoff',
  },
  {
    id: 'dev-5',
    serviceId: 'svc-onboarding',
    flowStepId: 'fs-15',
    what: 'Rework on incomplete setup items',
    why: 'No checklist gates prevent moving forward with incomplete setup',
    necessary: false,
    impact: 'high',
    treatment: 'eliminate',
    classification: 'rework',
  },

  // Deal Processing
  {
    id: 'dev-6',
    serviceId: 'svc-deal',
    flowStepId: 'fs-25',
    what: 'Manual proposal creation in Google Docs',
    why: 'No CPQ tool configured; reps copy from templates',
    necessary: false,
    impact: 'medium',
    treatment: 'automate',
    classification: 'system-constraint',
  },
  {
    id: 'dev-7',
    serviceId: 'svc-deal',
    flowStepId: 'fs-30',
    what: 'Email notification to finance on deal close',
    why: 'CRM and billing systems are not integrated',
    necessary: false,
    impact: 'high',
    treatment: 'eliminate',
    classification: 'handoff',
  },
  {
    id: 'dev-8',
    serviceId: 'svc-deal',
    flowStepId: 'fs-31',
    what: 'Manual deal data entry into billing system',
    why: 'No CRM-to-billing integration exists',
    necessary: false,
    impact: 'high',
    treatment: 'automate',
    classification: 'system-constraint',
  },

  // Invoice Processing
  {
    id: 'dev-9',
    serviceId: 'svc-invoice',
    flowStepId: 'fs-38',
    what: 'Manual data entry from email into billing system',
    why: 'Finance relies on email notifications rather than system integration',
    necessary: false,
    impact: 'high',
    treatment: 'automate',
    classification: 'system-constraint',
  },
  {
    id: 'dev-10',
    serviceId: 'svc-invoice',
    flowStepId: 'fs-42',
    what: 'Manual weekly payment tracking',
    why: 'Billing system lacks automated AR tracking and alerting',
    necessary: false,
    impact: 'medium',
    treatment: 'automate',
    classification: 'system-constraint',
  },
  {
    id: 'dev-11',
    serviceId: 'svc-invoice',
    flowStepId: 'fs-39',
    what: 'Manual tax jurisdiction lookup per invoice',
    why: 'No automated tax engine integrated with billing system',
    necessary: false,
    impact: 'medium',
    treatment: 'automate',
    classification: 'system-constraint',
  },
  {
    id: 'dev-12',
    serviceId: 'svc-invoice',
    flowStepId: 'fs-45',
    what: 'Email handoff to rev rec team for schedule updates',
    why: 'Billing and rev rec systems are disconnected',
    necessary: false,
    impact: 'high',
    treatment: 'eliminate',
    classification: 'handoff',
  },
];

// ── Initiatives ────────────────────────────────────────────

export const MOCK_INITIATIVES: Initiative[] = [
  // Customer Onboarding
  {
    id: 'init-1',
    serviceId: 'svc-onboarding',
    deviationIds: ['dev-1', 'dev-2'],
    title: 'CRM-Triggered Onboarding Automation',
    description: 'Build CRM workflow that automatically notifies CS, creates onboarding task, and auto-assigns CSM based on territory and capacity when a deal closes.',
    status: 'approved',
    linkedAgents: [
      { id: 'agent-crm-workflow-analyzer', name: 'CRM Workflow Analyzer', role: 'Deep research — map current CRM triggers and data flows' },
      { id: 'agent-integration-builder', name: 'Integration Builder', role: 'Process automation — build the CRM-to-CS notification pipeline' },
    ],
  },
  {
    id: 'init-2',
    serviceId: 'svc-onboarding',
    deviationIds: ['dev-3'],
    title: 'Single-API Account Provisioning',
    description: 'Develop unified provisioning service that creates accounts across all 3 systems via one API call.',
    status: 'proposed',
    linkedAgents: [
      { id: 'agent-system-mapping', name: 'System Mapping Agent', role: 'Deep research — document APIs and data models across all 3 systems' },
    ],
  },
  {
    id: 'init-3',
    serviceId: 'svc-onboarding',
    deviationIds: ['dev-4', 'dev-5'],
    title: 'Guided Onboarding Redesign',
    description: 'Redesign onboarding so CSM delivers training directly with gate-based progression — eliminates enablement handoff and prevents incomplete setup.',
    status: 'in-progress',
    linkedAgents: [
      { id: 'agent-process-simplification', name: 'Process Simplification Agent', role: 'Analysis — model the redesigned flow and identify gaps' },
      { id: 'agent-checklist-builder', name: 'Checklist Builder', role: 'Process automation — implement gate-based progression logic' },
    ],
  },
  // Deal Processing
  {
    id: 'init-4',
    serviceId: 'svc-deal',
    deviationIds: ['dev-6'],
    title: 'CPQ Implementation',
    description: 'Deploy configure-price-quote tool to auto-generate proposals from pricing rules and deal parameters.',
    status: 'proposed',
    linkedAgents: [
      { id: 'agent-pricing-rules-analyst', name: 'Pricing Rules Analyst', role: 'Deep research — extract and formalize current pricing logic' },
    ],
  },
  {
    id: 'init-5',
    serviceId: 'svc-deal',
    deviationIds: ['dev-7', 'dev-8'],
    title: 'CRM-to-Billing Integration',
    description: 'Integrate CRM with billing system to auto-create invoices when deals close, eliminating manual handoff and data entry.',
    status: 'approved',
    linkedAgents: [
      { id: 'agent-data-mapping', name: 'Data Mapping Agent', role: 'Deep research — map fields between CRM and billing system' },
      { id: 'agent-integration-builder', name: 'Integration Builder', role: 'Process automation — build the sync pipeline' },
      { id: 'agent-reconciliation-monitor', name: 'Reconciliation Monitor', role: 'Monitoring — validate data consistency post-integration' },
    ],
  },
  // Invoice Processing
  {
    id: 'init-6',
    serviceId: 'svc-invoice',
    deviationIds: ['dev-9', 'dev-11'],
    title: 'Automated Invoice Generation',
    description: 'Auto-generate invoices from deal data with integrated tax engine — eliminates manual data entry and tax lookup.',
    status: 'approved',
    linkedAgents: [
      { id: 'agent-tax-rules-researcher', name: 'Tax Rules Researcher', role: 'Deep research — catalog jurisdiction rules and compliance requirements' },
      { id: 'agent-invoice-automation', name: 'Invoice Automation Agent', role: 'Process automation — build the auto-generation pipeline' },
    ],
  },
  {
    id: 'init-7',
    serviceId: 'svc-invoice',
    deviationIds: ['dev-10'],
    title: 'Automated AR Tracking & Alerts',
    description: 'Configure billing system to automatically track payment status and send alerts for overdue invoices.',
    status: 'proposed',
    linkedAgents: [
      { id: 'agent-ar-monitoring', name: 'AR Monitoring Agent', role: 'Monitoring — track payment status and trigger escalations' },
    ],
  },
  {
    id: 'init-8',
    serviceId: 'svc-invoice',
    deviationIds: ['dev-12'],
    title: 'Billing-to-RevRec Auto-Sync',
    description: 'Connect billing system to revenue recognition so payment events automatically update rev rec schedules.',
    status: 'approved',
    linkedAgents: [
      { id: 'agent-data-mapping', name: 'Data Mapping Agent', role: 'Deep research — map billing events to rev rec schedule entries' },
      { id: 'agent-integration-builder', name: 'Integration Builder', role: 'Process automation — build the event-driven sync' },
    ],
  },
];
