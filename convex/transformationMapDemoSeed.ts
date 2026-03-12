import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { listMapChildren, recordTransformationHistory } from "./lib/transformationMap";

const DEFAULT_WORKOS_ORG_ID = "org_01KFN78YZND9ATN508FT2V9P19";
const DEFAULT_SLUG = "bsc-demo-transformation-map";
const DEFAULT_ACTOR = "system:bsc-demo-seed";
const MAP_TITLE = "BSC Demo Transformation Map";
const MAP_DESCRIPTION =
  "A representative transformation map for BSC Global, a 180-person data science and technology consultancy. Designed to demonstrate transformation concepts and functionality across support functions, with focus on Finance, HR, IT, and the Office of the CEO. The map reflects a business that is innovative and nimble, but experiencing growth constraints, rising bureaucracy, and a need to reinvent support services around internal customer service. It also highlights AI as both an existential threat and a strategic opportunity.";
const NOT_YET_ASSESSED = "Not yet assessed.";

type PressureSeed = {
  key: string;
  type: "external" | "internal";
  title: string;
  description: string;
  evidence: string[];
};

type ObjectiveSeed = {
  key: string;
  scope: "enterprise" | "department";
  departmentKey?: string;
  title: string;
  description: string;
  linkedPressureKeys: string[];
};

type DepartmentSeed = {
  key: string;
  name: string;
  description: string;
  keyIssues: string[];
};

type ServiceSeed = {
  key: string;
  departmentKey: string;
  name: string;
  purpose: string;
  customer: string;
  trigger: string;
  outcome: string;
  constraints: string[];
  status: "not-analyzed" | "analyzed" | "has-deviations";
  effectivenessMetric: string;
  efficiencyMetric: string;
};

type FlowStepSeed = {
  id: string;
  serviceId: string;
  flowType: "ideal" | "current";
  order: number;
  description: string;
  stepType: "input" | "process" | "output" | "control" | "approval" | "handoff" | "rework" | "exception";
  hasDeviation?: boolean;
  parallelGroup?: string;
  groupLabel?: string;
};

type DeviationSeed = {
  id: string;
  serviceId: string;
  flowStepId?: string;
  what: string;
  why: string;
  necessary: boolean;
  impact: "high" | "medium" | "low";
  treatment: "automate" | "eliminate" | "simplify" | "accept";
  classification: "approval" | "handoff" | "rework" | "system-constraint" | "exception" | "control";
};

