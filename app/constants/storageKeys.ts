/**
 * Centralized localStorage key constants
 * All keys are prefixed with 'agentcanvas-' for namespace isolation
 */

export const STORAGE_KEYS = {
  CURRENT_ORG: 'agentcanvas-current-org',
  CURRENT_CANVAS: 'agentcanvas-current-canvas',
  GROUPING_PREFERENCE: 'agentcanvas-grouping-pref',
  SIDEBAR_COLLAPSED: 'agentcanvas-sidebar-collapsed',
  SIDEBAR_WIDTH: 'agentcanvas-sidebar-width',
  THEME: 'agentcanvas-theme',
  AGENT_ASSIST_PROMPT: 'agentcanvas-agent-assist-prompt',
  IMPORT_YAML_ASSIST_PROMPT: 'agentcanvas-import-yaml-assist-prompt',
  STRATEGY_PRESSURE_ASSIST_PROMPT: 'agentcanvas-strategy-pressure-assist-prompt',
  STRATEGY_OBJECTIVE_ASSIST_PROMPT: 'agentcanvas-strategy-objective-assist-prompt',
  STRATEGY_DEPARTMENT_ASSIST_PROMPT: 'agentcanvas-strategy-department-assist-prompt',
  STRATEGY_FLOW_STEP_ASSIST_PROMPT: 'agentcanvas-strategy-flow-step-assist-prompt',
  STRATEGY_DEVIATION_ASSIST_PROMPT: 'agentcanvas-strategy-deviation-assist-prompt',
  STRATEGY_INITIATIVE_ASSIST_PROMPT: 'agentcanvas-strategy-initiative-assist-prompt',
  TRANSFORMATION_MAP_SERVICE_ASSIST_PROMPT: 'agentcanvas-transformation-map-service-assist-prompt',
  TRANSFORMATION_MAP_SERVICE_FIELD_PROMPT: 'agentcanvas-transformation-map-service-field-prompt',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
