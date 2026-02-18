/**
 * Shared validation constants
 * Used by both frontend and backend validation logic
 */

export const VALIDATION_CONSTANTS = {
  // Agent field lengths
  AGENT_NAME_MAX_LENGTH: 100,
  AGENT_OBJECTIVE_MAX_LENGTH: 500,
  AGENT_DESCRIPTION_MAX_LENGTH: 10000,

  // Phase constraints
  PHASE_MAX_LENGTH: 50,

  // Canvas constraints
  CANVAS_TITLE_MAX_LENGTH: 200,
  CANVAS_SLUG_MAX_LENGTH: 100,
  CANVAS_DESCRIPTION_MAX_LENGTH: 5000,
  URL_MAX_LENGTH: 2048,

  // Metrics constraints
  METRIC_MIN_VALUE: 0,

  // Feedback constraints
  FEEDBACK_DESCRIPTION_MIN_LENGTH: 10,
  FEEDBACK_DESCRIPTION_MAX_LENGTH: 5000,

  // Screenshot constraints
  SCREENSHOT_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Agent status values
 * Single source of truth for all status-related logic
 */
export const AGENT_STATUS = {
  IDEA: 'idea',
  APPROVED: 'approved',
  WIP: 'wip',
  TESTING: 'testing',
  LIVE: 'live',
  SHELVED: 'shelved',
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

/**
 * Regulatory risk values
 */
export const AGENT_REGULATORY_RISK = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type AgentRegulatoryRisk = (typeof AGENT_REGULATORY_RISK)[keyof typeof AGENT_REGULATORY_RISK];

/**
 * Business value values
 */
export const AGENT_VALUE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type AgentValue = (typeof AGENT_VALUE)[keyof typeof AGENT_VALUE];

/**
 * Complete status display configuration
 * Single source of truth for status labels, colors, and icons
 */
export const AGENT_STATUS_CONFIG: Record<AgentStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'default';
}> = {
  [AGENT_STATUS.IDEA]: {
    label: 'Idea',
    shortLabel: 'IDE',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: 'lightbulb',
    badgeVariant: 'default',
  },
  [AGENT_STATUS.APPROVED]: {
    label: 'Approved',
    shortLabel: 'APP',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: 'check',
    badgeVariant: 'default',
  },
  [AGENT_STATUS.WIP]: {
    label: 'WIP',
    shortLabel: 'WIP',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: 'code',
    badgeVariant: 'warning',
  },
  [AGENT_STATUS.TESTING]: {
    label: 'Testing',
    shortLabel: 'TST',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: 'flask-conical',
    badgeVariant: 'warning',
  },
  [AGENT_STATUS.LIVE]: {
    label: 'Live',
    shortLabel: 'LIV',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: 'rocket',
    badgeVariant: 'success',
  },
  [AGENT_STATUS.SHELVED]: {
    label: 'Shelved',
    shortLabel: 'SHL',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: 'archive',
    badgeVariant: 'error',
  },
};

/**
 * Regulatory risk display configuration
 */
export const AGENT_REGULATORY_RISK_CONFIG: Record<AgentRegulatoryRisk, {
  label: string;
  shortLabel: string;
  color: string;
}> = {
  [AGENT_REGULATORY_RISK.LOW]: {
    label: 'Low',
    shortLabel: 'LOW',
    color: '#22C55E',
  },
  [AGENT_REGULATORY_RISK.MEDIUM]: {
    label: 'Medium',
    shortLabel: 'MED',
    color: '#F59E0B',
  },
  [AGENT_REGULATORY_RISK.HIGH]: {
    label: 'High',
    shortLabel: 'HI',
    color: '#EF4444',
  },
  [AGENT_REGULATORY_RISK.CRITICAL]: {
    label: 'Critical',
    shortLabel: 'CRT',
    color: '#991B1B',
  },
};

/**
 * Business value display configuration
 */
export const AGENT_VALUE_CONFIG: Record<AgentValue, {
  label: string;
  shortLabel: string;
  color: string;
}> = {
  [AGENT_VALUE.LOW]: {
    label: 'Low',
    shortLabel: 'LOW',
    color: '#6B7280',
  },
  [AGENT_VALUE.MEDIUM]: {
    label: 'Medium',
    shortLabel: 'MED',
    color: '#3B82F6',
  },
  [AGENT_VALUE.HIGH]: {
    label: 'High',
    shortLabel: 'HI',
    color: '#10B981',
  },
};

/**
 * Helper to get status config with fallback for unknown statuses
 */
export function getAgentStatusConfig(status?: string) {
  if (status && status in AGENT_STATUS_CONFIG) {
    return AGENT_STATUS_CONFIG[status as AgentStatus];
  }
  return {
    label: status || 'Unknown',
    shortLabel: (status || 'UNK').slice(0, 3).toUpperCase(),
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    icon: 'help-circle',
    badgeVariant: 'default' as const,
  };
}

/**
 * Helper to get risk config with fallback for unknown values
 */
export function getRegulatoryRiskConfig(risk?: string) {
  if (risk && risk in AGENT_REGULATORY_RISK_CONFIG) {
    return AGENT_REGULATORY_RISK_CONFIG[risk as AgentRegulatoryRisk];
  }
  return {
    label: risk || 'Unknown',
    shortLabel: (risk || 'UNK').slice(0, 3).toUpperCase(),
    color: '#9CA3AF',
  };
}

/**
 * Helper to get value config with fallback for unknown values
 */
export function getAgentValueConfig(value?: string) {
  if (value && value in AGENT_VALUE_CONFIG) {
    return AGENT_VALUE_CONFIG[value as AgentValue];
  }
  return {
    label: value || 'Unknown',
    shortLabel: (value || 'UNK').slice(0, 3).toUpperCase(),
    color: '#9CA3AF',
  };
}

/**
 * Status options for form dropdowns
 */
export const AGENT_STATUS_OPTIONS = Object.entries(AGENT_STATUS_CONFIG).map(
  ([value, config]) => ({ value: value as AgentStatus, label: config.label })
);

/**
 * Risk options for form dropdowns
 */
export const AGENT_REGULATORY_RISK_OPTIONS = Object.entries(AGENT_REGULATORY_RISK_CONFIG).map(
  ([value, config]) => ({ value: value as AgentRegulatoryRisk, label: config.label })
);

/**
 * Value options for form dropdowns
 */
export const AGENT_VALUE_OPTIONS = Object.entries(AGENT_VALUE_CONFIG).map(
  ([value, config]) => ({ value: value as AgentValue, label: config.label })
);

/**
 * Compact card indicator types
 */
export const COMPACT_CARD_INDICATOR = {
  TOOLS: 'tools',
  STATUS: 'status',
  REGULATORY_RISK: 'regulatoryRisk',
  VALUE: 'value',
} as const;

export type CompactCardIndicator = (typeof COMPACT_CARD_INDICATOR)[keyof typeof COMPACT_CARD_INDICATOR];

/**
 * Compact card indicator options
 */
export const COMPACT_CARD_INDICATOR_OPTIONS: Array<{ value: CompactCardIndicator; label: string }> = [
  { value: COMPACT_CARD_INDICATOR.TOOLS, label: 'Tools' },
  { value: COMPACT_CARD_INDICATOR.STATUS, label: 'Status' },
  { value: COMPACT_CARD_INDICATOR.REGULATORY_RISK, label: 'Risk' },
  { value: COMPACT_CARD_INDICATOR.VALUE, label: 'Value' },
];

/**
 * Organization role values
 * Single source of truth for role-related logic
 */
export const ORG_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type OrgRole = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

/**
 * Agent vote type values
 * Single source of truth for vote-related logic
 */
export const VOTE_TYPE = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type VoteType = (typeof VOTE_TYPE)[keyof typeof VOTE_TYPE];

/**
 * Feedback type values
 * Single source of truth for feedback form types
 */
export const FEEDBACK_TYPE = {
  BUG: 'bug',
  FEATURE: 'feature',
  GENERAL: 'general',
} as const;

export type FeedbackType = (typeof FEEDBACK_TYPE)[keyof typeof FEEDBACK_TYPE];

/**
 * Feedback type configuration for UI and GitHub labels
 */
export const FEEDBACK_TYPE_CONFIG: Record<FeedbackType, {
  label: string;
  icon: string;
  githubLabel: string;
  issueTitle: string;
}> = {
  [FEEDBACK_TYPE.BUG]: {
    label: 'Bug',
    icon: 'bug',
    githubLabel: 'bug',
    issueTitle: 'Bug Report',
  },
  [FEEDBACK_TYPE.FEATURE]: {
    label: 'Feature',
    icon: 'lightbulb',
    githubLabel: 'enhancement',
    issueTitle: 'Feature Request',
  },
  [FEEDBACK_TYPE.GENERAL]: {
    label: 'General',
    icon: 'message-circle',
    githubLabel: 'question',
    issueTitle: 'General Feedback',
  },
};

/**
 * Feedback type options for form UI
 */
export const FEEDBACK_TYPE_OPTIONS = Object.entries(FEEDBACK_TYPE_CONFIG).map(
  ([value, config]) => ({
    value: value as FeedbackType,
    label: config.label,
    icon: config.icon,
  })
);