type InitiativeSeed = {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  status: "proposed" | "approved" | "in-progress" | "done" | "parked";
  linkedAgents: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

type AnalysisSeed = {
  serviceKey: string;
  idealFlowSteps: FlowStepSeed[];
  currentFlowSteps: FlowStepSeed[];
  deviations: DeviationSeed[];
  initiatives: InitiativeSeed[];
};

function buildArtifactMeta(actor: string, now: number) {
  return {
    artifactStatus: "approved" as const,
    sourceType: "imported" as const,
    sourceRef: "internal.bsc-demo-seed",
    generatedAt: now,
    createdBy: actor,
    updatedBy: actor,
    createdAt: now,
    updatedAt: now,
  };
}

const pressures: PressureSeed[] = [
  {
    key: "pressure-growth-friction",
    type: "internal",
    title: "Growth is being constrained by internal friction",
    description:
      "BSC remains innovative and agile, but expansion is slowed by additional approvals, inconsistent ways of working, and support-process friction that accumulates as the company grows.",
    evidence: [
      "Teams spend too much time navigating support processes instead of serving clients",
      "Growth efforts can fragment when decision rights and execution ownership are unclear",
      "Support functions are adding control activity faster than they are adding service quality",
    ],
  },
  {
    key: "pressure-service-experience",
    type: "internal",
    title: "Support service experience is inconsistent",
    description:
      "Employees and managers do not experience Finance, HR, and IT as a coherent internal service layer. Responsiveness, visibility, and handoffs vary by team and by manager.",
    evidence: [
      "Internal customers report variable turnaround times and unclear ownership",
      "Employees often rely on follow-ups and escalation to get status updates",
      "Process quality depends too heavily on individual effort rather than service design",
    ],
  },
  {
    key: "pressure-leadership-bandwidth",
    type: "internal",
    title: "Leadership time is absorbed by coordination and escalation",
    description:
      "The executive team is repeatedly drawn into operational coordination, priority conflicts, and issue escalation rather than focusing on enterprise direction and growth.",
    evidence: [
      "Cross-functional blockers are escalated to leadership too often",
      "Strategic choices are not always translated into executable priorities",
      "Too much organizational energy is spent navigating bureaucracy",
    ],
  },
  {
    key: "pressure-visibility",
    type: "internal",
    title: "Decision-making lacks timely operating visibility",
    description:
      "Management visibility across requests, cases, cycle times, and service performance is uneven, reducing confidence in priorities, resourcing, and intervention decisions.",
    evidence: [
      "Management reporting can lag decisions",
      "There is limited end-to-end visibility into request status, bottlenecks, and service quality",
      "Leaders need better dashboards, issue heatmaps, and decision support",
    ],
  },
  {
    key: "pressure-ai-disruption",
    type: "external",
    title: "AI is reshaping BSC's market and delivery model",
    description:
      "AI is both an existential threat and a strategic opportunity. Consulting economics, client expectations, and capability requirements are shifting quickly.",
    evidence: [
      "AI can automate portions of knowledge work that previously differentiated consultancies",
      "Clients expect practical AI enablement, not generic experimentation",
      "Roles, skills, and service offers will need to adapt quickly",
    ],
  },
  {
    key: "pressure-ai-opportunity",
    type: "external",
    title: "AI can act as a force multiplier across support functions",
    description:
      "BSC has the talent base to use AI to simplify administration, improve insight quality, and redesign support services around internal customer self-service and augmented work.",
    evidence: [
      "Support processes contain low-value administrative work that is suitable for automation",
      "Knowledge-rich teams are well placed to adopt AI-assisted workflows",
      "A deliberate governance model is needed so experimentation can scale safely",
    ],
  },
];

const enterpriseObjectives: ObjectiveSeed[] = [
  {
    key: "objective-enable-growth-without-bureaucracy",
    scope: "enterprise",
    title: "Enable growth without adding bureaucracy",
    description:
      "Redesign support and governance so the business can scale with clearer decision rights, fewer manual approvals, and less internal friction.",
    linkedPressureKeys: ["pressure-growth-friction", "pressure-leadership-bandwidth"],
  },
  {
    key: "objective-reinvent-support-services",
    scope: "enterprise",
    title: "Reinvent support services around customer service",
    description:
      "Shift support functions from control-oriented back-office teams into responsive, service-oriented enablers of growth and employee success.",
    linkedPressureKeys: ["pressure-service-experience", "pressure-growth-friction"],
  },
  {
    key: "objective-operational-discipline",
    scope: "enterprise",
    title: "Preserve agility while improving operational discipline",
    description:
      "Introduce lightweight standardisation, workflow discipline, and measurable service performance without eroding the entrepreneurial culture.",
    linkedPressureKeys: ["pressure-growth-friction", "pressure-visibility"],
  },
  {
    key: "objective-ai-force-multiplier",
    scope: "enterprise",
    title: "Use AI as a force multiplier",
    description:
      "Apply AI to automate low-value work, speed up insight generation, improve employee self-service, and augment professional decision-making.",
    linkedPressureKeys: ["pressure-ai-opportunity", "pressure-service-experience"],
  },
  {
    key: "objective-ai-protection",
    scope: "enterprise",
    title: "Protect the business from AI disruption",
    description:
      "Build executive ownership, governance, and capability so BSC responds strategically to AI-driven changes in client demand, delivery economics, and talent needs.",
    linkedPressureKeys: ["pressure-ai-disruption", "pressure-leadership-bandwidth"],
  },
  {
    key: "objective-visibility",
    scope: "enterprise",
    title: "Improve management visibility and decision quality",
    description:
      "Create better service dashboards, request and case tracking, and performance insight across support functions so leaders can intervene faster and with more confidence.",
    linkedPressureKeys: ["pressure-visibility", "pressure-leadership-bandwidth"],
  },
  {
    key: "objective-standardize-personalize",
    scope: "enterprise",
    title: "Standardise where helpful, personalise where valuable",
    description:
      "Apply standard patterns to repeatable processes while preserving flexibility where stakeholder context and professional judgment matter most.",
    linkedPressureKeys: ["pressure-service-experience", "pressure-growth-friction"],
  },
];

const departments: DepartmentSeed[] = [
  {
    key: "dept-office-ceo",
    name: "Office of the CEO",
    description:
      "Drive enterprise direction, performance, prioritisation, and cross-functional alignment while keeping the company entrepreneurial, focused, and scalable.",
    keyIssues: [
      "Leadership time absorbed by internal coordination and escalation",
      "Strategy not always translated into executable priorities",
      "Growth efforts can be fragmented across functions",
      "AI strategy needs stronger executive ownership and translation into action",
    ],
  },
  {
    key: "dept-finance",
    name: "Finance",
    description:
      "Provide financial control, insight, planning, and commercial enablement in a way that supports growth, trust, and internal customer service.",
    keyIssues: [
      "Finance can become process-heavy and approval-heavy as controls accumulate",
      "Commercial responsiveness suffers when requests rely on manual approvals and incomplete project data",
      "Forecasting discipline is uneven across a project-based consulting model",
      "Employees and managers often experience Finance as gatekeeper rather than enabler",
    ],
  },
  {
    key: "dept-human-resources",
    name: "Human Resources",
    description:
      "Create a high-performing, people-centric employee experience that helps BSC attract, develop, engage, and retain exceptional talent while enabling growth and agility.",
    keyIssues: [
      "Growth requires better workforce planning and capability visibility",
      "Hiring and manager experience can be inconsistent and overly manager-dependent",
      "People processes feel fragmented and administrative",
      "AI will reshape roles, skills, career paths, and learning priorities",
    ],
  },
  {
    key: "dept-information-technology",
    name: "Information Technology",
    description:
      "Deliver secure, reliable, modern digital services that enable productivity, innovation, and AI adoption across the company.",
    keyIssues: [
      "Internal service experience can be inconsistent and ticket-driven",
      "Technology requests can bottleneck on manual routing and fragmented systems",
      "AI enablement must balance experimentation with governance",
      "IT needs to support scale without building heavy bureaucracy",
    ],
  },
];

const departmentObjectives: ObjectiveSeed[] = [
  {
    key: "objective-ceo-prioritization",
    scope: "department",
    departmentKey: "dept-office-ceo",
    title: "Turn strategy into an executable enterprise portfolio",
    description:
      "Translate strategy into clear priorities, investment choices, and transformation decisions that can be monitored and adjusted through the year.",
    linkedPressureKeys: ["pressure-leadership-bandwidth", "pressure-visibility"],
  },
  {
    key: "objective-ceo-escalations",
    scope: "department",
    departmentKey: "dept-office-ceo",
    title: "Reduce escalation load on the executive team",
    description:
      "Create clearer decision rights, structured issue escalation, and cross-functional ownership so leadership time is not consumed by routine operating friction.",
    linkedPressureKeys: ["pressure-leadership-bandwidth", "pressure-growth-friction"],
  },
  {
    key: "objective-ceo-ai",
    scope: "department",
    departmentKey: "dept-office-ceo",
    title: "Give AI strategy explicit executive ownership",
    description:
      "Set a practical direction for AI adoption, risk management, innovation, and pilot-to-scale decisions at enterprise level.",
    linkedPressureKeys: ["pressure-ai-disruption", "pressure-ai-opportunity"],
  },
  {
    key: "objective-finance-service",
    scope: "department",
    departmentKey: "dept-finance",
    title: "Reframe Finance as a service-oriented enabler",
    description:
      "Simplify requests, approvals, and communication so Finance supports growth decisions while maintaining trust and control.",
    linkedPressureKeys: ["pressure-service-experience", "pressure-growth-friction"],
  },
  {
    key: "objective-finance-forecasting",
    scope: "department",
    departmentKey: "dept-finance",
    title: "Improve forecasting, billing, and cash visibility",
    description:
      "Strengthen planning discipline, invoice readiness, collections visibility, and management insight across the consulting revenue model.",
    linkedPressureKeys: ["pressure-visibility", "pressure-growth-friction"],
  },
  {
    key: "objective-finance-ai",
    scope: "department",
    departmentKey: "dept-finance",
    title: "Use automation and AI to reduce low-value finance work",
    description:
      "Apply workflow automation, OCR, reporting automation, and AI-assisted commentary to shorten cycle times and improve internal service quality.",
    linkedPressureKeys: ["pressure-ai-opportunity", "pressure-service-experience"],
  },
  {
    key: "objective-hr-experience",
    scope: "department",
    departmentKey: "dept-human-resources",
    title: "Make the employee lifecycle more consistent and employee-centric",
    description:
      "Improve the experience of hiring, onboarding, development, and people support through clearer workflows, service levels, and status visibility.",
    linkedPressureKeys: ["pressure-service-experience", "pressure-growth-friction"],
  },
  {
    key: "objective-hr-capability",
    scope: "department",
    departmentKey: "dept-human-resources",
    title: "Build workforce, skills, and AI readiness visibility",
    description:
      "Strengthen workforce planning, skills insight, and learning pathways so BSC can adapt to growth needs and AI-driven role change.",
    linkedPressureKeys: ["pressure-ai-disruption", "pressure-visibility"],
  },
  {
    key: "objective-hr-manager",
    scope: "department",
    departmentKey: "dept-human-resources",
    title: "Reduce manager dependency and administrative burden in people processes",
    description:
      "Standardise critical people processes and provide better manager self-service, guardrails, and support.",
    linkedPressureKeys: ["pressure-growth-friction", "pressure-service-experience"],
  },
  {
    key: "objective-it-service",
    scope: "department",
    departmentKey: "dept-information-technology",
    title: "Improve IT service experience and responsiveness",
    description:
      "Shift from reactive ticket handling to clearer services, faster fulfilment, and better communication across employee technology needs.",
    linkedPressureKeys: ["pressure-service-experience", "pressure-visibility"],
  },
  {
    key: "objective-it-ai",
    scope: "department",
    departmentKey: "dept-information-technology",
    title: "Create governed AI enablement for the business",
    description:
      "Provide platforms, access patterns, governance, and support so practical AI adoption can move from experiment to scaled business capability.",
    linkedPressureKeys: ["pressure-ai-disruption", "pressure-ai-opportunity"],
  },
  {
    key: "objective-it-platforms",
    scope: "department",
    departmentKey: "dept-information-technology",
    title: "Simplify the digital environment without adding bureaucracy",
    description:
      "Improve identity, application support, and service management with lightweight controls, better workflow automation, and stronger operating visibility.",
    linkedPressureKeys: ["pressure-growth-friction", "pressure-visibility"],
  },
];

const services: ServiceSeed[] = [
  {
    key: "svc-ceo-strategy-growth-steering",
    departmentKey: "dept-office-ceo",
    name: "Strategy and Growth Steering",
    purpose: "Translate strategy into clear priorities, investment choices, and transformation initiatives.",
    customer: "CEO, executive team, and business leaders",
    trigger: "Strategy refresh, quarterly review cycle, or material growth decision",
    outcome: "A clear set of enterprise priorities, investment choices, and execution trade-offs",
    constraints: ["Decisions must balance agility with resourcing discipline", "Cross-functional dependencies must be visible"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-ceo-executive-decision-support",
    departmentKey: "dept-office-ceo",
    name: "Executive Decision Support",
    purpose: "Provide the CEO and executive team with structured insight, options, and governance mechanisms for timely decision-making.",
    customer: "CEO and executive team",
    trigger: "Executive forum, escalated issue, or decision request requiring cross-functional input",
    outcome: "Decisions are made with clarity on options, trade-offs, and owners",
    constraints: ["Information must be timely and concise", "Escalation pathways should stay lightweight"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-ceo-transformation-operating-model",
    departmentKey: "dept-office-ceo",
    name: "Transformation and Operating Model Enablement",
    purpose: "Coordinate enterprise transformation priorities and remove barriers to execution.",
    customer: "Executive sponsors and cross-functional initiative owners",
    trigger: "Transformation roadmap change, dependency issue, or benefit-tracking review",
    outcome: "Transformation activity remains aligned, sequenced, and unblockable",
    constraints: ["Benefits and adoption need to be visible", "Cross-functional ownership must stay explicit"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-ceo-ai-strategy-innovation",
    departmentKey: "dept-office-ceo",
    name: "AI Strategy and Enterprise Innovation",
    purpose: "Set direction for enterprise AI adoption, innovation focus, and strategic response to market disruption.",
    customer: "Executive team and innovation sponsors",
    trigger: "AI opportunity review, risk discussion, or pilot-to-scale decision",
    outcome: "AI priorities, guardrails, and scaling choices are owned at executive level",
    constraints: ["Innovation must balance speed, risk, and strategic fit", "Governance cannot suffocate experimentation"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-ceo-internal-communication",
    departmentKey: "dept-office-ceo",
    name: "Internal Communication and Alignment",
    purpose: "Keep the organization aligned on priorities, change, and performance.",
    customer: "Managers and employees",
    trigger: "Leadership update, town hall cycle, or major change initiative",
    outcome: "People understand priorities, why change is happening, and what is expected of them",
    constraints: ["Messages must be consistent across leadership layers", "Communications should reduce confusion rather than add noise"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-finance-fpa",
    departmentKey: "dept-finance",
    name: "Financial Planning and Analysis",
    purpose: "Support planning, forecasting, and performance insight, anchored around a more agile budgeting and forecasting process.",
    customer: "CEO, executive team, department leaders, and project leaders",
    trigger: "Annual planning cycle, quarterly forecast refresh, or material business change",
    outcome: "Leadership has a useful, current view of revenue, headcount, cost, and trade-offs",
    constraints: ["Forecasts must connect pipeline, hiring, and cost assumptions", "Outputs must remain lightweight enough for a fast-moving consultancy"],
    status: "has-deviations",
    effectivenessMetric: "Forecast usefulness is uneven because the process responds too slowly to change and the linkage between pipeline, hiring, and cost decisions is weak.",
    efficiencyMetric: "Planning remains spreadsheet-heavy, highly manual, and effort-intensive for Finance and business leads.",
  },
  {
    key: "svc-finance-management-accounting",
    departmentKey: "dept-finance",
    name: "Management Accounting and Reporting",
    purpose: "Produce timely, reliable financial information for management decision-making.",
    customer: "Executive team and department leaders",
    trigger: "Month-end close, reporting cycle, or management review request",
    outcome: "Leaders receive dependable financial insight and variance visibility in time to act",
    constraints: ["Close quality and reporting timeliness must both be maintained", "Outputs need to support commercial as well as financial decisions"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-finance-revenue-ops-billing",
    departmentKey: "dept-finance",
    name: "Revenue Operations and Billing",
    purpose: "Ensure delivered work is translated into accurate invoicing, revenue capture, and predictable cash conversion.",
    customer: "Project leads, commercial teams, finance operations, and client billing contacts",
    trigger: "Billable milestone reached, timesheet approved, or monthly billing cycle starts",
    outcome: "Accurate invoices are issued quickly and billing readiness is transparent",
    constraints: ["Client contract terms and project data must stay aligned", "Approval steps should not delay cash unnecessarily"],
    status: "has-deviations",
    effectivenessMetric: "Billing quality is acceptable but delays, missing approvals, and incomplete project data still create invoice disputes and slow cash collection.",
    efficiencyMetric: "The cycle depends on manual reviews, reminders, and spreadsheet tracking rather than workflow-driven billing readiness.",
  },
  {
    key: "svc-finance-ap-expense",
    departmentKey: "dept-finance",
    name: "Accounts Payable and Expense Management",
    purpose: "Pay suppliers accurately and reimburse employees quickly with low friction and appropriate policy compliance.",
    customer: "Employees, managers, suppliers, and finance operations",
    trigger: "Supplier invoice received or employee submits an expense claim",
    outcome: "Payments are compliant, timely, and visible to requestors",
    constraints: ["Policy compliance must be preserved", "Employees should not need repeated follow-up to understand claim status"],
    status: "has-deviations",
    effectivenessMetric: "Claims and invoices are eventually processed, but turnaround is inconsistent and employees experience policy interpretation as opaque.",
    efficiencyMetric: "AP and expense workflows involve too much back-and-forth, manual coding, and status chasing.",
  },
  {
    key: "svc-finance-ar-collections",
    departmentKey: "dept-finance",
    name: "Accounts Receivable and Collections",
    purpose: "Improve collections, working capital, and client payment discipline.",
    customer: "Finance operations, client accounts contacts, and commercial leaders",
    trigger: "Invoice issued, due date approaching, or payment becomes overdue",
    outcome: "Outstanding debt is visible, addressed, and reduced with minimal heroic effort",
    constraints: ["Collections must stay client-sensitive", "Disputes must be resolved with commercial context"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-finance-procurement-controls",
    departmentKey: "dept-finance",
    name: "Procurement and Commercial Controls",
    purpose: "Introduce lightweight commercial discipline without slowing the business down.",
    customer: "Managers, budget owners, and procurement stakeholders",
    trigger: "Vendor request, purchase approval, or policy exception",
    outcome: "Spend decisions are controlled with proportionate friction",
    constraints: ["Controls should be risk-based", "Approvals must stay proportionate to value and urgency"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-finance-business-partnering",
    departmentKey: "dept-finance",
    name: "Finance Business Partnering",
    purpose: "Help leaders make better financial decisions and improve accountability.",
    customer: "Department leads and executive sponsors",
    trigger: "Department review, pricing decision, or investment case request",
    outcome: "Leaders receive practical financial insight and scenario support",
    constraints: ["Advice must be timely enough to shape decisions", "Business partnering should complement rather than duplicate reporting"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-hr-workforce-planning",
    departmentKey: "dept-human-resources",
    name: "Workforce Planning and Organisation Design",
    purpose: "Align talent supply, structure, and capability with business strategy.",
    customer: "Executive team, HR, and people managers",
    trigger: "Planning cycle, organisational change, or capability review",
    outcome: "Leadership has a clear view of talent demand, structure, and critical capability gaps",
    constraints: ["Workforce plans must connect to real delivery demand", "Organisation changes need to stay lightweight and practical"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-hr-talent-acquisition",
    departmentKey: "dept-human-resources",
    name: "Talent Acquisition",
    purpose: "Attract and hire high-quality talent efficiently and consistently.",
    customer: "Hiring managers, candidates, and HR leadership",
    trigger: "Approved hiring need or strategic capability gap",
    outcome: "Priority roles are filled quickly with a professional candidate and manager experience",
    constraints: ["Hiring quality cannot be traded away for speed", "Budget and business case checks must stay proportionate"],
    status: "has-deviations",
    effectivenessMetric: "Priority roles can be filled, but slow approvals, limited visibility, and inconsistent hiring practices create avoidable candidate drop-off.",
    efficiencyMetric: "Recruitment progress is tracked through fragmented handoffs, manual coordination, and repeated manager follow-up.",
  },
  {
    key: "svc-hr-onboarding",
    departmentKey: "dept-human-resources",
    name: "Onboarding and Employee Setup",
    purpose: "Help new hires become productive quickly and feel connected to BSC from day one.",
    customer: "New hires, hiring managers, HR, IT, and Finance",
    trigger: "Candidate accepts offer",
    outcome: "New employees are welcomed, equipped, compliant, and productive quickly",
    constraints: ["Cross-functional tasks must land on time", "Manager-owned onboarding should stay consistent enough to scale"],
    status: "has-deviations",
    effectivenessMetric: "Onboarding completes, but fragmentation across HR, IT, Finance, and managers creates uneven first-week experience and avoidable delays.",
    efficiencyMetric: "The process relies on manual coordination, reminders, and duplicated status checks across teams.",
  },
  {
    key: "svc-hr-performance-growth",
    departmentKey: "dept-human-resources",
    name: "Performance and Growth",
    purpose: "Support clear expectations, feedback, development, and career progression without excessive process overhead.",
    customer: "Employees, managers, and HR business partners",
    trigger: "Scheduled review cycle, promotion checkpoint, or development conversation",
    outcome: "Performance decisions are fair, useful, and connected to growth actions",
    constraints: ["Feedback quality matters as much as completion", "The review model should not become an administrative burden"],
    status: "has-deviations",
    effectivenessMetric: "Reviews happen, but feedback quality and follow-through on development actions vary too widely to consistently improve capability.",
    efficiencyMetric: "The process still feels administrative, with calendar chasing, uneven manager quality, and weak linkage to learning actions.",
  },
  {
    key: "svc-hr-learning-ai-readiness",
    departmentKey: "dept-human-resources",
    name: "Learning, Skills, and AI Readiness",
    purpose: "Build future-relevant capability, including AI fluency across the business.",
    customer: "Employees, managers, and capability leaders",
    trigger: "Skills assessment, learning review, or AI capability uplift initiative",
    outcome: "The business develops relevant skills and clearer AI readiness over time",
    constraints: ["Learning needs must connect to strategic capability gaps", "AI readiness should include both literacy and governance awareness"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-hr-employee-relations",
    departmentKey: "dept-human-resources",
    name: "Employee Relations and Policy Support",
    purpose: "Provide fair, practical support on people matters while maintaining trust and compliance.",
    customer: "Employees, managers, and HR case owners",
    trigger: "Policy query, grievance, disciplinary matter, or leave interpretation request",
    outcome: "People issues are handled fairly, consistently, and with appropriate confidentiality",
    constraints: ["Confidentiality and compliance must be preserved", "Support should remain practical and humane"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-hr-employee-experience",
    departmentKey: "dept-human-resources",
    name: "Employee Experience and Engagement",
    purpose: "Improve the day-to-day employee experience and strengthen culture.",
    customer: "Employees and people leaders",
    trigger: "Engagement cycle, listening forum, or employee journey issue",
    outcome: "Employee feedback is visible and translated into experience improvements",
    constraints: ["Improvements must be actionable and owned", "Feedback loops need to stay credible and visible"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-hr-rewards-ops",
    departmentKey: "dept-human-resources",
    name: "Rewards and People Operations",
    purpose: "Ensure efficient, accurate administration of core employee services.",
    customer: "Employees, HR operations, payroll, and managers",
    trigger: "Payroll cycle, benefits event, leave request, or employee data change",
    outcome: "Core employee administration is accurate, timely, and low-friction",
    constraints: ["Accuracy and compliance are non-negotiable", "Operational requests should stay visible to employees"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-end-user-support",
    departmentKey: "dept-information-technology",
    name: "End User Support",
    purpose: "Resolve employee technology issues quickly and professionally.",
    customer: "Employees and managers",
    trigger: "Incident, service request, or support query",
    outcome: "Employees get back to productive work quickly with clear communication",
    constraints: ["Support should be transparent and responsive", "Priority handling must match business impact"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-identity-access-security",
    departmentKey: "dept-information-technology",
    name: "Identity, Access, and Security",
    purpose: "Protect company assets while keeping access friction low.",
    customer: "Employees, IT security, and system owners",
    trigger: "Joiner, mover, leaver, access request, or security concern",
    outcome: "Access is granted, changed, or removed securely and on time",
    constraints: ["Security controls must stay proportionate to risk", "Joiner and mover experience should not be slowed by avoidable handoffs"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-business-apps",
    departmentKey: "dept-information-technology",
    name: "Business Applications and Collaboration Tools",
    purpose: "Manage core internal platforms and ensure effective adoption.",
    customer: "Employees, platform owners, and business stakeholders",
    trigger: "Application issue, enhancement request, or licence review",
    outcome: "Core tools stay reliable, adopted, and aligned to business needs",
    constraints: ["Enhancement demand must be prioritised transparently", "Application sprawl should be contained"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-data-ai-enablement",
    departmentKey: "dept-information-technology",
    name: "Data and AI Enablement",
    purpose: "Provide the platforms, guardrails, and support needed for practical AI adoption.",
    customer: "Business teams, innovation sponsors, and data users",
    trigger: "AI tool request, data access need, or pilot-to-scale opportunity",
    outcome: "Teams can adopt AI in governed, repeatable ways that create value",
    constraints: ["Data access must remain governed", "Experimentation needs clear guardrails and support"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-infrastructure-workplace",
    departmentKey: "dept-information-technology",
    name: "Infrastructure and Workplace Technology",
    purpose: "Ensure core platforms, connectivity, and workplace technologies are fit for purpose.",
    customer: "Employees, office operations, and IT platform owners",
    trigger: "Device request, connectivity issue, platform maintenance, or workplace technology problem",
    outcome: "Foundational technology remains reliable, secure, and ready for growth",
    constraints: ["Reliability and recovery obligations must be maintained", "User disruption should be minimised"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
  {
    key: "svc-it-service-management",
    departmentKey: "dept-information-technology",
    name: "IT Service Management and Continuous Improvement",
    purpose: "Improve IT service experience and make IT a more business-friendly support function.",
    customer: "Employees, managers, and IT leadership",
    trigger: "Service review, ticket trend, SLA issue, or improvement backlog item",
    outcome: "IT services become more visible, measurable, and easier to use",
    constraints: ["Continuous improvement must be grounded in real service data", "The model should stay lightweight and practical"],
    status: "not-analyzed",
    effectivenessMetric: NOT_YET_ASSESSED,
    efficiencyMetric: NOT_YET_ASSESSED,
  },
];

const analyses: AnalysisSeed[] = [
  {
    serviceKey: "svc-finance-fpa",
    idealFlowSteps: [
      { id: "fpa-ideal-1", serviceId: "svc-finance-fpa", flowType: "ideal", order: 1, description: "Issue planning assumptions and driver definitions", stepType: "input", groupLabel: "Planning inputs", parallelGroup: "fpa-inputs" },
      { id: "fpa-ideal-2", serviceId: "svc-finance-fpa", flowType: "ideal", order: 2, description: "Collect department submissions through a structured workflow", stepType: "input", parallelGroup: "fpa-inputs" },
      { id: "fpa-ideal-3", serviceId: "svc-finance-fpa", flowType: "ideal", order: 3, description: "Reconcile pipeline, headcount, and cost drivers automatically", stepType: "process", groupLabel: "Forecast modelling", parallelGroup: "fpa-model" },
      { id: "fpa-ideal-4", serviceId: "svc-finance-fpa", flowType: "ideal", order: 4, description: "Run scenario modelling for executive trade-offs", stepType: "process", parallelGroup: "fpa-model" },
      { id: "fpa-ideal-5", serviceId: "svc-finance-fpa", flowType: "ideal", order: 5, description: "Review only material variances and decision points with leadership", stepType: "control" },
      { id: "fpa-ideal-6", serviceId: "svc-finance-fpa", flowType: "ideal", order: 6, description: "Publish approved budget or rolling forecast", stepType: "output", groupLabel: "Outputs", parallelGroup: "fpa-output" },
      { id: "fpa-ideal-7", serviceId: "svc-finance-fpa", flowType: "ideal", order: 7, description: "Auto-refresh monthly actuals versus forecast dashboard with AI-assisted commentary", stepType: "output", parallelGroup: "fpa-output" },
    ],
    currentFlowSteps: [
      { id: "fpa-current-1", serviceId: "svc-finance-fpa", flowType: "current", order: 1, description: "Finance emails planning assumptions and spreadsheet templates", stepType: "input" },
      { id: "fpa-current-2", serviceId: "svc-finance-fpa", flowType: "current", order: 2, description: "Departments complete spreadsheets using local assumptions", stepType: "process", hasDeviation: true },
      { id: "fpa-current-3", serviceId: "svc-finance-fpa", flowType: "current", order: 3, description: "Finance manually reconciles pipeline, hiring, and cost assumptions", stepType: "process", hasDeviation: true },
      { id: "fpa-current-4", serviceId: "svc-finance-fpa", flowType: "current", order: 4, description: "Multiple clarification loops run with department heads", stepType: "handoff", hasDeviation: true },
      { id: "fpa-current-5", serviceId: "svc-finance-fpa", flowType: "current", order: 5, description: "Executive review focuses on spreadsheet detail rather than decision trade-offs", stepType: "approval", hasDeviation: true },
      { id: "fpa-current-6", serviceId: "svc-finance-fpa", flowType: "current", order: 6, description: "Approved numbers are reworked into management reporting packs", stepType: "rework", hasDeviation: true },
      { id: "fpa-current-7", serviceId: "svc-finance-fpa", flowType: "current", order: 7, description: "Monthly actuals versus forecast commentary is assembled manually", stepType: "output" },
    ],
    deviations: [
      {
        id: "fpa-dev-1",
        serviceId: "svc-finance-fpa",
        flowStepId: "fpa-current-2",
        what: "Department inputs are collected through disconnected spreadsheets",
        why: "The planning process has no workflow-based collection model or common driver structure",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "fpa-dev-2",
        serviceId: "svc-finance-fpa",
        flowStepId: "fpa-current-3",
        what: "Pipeline, hiring, and cost assumptions are reconciled manually",
        why: "Commercial, workforce, and finance planning inputs are not connected in a shared model",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "fpa-dev-3",
        serviceId: "svc-finance-fpa",
        flowStepId: "fpa-current-4",
        what: "Finance spends too much time chasing clarifications and late submissions",
        why: "There are no explicit service levels, workflow deadlines, or visible status tracking",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "handoff",
      },
      {
        id: "fpa-dev-4",
        serviceId: "svc-finance-fpa",
        flowStepId: "fpa-current-5",
        what: "Executive review happens too deep in spreadsheet detail",
        why: "Decision support is produced late and scenario views are not prepared in advance",
        necessary: false,
        impact: "medium",
        treatment: "eliminate",
        classification: "approval",
      },
      {
        id: "fpa-dev-5",
        serviceId: "svc-finance-fpa",
        flowStepId: "fpa-current-6",
        what: "Budget outputs are reformatted manually into reporting packs",
        why: "Planning outputs and management reporting artifacts are not generated from the same source",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "rework",
      },
    ],
    initiatives: [
      {
        id: "fpa-init-1",
        serviceId: "svc-finance-fpa",
        title: "Driver-Based Forecast Model",
        description: "Create a shared planning model that links revenue pipeline, headcount, utilisation, and cost drivers into one rolling forecast.",
        status: "approved",
        linkedAgents: [
          { id: "agent-forecast-model-designer", name: "Forecast Model Designer", role: "Analysis - define the planning drivers and scenario structure" },
          { id: "agent-finance-data-integrator", name: "Finance Data Integrator", role: "Automation - connect commercial, workforce, and finance planning inputs" },
        ],
      },
      {
        id: "fpa-init-2",
        serviceId: "svc-finance-fpa",
        title: "Planning Workflow and Submission Visibility",
        description: "Introduce structured submission workflows, service levels, and status dashboards so Finance spends less time chasing inputs.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-workflow-designer", name: "Workflow Designer", role: "Analysis - design the planning workflow and exception handling" },
        ],
      },
      {
        id: "fpa-init-3",
        serviceId: "svc-finance-fpa",
        title: "AI-Assisted Forecast Commentary",
        description: "Generate first-draft monthly commentary from actuals, variance movements, and scenario changes so Finance can spend time on decisions rather than narrative assembly.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-finance-commentary-assistant", name: "Finance Commentary Assistant", role: "AI enablement - draft variance commentary and highlight anomalies" },
        ],
      },
    ],
  },
  {
    serviceKey: "svc-finance-revenue-ops-billing",
    idealFlowSteps: [
      { id: "billing-ideal-1", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 1, description: "Confirm billable work, milestones, and contract rules from a shared project view", stepType: "input", groupLabel: "Billing inputs", parallelGroup: "billing-inputs" },
      { id: "billing-ideal-2", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 2, description: "Validate billing readiness automatically against approvals and data completeness", stepType: "control", parallelGroup: "billing-inputs" },
      { id: "billing-ideal-3", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 3, description: "Generate draft invoice using contract-linked billing rules", stepType: "process", groupLabel: "Invoice generation", parallelGroup: "billing-generate" },
      { id: "billing-ideal-4", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 4, description: "Route only exceptions to project lead review", stepType: "approval", parallelGroup: "billing-generate" },
      { id: "billing-ideal-5", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 5, description: "Issue invoice to client and confirm dispatch", stepType: "output", groupLabel: "Billing outputs", parallelGroup: "billing-output" },
      { id: "billing-ideal-6", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 6, description: "Track payment status and overdue exposure through automated reminders and prioritised collections queues", stepType: "control", parallelGroup: "billing-output" },
      { id: "billing-ideal-7", serviceId: "svc-finance-revenue-ops-billing", flowType: "ideal", order: 7, description: "Categorise disputes and escalate only the cases needing commercial intervention", stepType: "exception", parallelGroup: "billing-output" },
    ],
    currentFlowSteps: [
      { id: "billing-current-1", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 1, description: "Finance checks timesheets, milestones, and contract notes across multiple sources", stepType: "input" },
      { id: "billing-current-2", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 2, description: "Project lead approval is chased manually when billing data is incomplete", stepType: "approval", hasDeviation: true },
      { id: "billing-current-3", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 3, description: "Draft invoice is built manually using project spreadsheets and contract lookups", stepType: "process", hasDeviation: true },
      { id: "billing-current-4", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 4, description: "Invoice corrections are made after project lead review", stepType: "rework", hasDeviation: true },
      { id: "billing-current-5", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 5, description: "Invoice is emailed to the client with supporting files attached manually", stepType: "output" },
      { id: "billing-current-6", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 6, description: "Payment status is tracked separately and overdue follow-up depends on individual effort", stepType: "process", hasDeviation: true },
      { id: "billing-current-7", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 7, description: "Disputes are triaged ad hoc between Finance and account teams", stepType: "handoff", hasDeviation: true },
      { id: "billing-current-8", serviceId: "svc-finance-revenue-ops-billing", flowType: "current", order: 8, description: "Collections updates are summarised manually for management review", stepType: "output" },
    ],
    deviations: [
      {
        id: "billing-dev-1",
        serviceId: "svc-finance-revenue-ops-billing",
        flowStepId: "billing-current-2",
        what: "Billing readiness depends on manual approval chasing",
        why: "Project data completeness and approval status are not visible in one workflow",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "approval",
      },
      {
        id: "billing-dev-2",
        serviceId: "svc-finance-revenue-ops-billing",
        flowStepId: "billing-current-3",
        what: "Draft invoices are built manually from fragmented project and contract data",
        why: "Billing rules are not encoded and supporting data is spread across tools",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "billing-dev-3",
        serviceId: "svc-finance-revenue-ops-billing",
        flowStepId: "billing-current-6",
        what: "Collections visibility relies on spreadsheet tracking and heroic follow-up",
        why: "AR tracking and reminder logic are not workflow-driven",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "billing-dev-4",
        serviceId: "svc-finance-revenue-ops-billing",
        flowStepId: "billing-current-7",
        what: "Disputes bounce between Finance and project teams without clear ownership",
        why: "There is no common dispute workflow or categorisation model",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "handoff",
      },
    ],
    initiatives: [
      {
        id: "billing-init-1",
        serviceId: "svc-finance-revenue-ops-billing",
        title: "Billing Readiness Dashboard",
        description: "Create a live billing-readiness view that flags missing approvals, incomplete project data, and upcoming billing opportunities before month end.",
        status: "approved",
        linkedAgents: [
          { id: "agent-billing-readiness-analyst", name: "Billing Readiness Analyst", role: "Analysis - define readiness rules, exception states, and ownership" },
        ],
      },
      {
        id: "billing-init-2",
        serviceId: "svc-finance-revenue-ops-billing",
        title: "Contract-Linked Invoice Automation",
        description: "Generate invoices from contract terms, approved work, and billing rules rather than manual spreadsheet assembly.",
        status: "approved",
        linkedAgents: [
          { id: "agent-contract-rule-mapper", name: "Contract Rule Mapper", role: "Analysis - translate contract and billing logic into executable rules" },
          { id: "agent-invoice-workflow-builder", name: "Invoice Workflow Builder", role: "Automation - generate and route invoices from governed data" },
        ],
      },
      {
        id: "billing-init-3",
        serviceId: "svc-finance-revenue-ops-billing",
        title: "AI-Assisted Collections Prioritisation",
        description: "Use AI to categorise disputes, prioritise follow-up, and surface likely collection blockers to Finance and account teams.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-collections-prioritizer", name: "Collections Prioritizer", role: "AI enablement - classify disputes and recommend next-best follow-up" },
        ],
      },
    ],
  },
  {
    serviceKey: "svc-finance-ap-expense",
    idealFlowSteps: [
      { id: "expense-ideal-1", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 1, description: "Employee submits claim with receipt capture and policy prompts", stepType: "input", groupLabel: "Submission", parallelGroup: "expense-submit" },
      { id: "expense-ideal-2", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 2, description: "Approval routes automatically based on cost centre and policy", stepType: "approval", parallelGroup: "expense-submit" },
      { id: "expense-ideal-3", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 3, description: "Finance validates coding and exceptions only where policy flags risk", stepType: "control" },
      { id: "expense-ideal-4", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 4, description: "Approved claims are queued automatically for payment", stepType: "process", groupLabel: "Payment", parallelGroup: "expense-pay" },
      { id: "expense-ideal-5", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 5, description: "Employee sees real-time claim status and payment date", stepType: "output", parallelGroup: "expense-pay" },
      { id: "expense-ideal-6", serviceId: "svc-finance-ap-expense", flowType: "ideal", order: 6, description: "Audit-ready archive is created without extra manual handling", stepType: "output", parallelGroup: "expense-pay" },
    ],
    currentFlowSteps: [
      { id: "expense-current-1", serviceId: "svc-finance-ap-expense", flowType: "current", order: 1, description: "Employee submits claim with receipts and manual coding", stepType: "input" },
      { id: "expense-current-2", serviceId: "svc-finance-ap-expense", flowType: "current", order: 2, description: "Manager reviews business purpose and sometimes asks for clarification by email", stepType: "approval", hasDeviation: true },
      { id: "expense-current-3", serviceId: "svc-finance-ap-expense", flowType: "current", order: 3, description: "Finance checks receipts, policy, and coding manually", stepType: "process", hasDeviation: true },
      { id: "expense-current-4", serviceId: "svc-finance-ap-expense", flowType: "current", order: 4, description: "Exceptions are routed back to the employee for more detail", stepType: "handoff", hasDeviation: true },
      { id: "expense-current-5", serviceId: "svc-finance-ap-expense", flowType: "current", order: 5, description: "Approved claims wait for the next payment run", stepType: "process" },
      { id: "expense-current-6", serviceId: "svc-finance-ap-expense", flowType: "current", order: 6, description: "Employees ask Finance for updates because claim status is unclear", stepType: "exception", hasDeviation: true },
      { id: "expense-current-7", serviceId: "svc-finance-ap-expense", flowType: "current", order: 7, description: "Claim is archived manually for audit evidence", stepType: "output" },
    ],
    deviations: [
      {
        id: "expense-dev-1",
        serviceId: "svc-finance-ap-expense",
        flowStepId: "expense-current-2",
        what: "Managers and employees rely on email clarification loops",
        why: "The submission step does not capture enough structured policy context up front",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "approval",
      },
      {
        id: "expense-dev-2",
        serviceId: "svc-finance-ap-expense",
        flowStepId: "expense-current-3",
        what: "Finance performs manual compliance and coding checks on routine claims",
        why: "Policy rules and default coding are not embedded in the submission workflow",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "expense-dev-3",
        serviceId: "svc-finance-ap-expense",
        flowStepId: "expense-current-4",
        what: "Exception handling creates repeated back-and-forth with employees",
        why: "Requirements are not visible at the point of submission and exception reasons are not standardised",
        necessary: false,
        impact: "medium",
        treatment: "eliminate",
        classification: "handoff",
      },
      {
        id: "expense-dev-4",
        serviceId: "svc-finance-ap-expense",
        flowStepId: "expense-current-6",
        what: "Employees lack visibility into claim status and payment timing",
        why: "There is no self-service status tracking or automated notification model",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "exception",
      },
    ],
    initiatives: [
      {
        id: "expense-init-1",
        serviceId: "svc-finance-ap-expense",
        title: "Mobile-First Expense Submission",
        description: "Introduce guided expense submission with receipt OCR, policy prompts, and default coding at the point of entry.",
        status: "approved",
        linkedAgents: [
          { id: "agent-expense-ux-designer", name: "Expense UX Designer", role: "Analysis - design the employee-friendly claim experience" },
          { id: "agent-receipt-ocr-orchestrator", name: "Receipt OCR Orchestrator", role: "Automation - classify receipts and extract fields automatically" },
        ],
      },
      {
        id: "expense-init-2",
        serviceId: "svc-finance-ap-expense",
        title: "Policy-Aware Approval Routing",
        description: "Automate approval routing and exception handling using cost centre, spend category, and policy thresholds.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-policy-rules-analyst", name: "Policy Rules Analyst", role: "Analysis - encode policy thresholds and approval routes" },
        ],
      },
      {
        id: "expense-init-3",
        serviceId: "svc-finance-ap-expense",
        title: "Real-Time Claim Status Visibility",
        description: "Provide employees and managers with clear status, outstanding actions, and expected payment dates for every claim.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-status-notifier", name: "Status Notifier", role: "Automation - send claim state updates and overdue reminders" },
        ],
      },
    ],
  },
  {
    serviceKey: "svc-hr-talent-acquisition",
    idealFlowSteps: [
      { id: "hire-ideal-1", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 1, description: "Manager submits hiring request with role profile, business case, and budget link", stepType: "input", groupLabel: "Request setup", parallelGroup: "hire-inputs" },
      { id: "hire-ideal-2", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 2, description: "Approval and SLA route automatically based on role type and urgency", stepType: "approval", parallelGroup: "hire-inputs" },
      { id: "hire-ideal-3", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 3, description: "Structured sourcing and interview kits launch from a standard workflow", stepType: "process", groupLabel: "Candidate pipeline", parallelGroup: "hire-pipeline" },
      { id: "hire-ideal-4", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 4, description: "Candidate progress, panel availability, and feedback stay visible in one place", stepType: "control", parallelGroup: "hire-pipeline" },
      { id: "hire-ideal-5", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 5, description: "Offer preparation and approval happen with pre-defined guardrails", stepType: "approval" },
      { id: "hire-ideal-6", serviceId: "svc-hr-talent-acquisition", flowType: "ideal", order: 6, description: "Accepted offer hands over directly into onboarding workflow", stepType: "output", groupLabel: "Handover", parallelGroup: "hire-output" },
    ],
    currentFlowSteps: [
      { id: "hire-current-1", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 1, description: "Manager submits a hiring need through email or ad hoc forms", stepType: "input" },
      { id: "hire-current-2", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 2, description: "Business case and budget are validated through multiple approval loops", stepType: "approval", hasDeviation: true },
      { id: "hire-current-3", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 3, description: "Role profile is refined iteratively between HR and the hiring manager", stepType: "handoff", hasDeviation: true },
      { id: "hire-current-4", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 4, description: "Sourcing and screening progress is tracked manually across recruiters and managers", stepType: "process", hasDeviation: true },
      { id: "hire-current-5", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 5, description: "Interview scheduling is coordinated through back-and-forth calendar chasing", stepType: "process", hasDeviation: true },
      { id: "hire-current-6", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 6, description: "Feedback quality varies and panel decisions take too long to converge", stepType: "control", hasDeviation: true },
      { id: "hire-current-7", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 7, description: "Offer approval and issue is delayed when stakeholders are unavailable", stepType: "approval", hasDeviation: true },
      { id: "hire-current-8", serviceId: "svc-hr-talent-acquisition", flowType: "current", order: 8, description: "Accepted candidate is handed over manually to onboarding owners", stepType: "output" },
    ],
    deviations: [
      {
        id: "hire-dev-1",
        serviceId: "svc-hr-talent-acquisition",
        flowStepId: "hire-current-2",
        what: "Hiring approvals are slow and inconsistent",
        why: "Decision rules and service levels are not explicit, so requests escalate through manual review loops",
        necessary: false,
        impact: "high",
        treatment: "simplify",
        classification: "approval",
      },
      {
        id: "hire-dev-2",
        serviceId: "svc-hr-talent-acquisition",
        flowStepId: "hire-current-4",
        what: "Pipeline visibility is fragmented across managers and recruiters",
        why: "The hiring process is managed across disconnected tools and informal updates",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "system-constraint",
      },
      {
        id: "hire-dev-3",
        serviceId: "svc-hr-talent-acquisition",
        flowStepId: "hire-current-5",
        what: "Interview coordination creates avoidable delay and candidate drop-off",
        why: "Scheduling is not workflow-supported and panel availability is not visible early enough",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "handoff",
      },
      {
        id: "hire-dev-4",
        serviceId: "svc-hr-talent-acquisition",
        flowStepId: "hire-current-6",
        what: "Interview quality and feedback consistency vary by manager",
        why: "Structured interview kits and assessment rubrics are not used consistently",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "control",
      },
    ],
    initiatives: [
      {
        id: "hire-init-1",
        serviceId: "svc-hr-talent-acquisition",
        title: "Hiring Request Workflow and SLA Model",
        description: "Introduce a governed hiring-request workflow with explicit approval paths, service levels, and status visibility for managers.",
        status: "approved",
        linkedAgents: [
          { id: "agent-hiring-workflow-designer", name: "Hiring Workflow Designer", role: "Analysis - define the request model, approvals, and SLA states" },
        ],
      },
      {
        id: "hire-init-2",
        serviceId: "svc-hr-talent-acquisition",
        title: "Structured Interview Kit Library",
        description: "Deploy role-based interview kits, evaluation rubrics, and feedback capture templates to improve consistency and decision speed.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-interview-kit-curator", name: "Interview Kit Curator", role: "Analysis - build structured interview packs and assessment criteria" },
        ],
      },
      {
        id: "hire-init-3",
        serviceId: "svc-hr-talent-acquisition",
        title: "AI-Assisted Candidate Screening Support",
        description: "Use AI to help summarise candidate fit, surface capability themes, and prioritise sourcing effort while keeping human decision ownership.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-candidate-screening-assistant", name: "Candidate Screening Assistant", role: "AI enablement - summarise CV patterns and sourcing themes" },
        ],
      },
    ],
  },
  {
    serviceKey: "svc-hr-onboarding",
    idealFlowSteps: [
      { id: "onboard-ideal-1", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 1, description: "Accepted offer triggers one cross-functional onboarding workflow", stepType: "input", groupLabel: "Trigger", parallelGroup: "onboard-input" },
      { id: "onboard-ideal-2", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 2, description: "HR, IT, payroll, and manager tasks are orchestrated with due dates and ownership", stepType: "process", groupLabel: "Setup", parallelGroup: "onboard-setup" },
      { id: "onboard-ideal-3", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 3, description: "New hire completes documentation and sees a role-based onboarding journey", stepType: "input", parallelGroup: "onboard-setup" },
      { id: "onboard-ideal-4", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 4, description: "Equipment, access, and induction milestones are confirmed before day one", stepType: "control" },
      { id: "onboard-ideal-5", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 5, description: "Manager-led role onboarding runs against a shared 30/60/90-day plan", stepType: "process", groupLabel: "Ramp-up", parallelGroup: "onboard-ramp" },
      { id: "onboard-ideal-6", serviceId: "svc-hr-onboarding", flowType: "ideal", order: 6, description: "New hire and manager complete structured feedback and probation checkpoints", stepType: "output", parallelGroup: "onboard-ramp" },
    ],
    currentFlowSteps: [
      { id: "onboard-current-1", serviceId: "svc-hr-onboarding", flowType: "current", order: 1, description: "Offer acceptance is confirmed and HR starts separate follow-up emails", stepType: "input" },
      { id: "onboard-current-2", serviceId: "svc-hr-onboarding", flowType: "current", order: 2, description: "HR coordinates IT, payroll, and manager actions through manual handoffs", stepType: "handoff", hasDeviation: true },
      { id: "onboard-current-3", serviceId: "svc-hr-onboarding", flowType: "current", order: 3, description: "Documentation, access, and setup requests are completed in different places", stepType: "process", hasDeviation: true },
      { id: "onboard-current-4", serviceId: "svc-hr-onboarding", flowType: "current", order: 4, description: "Equipment or account setup slips close to the start date", stepType: "exception", hasDeviation: true },
      { id: "onboard-current-5", serviceId: "svc-hr-onboarding", flowType: "current", order: 5, description: "Day-one orientation is delivered, but role onboarding quality depends heavily on the manager", stepType: "process", hasDeviation: true },
      { id: "onboard-current-6", serviceId: "svc-hr-onboarding", flowType: "current", order: 6, description: "30/60/90-day follow-up happens inconsistently", stepType: "control", hasDeviation: true },
      { id: "onboard-current-7", serviceId: "svc-hr-onboarding", flowType: "current", order: 7, description: "Feedback is collected late, if at all", stepType: "output", hasDeviation: true },
    ],
    deviations: [
      {
        id: "onboard-dev-1",
        serviceId: "svc-hr-onboarding",
        flowStepId: "onboard-current-2",
        what: "Cross-functional onboarding relies on manual coordination between HR, IT, Finance, and managers",
        why: "There is no single workflow or orchestration layer for new-joiner tasks",
        necessary: false,
        impact: "high",
        treatment: "automate",
        classification: "handoff",
      },
      {
        id: "onboard-dev-2",
        serviceId: "svc-hr-onboarding",
        flowStepId: "onboard-current-4",
        what: "Late equipment and access setup affects day-one readiness",
        why: "Tasks are not tracked against due dates with visible escalation before the start date",
        necessary: false,
        impact: "high",
        treatment: "eliminate",
        classification: "exception",
      },
      {
        id: "onboard-dev-3",
        serviceId: "svc-hr-onboarding",
        flowStepId: "onboard-current-5",
        what: "Manager-led onboarding quality is inconsistent",
        why: "Managers do not have a standard journey, checklist, or expectation set for new-hire ramp-up",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "control",
      },
      {
        id: "onboard-dev-4",
        serviceId: "svc-hr-onboarding",
        flowStepId: "onboard-current-7",
        what: "New-hire feedback and probation insight are captured too late",
        why: "Check-in points are not orchestrated and ownership for follow-through is unclear",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "rework",
      },
    ],
    initiatives: [
      {
        id: "onboard-init-1",
        serviceId: "svc-hr-onboarding",
        title: "Cross-Functional Onboarding Workflow",
        description: "Create one orchestration flow for HR, IT, payroll, and manager tasks with due dates, dependencies, and escalation rules.",
        status: "approved",
        linkedAgents: [
          { id: "agent-onboarding-orchestrator", name: "Onboarding Orchestrator", role: "Automation - coordinate cross-functional setup tasks and deadlines" },
        ],
      },
      {
        id: "onboard-init-2",
        serviceId: "svc-hr-onboarding",
        title: "Role-Based New Hire Journeys",
        description: "Provide managers and new hires with role-based checklists, induction paths, and 30/60/90-day plans.",
        status: "in-progress",
        linkedAgents: [
          { id: "agent-role-journey-designer", name: "Role Journey Designer", role: "Analysis - define role-based onboarding journeys and checkpoints" },
        ],
      },
      {
        id: "onboard-init-3",
        serviceId: "svc-hr-onboarding",
        title: "AI Onboarding Assistant",
        description: "Offer a new-hire assistant for FAQs, policy guidance, and onboarding-task reminders so routine questions do not depend on manual chasing.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-onboarding-assistant", name: "Onboarding Assistant", role: "AI enablement - answer common joiner questions and guide next steps" },
        ],
      },
    ],
  },
  {
    serviceKey: "svc-hr-performance-growth",
    idealFlowSteps: [
      { id: "perf-ideal-1", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 1, description: "Launch a lightweight review cycle with clear role expectations and prompts", stepType: "input", groupLabel: "Cycle launch", parallelGroup: "perf-input" },
      { id: "perf-ideal-2", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 2, description: "Employees complete concise self-reflection linked to goals and capability themes", stepType: "process", parallelGroup: "perf-input" },
      { id: "perf-ideal-3", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 3, description: "Managers prepare feedback with examples, growth actions, and role-calibrated expectations", stepType: "process", groupLabel: "Assessment", parallelGroup: "perf-assess" },
      { id: "perf-ideal-4", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 4, description: "Calibration focuses on exceptions, promotions, and support needs", stepType: "control", parallelGroup: "perf-assess" },
      { id: "perf-ideal-5", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 5, description: "Reviews end with agreed development actions and follow-up checkpoints", stepType: "output", groupLabel: "Growth actions", parallelGroup: "perf-output" },
      { id: "perf-ideal-6", serviceId: "svc-hr-performance-growth", flowType: "ideal", order: 6, description: "Learning and career actions feed into capability planning and internal mobility decisions", stepType: "output", parallelGroup: "perf-output" },
    ],
    currentFlowSteps: [
      { id: "perf-current-1", serviceId: "svc-hr-performance-growth", flowType: "current", order: 1, description: "HR launches the review cycle and managers interpret requirements locally", stepType: "input" },
      { id: "perf-current-2", serviceId: "svc-hr-performance-growth", flowType: "current", order: 2, description: "Employees complete self-assessments of varying depth and quality", stepType: "process", hasDeviation: true },
      { id: "perf-current-3", serviceId: "svc-hr-performance-growth", flowType: "current", order: 3, description: "Managers prepare reviews with inconsistent standards and examples", stepType: "process", hasDeviation: true },
      { id: "perf-current-4", serviceId: "svc-hr-performance-growth", flowType: "current", order: 4, description: "Calibration discussions revisit basic context rather than only exceptions", stepType: "control", hasDeviation: true },
      { id: "perf-current-5", serviceId: "svc-hr-performance-growth", flowType: "current", order: 5, description: "Development actions are noted but not always tracked to completion", stepType: "rework", hasDeviation: true },
      { id: "perf-current-6", serviceId: "svc-hr-performance-growth", flowType: "current", order: 6, description: "Promotion and intervention decisions are escalated separately", stepType: "approval", hasDeviation: true },
      { id: "perf-current-7", serviceId: "svc-hr-performance-growth", flowType: "current", order: 7, description: "Learning actions and career implications are only loosely connected to the review output", stepType: "output" },
    ],
    deviations: [
      {
        id: "perf-dev-1",
        serviceId: "svc-hr-performance-growth",
        flowStepId: "perf-current-2",
        what: "Self-assessments vary too much in quality and usefulness",
        why: "The review model is not structured enough to guide concise, high-signal reflection",
        necessary: false,
        impact: "medium",
        treatment: "simplify",
        classification: "control",
      },
      {
        id: "perf-dev-2",
        serviceId: "svc-hr-performance-growth",
        flowStepId: "perf-current-3",
        what: "Manager feedback quality is inconsistent",
        why: "Expectations, rubrics, and examples are not consistent across teams and levels",
        necessary: false,
        impact: "high",
        treatment: "simplify",
        classification: "control",
      },
      {
        id: "perf-dev-3",
        serviceId: "svc-hr-performance-growth",
        flowStepId: "perf-current-5",
        what: "Development actions lose momentum after the review cycle",
        why: "Actions are not tracked in a visible workflow and accountability is weak after reviews close",
        necessary: false,
        impact: "medium",
        treatment: "automate",
        classification: "rework",
      },
      {
        id: "perf-dev-4",
        serviceId: "svc-hr-performance-growth",
        flowStepId: "perf-current-7",
        what: "Reviews are weakly connected to learning, capability growth, and internal mobility",
        why: "Performance outputs are treated as an HR process rather than a capability-building system",
        necessary: false,
        impact: "medium",
        treatment: "eliminate",
        classification: "handoff",
      },
    ],
    initiatives: [
      {
        id: "perf-init-1",
        serviceId: "svc-hr-performance-growth",
        title: "Simplified Review Model",
        description: "Move to a lighter review model with clearer prompts, fewer low-value steps, and role-calibrated expectations.",
        status: "approved",
        linkedAgents: [
          { id: "agent-review-model-designer", name: "Review Model Designer", role: "Analysis - simplify the review structure and expectations model" },
        ],
      },
      {
        id: "perf-init-2",
        serviceId: "svc-hr-performance-growth",
        title: "Continuous Feedback and Action Tracking",
        description: "Introduce lightweight feedback capture and visible development-action tracking between formal review cycles.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-feedback-loop-builder", name: "Feedback Loop Builder", role: "Automation - keep development actions visible beyond the formal cycle" },
        ],
      },
      {
        id: "perf-init-3",
        serviceId: "svc-hr-performance-growth",
        title: "AI Feedback Theme Summaries",
        description: "Use AI to summarise review themes, capability gaps, and development trends while keeping final judgment with managers and leaders.",
        status: "proposed",
        linkedAgents: [
          { id: "agent-feedback-theme-summarizer", name: "Feedback Theme Summarizer", role: "AI enablement - surface recurring strengths, gaps, and development themes" },
        ],
      },
    ],
  },
];

export const seedBscDemoTransformationMap = internalMutation({
  args: {
    workosOrgId: v.optional(v.string()),
    slug: v.optional(v.string()),
    actor: v.optional(v.string()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workosOrgId = args.workosOrgId ?? DEFAULT_WORKOS_ORG_ID;
    const slug = args.slug ?? DEFAULT_SLUG;
    const actor = args.actor ?? DEFAULT_ACTOR;
    const clearExisting = args.clearExisting ?? true;
    const now = Date.now();

    const existingMap = await ctx.db
      .query("transformationMaps")
      .withIndex("by_org_slug", (q) => q.eq("workosOrgId", workosOrgId).eq("slug", slug))
      .first();

    let mapId: Id<"transformationMaps">;
    let changeType: "create" | "update";

    if (existingMap) {
      mapId = existingMap._id;
      changeType = "update";
      await ctx.db.patch(existingMap._id, {
        title: MAP_TITLE,
        slug,
        description: MAP_DESCRIPTION,
        status: "active",
        updatedBy: actor,
        updatedAt: now,
      });
    } else {
      mapId = await ctx.db.insert("transformationMaps", {
        workosOrgId,
        title: MAP_TITLE,
        slug,
        description: MAP_DESCRIPTION,
        status: "active",
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
      changeType = "create";
    }

    if (clearExisting) {
      const children = await listMapChildren(ctx, mapId);
      for (const analysis of children.analyses) {
        await ctx.db.delete(analysis._id);
      }
      for (const service of children.services) {
        await ctx.db.delete(service._id);
      }
      for (const objective of children.objectives) {
        await ctx.db.delete(objective._id);
      }
      for (const department of children.departments) {
        await ctx.db.delete(department._id);
      }
      for (const pressure of children.pressures) {
        await ctx.db.delete(pressure._id);
      }
    }

    const departmentMandates = new Map<string, string[]>();
    for (const objective of departmentObjectives) {
      if (!objective.departmentKey) continue;
      const current = departmentMandates.get(objective.departmentKey) ?? [];
      departmentMandates.set(objective.departmentKey, [...current, objective.title]);
    }

    for (const [order, pressure] of pressures.entries()) {
      await ctx.db.insert("transformationPressures", {
        mapId,
        key: pressure.key,
        order,
        type: pressure.type,
        title: pressure.title,
        description: pressure.description,
        evidence: pressure.evidence,
        ...buildArtifactMeta(actor, now),
      });
    }

    for (const [order, objective] of [...enterpriseObjectives, ...departmentObjectives].entries()) {
      await ctx.db.insert("transformationObjectives", {
        mapId,
        key: objective.key,
        order,
        scope: objective.scope,
        departmentKey: objective.departmentKey,
        title: objective.title,
        description: objective.description,
        linkedPressureKeys: objective.linkedPressureKeys,
        ...buildArtifactMeta(actor, now),
      });
    }

    for (const [order, department] of departments.entries()) {
      await ctx.db.insert("transformationDepartments", {
        mapId,
        key: department.key,
        order,
        name: department.name,
        description: department.description,
        keyIssues: department.keyIssues,
        improvementMandates: departmentMandates.get(department.key) ?? [],
        ...buildArtifactMeta(actor, now),
      });
    }

    const serviceIdByKey = new Map<string, Id<"transformationServices">>();
    const serviceOrderByDepartment = new Map<string, number>();
    for (const service of services) {
      const nextOrder = serviceOrderByDepartment.get(service.departmentKey) ?? 0;
      serviceOrderByDepartment.set(service.departmentKey, nextOrder + 1);

      const serviceId = await ctx.db.insert("transformationServices", {
        mapId,
        key: service.key,
        departmentKey: service.departmentKey,
        order: nextOrder,
        name: service.name,
        purpose: service.purpose,
        customer: service.customer,
        trigger: service.trigger,
        outcome: service.outcome,
        constraints: service.constraints,
        status: service.status,
        effectivenessMetric: service.effectivenessMetric,
        efficiencyMetric: service.efficiencyMetric,
        ...buildArtifactMeta(actor, now),
      });

      serviceIdByKey.set(service.key, serviceId);
    }

    for (const analysis of analyses) {
      const serviceId = serviceIdByKey.get(analysis.serviceKey);
      if (!serviceId) {
        throw new Error(`Service not found for analysis seed: ${analysis.serviceKey}`);
      }

      await ctx.db.insert("transformationServiceAnalyses", {
        mapId,
        serviceId,
        reviewStatus: "approved",
        sourceType: "imported",
        sourceRef: "internal.bsc-demo-seed",
        generatedAt: now,
        idealFlowSteps: analysis.idealFlowSteps,
        currentFlowSteps: analysis.currentFlowSteps,
        deviations: analysis.deviations,
        initiatives: analysis.initiatives,
        createdBy: actor,
        updatedBy: actor,
        createdAt: now,
        updatedAt: now,
      });
    }

    await recordTransformationHistory(ctx, {
      workosOrgId,
      mapId,
      entityType: "map",
      entityId: `${mapId}`,
      changedBy: actor,
      changeType,
      previousData: existingMap
        ? {
            title: existingMap.title,
            slug: existingMap.slug,
            description: existingMap.description,
            status: existingMap.status,
          }
        : undefined,
      nextData: {
        title: MAP_TITLE,
        slug,
        description: MAP_DESCRIPTION,
        status: "active",
        seededWith: "bsc-demo-map-v1",
        clearExisting,
      },
    });

    return {
      ok: true,
      mapId,
      workosOrgId,
      slug,
      title: MAP_TITLE,
      counts: {
        pressures: pressures.length,
        objectives: enterpriseObjectives.length + departmentObjectives.length,
        departments: departments.length,
        services: services.length,
        analyses: analyses.length,
      },
    };
  },
});
