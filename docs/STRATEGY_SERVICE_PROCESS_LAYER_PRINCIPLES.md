# Strategy, Service, and Process Layer Principles

## Purpose

This document captures the stable principles behind a new top-down layer for AgentCanvas so implementation options can vary without losing the core intent.

## Core Thesis

The product should support a clear chain:

1. Understand the business landscape.
2. Distill enterprise objectives.
3. Translate those into departmental outcomes.
4. Define the services each department provides.
5. Reduce each service to a first-principles flow.
6. Compare that ideal to current reality.
7. Turn deviations into implementation work.

The system should not jump straight from research to automation or agents.

## Principles

- Strategy before solution.
  The system starts with external pressures, internal pain points, and business objectives.
- Services before processes.
  Departments are defined first by the services they provide, not by their inherited workflows.
- First principles before complexity.
  Each service should be reduced to essential inputs, essential work, required outcome, and non-negotiable controls.
- Ideal and actual must stay separate.
  Reengineering value comes from comparing the clean flow to the real one.
- Deviations are the key unit of analysis.
  Extra steps should be visible, classifiable, and challengeable.
- Structured outputs over freeform narrative.
  LLM assistance is useful, but Canvas should retain structured, reviewable artifacts.
- Human judgment stays in control.
  Research, synthesis, classification, and proposals must remain editable and reviewable.
- Traceability matters.
  Users should be able to follow the chain from pressure to objective to service to deviation to implementation.
- Progressive disclosure is required.
  The system must support executive-level views and drill-down without losing context.
- Amplify-backed agents are the default execution capability.
  We should assume purpose-built agents can be configured in Amplify for tasks such as deep research, synthesis, process simplification, and structured analysis. Canvas should launch those agents with context and accept structured results back through MCP or controlled APIs, while remaining the system of record.

## Principle-Based Requirements

- The system must capture strategic context:
  external pressures, internal pain points, enterprise objectives, departmental objectives, and supporting evidence.
- The system must model departments as service providers.
  For each service, capture at least name, purpose, customer, trigger, outcome, and major constraints.
- The system must support a first-principles service flow.
  This should express the minimum necessary path from input to required outcome.
- The system must support a separate current-state flow.
  This should allow for approvals, handoffs, system constraints, rework, exceptions, and control checks.
- The system must support explicit deviation analysis.
  Each deviation should capture what it is, why it exists, whether it is necessary, its impact, and the preferred treatment.
- The system must link analysis to execution.
  Findings should be convertible into initiatives, work items, automation opportunities, or downstream agents.
- The system must remain explainable.
  A new stakeholder should be able to understand why a service was analyzed, what the ideal is, what differs in reality, and what is worth acting on.

## Non-Requirements

This document does not fix:

- the final UI shape
- the database schema
- the exact prompt design
- the exact research provider
- the exact external agent platform
- the exact departmental taxonomy

## Implementation Assumption

For rapid implementation, we should assume access to a loosely coupled third-party agent platform, referred to here as Amplify.

In this model:

- an Amplify agent accepts a prompt and returns a result
- the agent is configured through a system prompt plus tool access
- available tools include deep research, Python execution, UI form tools rendered based on system prompt to capture strcutured inputs and help the user follow a clear flow and other bounded capabilities
- Canvas can invoke these agents through URL-based prompt handoff using a get request with a prompt being passed in as a query parameter
- agents can write structured results back into Canvas through MCP

This assumption is important because it allows us to use specialized agents for distinct jobs without building each agent workflow natively inside Canvas.

## Relationship to the Existing Canvas

The existing canvas remains the execution layer.

This new layer is the upstream reasoning layer that explains:

- why something matters
- which service is affected
- what the ideal should be
- how reality deviates
- what should be implemented as a result
