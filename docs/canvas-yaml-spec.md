# Canvas YAML Specification

Canonical YAML format for canvas import/export.

## Current Canonical Format

```yaml
specVersion: 1
documentTitle: string                  # required, max 200 chars
documentSlug: string                   # optional, lowercase kebab-case, max 100 chars
documentDescription: string            # optional, max 5000 chars
phases: [string]                       # optional, ordered canvas phases
categories: [string]                   # optional, ordered canvas categories
agents:                                # optional (defaults to [])
  - name: string                       # required, max 100 chars
    phase: string                      # optional, defaults to "Backlog"
    agentOrder: number                 # optional, defaults to 0
    objective: string                  # optional, max 500 chars
    description: string                # optional, max 10000 chars
    tools: [string]                    # optional, defaults to []
    journeySteps: [string]             # optional, defaults to []
    demoLink: string                   # optional URL
    videoLink: string                  # optional URL
    metrics:                           # optional
      numberOfUsers: number            # >= 0
      timesUsed: number                # >= 0
      timeSaved: number                # >= 0
      roi: number                      # any numeric value
    category: string                   # optional
    status: string                     # optional: idea|approved|wip|testing|live|shelved
    ownerId: string                    # optional Convex users table ID
```

## Legacy Compatibility

Importer is backward-compatible with the previous legacy shape:

- `agentGroups[].groupName` is mapped to `agent.phase` when `phase` is missing.
- `tags.department` is mapped to `category`.
- `tags.status` is mapped to `status`.

## Notes

- Unknown fields are ignored.
- If `phases`/`categories` are omitted, they are derived from agents.
- If no phases/categories can be derived, defaults are:
  - phases: `["Backlog"]`
  - categories: `["Uncategorized"]`

## Example

```yaml
specVersion: 1
documentTitle: Customer Onboarding Agents
documentSlug: customer-onboarding-agents
documentDescription: End-to-end onboarding automation plan for enterprise customers.
phases:
  - Discovery
  - Rollout
categories:
  - Sales
  - Customer Success
agents:
  - name: Lead Qualifier
    phase: Discovery
    agentOrder: 0
    objective: Assess and score incoming leads based on fit criteria
    description: |
      Analyzes lead data from multiple sources, applies scoring rules,
      and routes qualified leads to the right owner.
    tools:
      - context
      - email
      - deep-research
    journeySteps:
      - Receive lead notification
      - Pull company profile data
      - Calculate fit score
      - Route to sales or nurture
    metrics:
      numberOfUsers: 12
      timesUsed: 450
      timeSaved: 120
      roi: 25000
    category: Sales
    status: live
```
