# Documentation Map

Use this directory as a small set of focused references, not a dumping ground.

## Core Operations

- [DEPLOYMENT_GUIDE.md](/Users/andreas/src/agent-canvas/docs/DEPLOYMENT_GUIDE.md)
  Deploy commands, Vercel project mapping, and Convex deployment targeting.
- [AGENT_MODEL_CUTOVER.md](/Users/andreas/src/agent-canvas/docs/AGENT_MODEL_CUTOVER.md)
  Maintenance-window runbook for the strict `fieldValues` model migration.

## Data Formats

- [canvas-yaml-spec.md](/Users/andreas/src/agent-canvas/docs/canvas-yaml-spec.md)
  Canonical YAML import/export shape for canvases and agents.
- [canvas-creation-prompt.md](/Users/andreas/src/agent-canvas/docs/canvas-creation-prompt.md)
  System prompt for generating importable canvas YAML.

## Engineering Notes

- [FINDING_UNUSED_CODE.md](/Users/andreas/src/agent-canvas/docs/FINDING_UNUSED_CODE.md)
  How to identify dead code safely.
- [test-suite-recommendations.md](/Users/andreas/src/agent-canvas/docs/test-suite-recommendations.md)
  Testing gaps and recommended additions.
- OpenRouter access is available through [openrouter.ts](/Users/andreas/src/agent-canvas/server/openrouter.ts) for future server-side LLM features.

## Parked Ideas

- [UI_IMPROVEMENT_IDEAS.md](/Users/andreas/src/agent-canvas/docs/UI_IMPROVEMENT_IDEAS.md)
  Deferred UI concepts that are intentionally not active requirements.

## Product Principles

- [STRATEGY_SERVICE_PROCESS_LAYER_PRINCIPLES.md](/Users/andreas/src/agent-canvas/docs/STRATEGY_SERVICE_PROCESS_LAYER_PRINCIPLES.md)
  Principle-level requirements for a new top-down strategy, service, and process reengineering layer.
