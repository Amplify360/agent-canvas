# Canvas YAML Specification

Compact spec for YAML documents that can be imported into Agent Canvas.

## Structure

```yaml
specVersion: number             # optional
documentTitle: string           # required, max 200 chars
agents:                         # optional, defaults to []
  - name: string                # required, max 100 chars
    phase: string               # optional, defaults to "Backlog"
    agentOrder: number          # optional, defaults to 0
    objective: string           # optional, max 500 chars
    description: string         # optional, max 1000 chars
    tools: [string]             # optional, defaults to []
    journeySteps: [string]      # optional, defaults to []
    demoLink: url               # optional
    videoLink: url              # optional
    metrics:                    # optional
      numberOfUsers: number     # >= 0
      timesUsed: number         # >= 0
      timeSaved: number         # >= 0, hours saved
      roi: number               # >= 0, currency value
    category: string            # optional
    status: string              # optional, one of idea/approved/wip/testing/live/shelved
    fields:                     # optional extension values copied into fieldValues
      customKey: any
```

## Rules

- `documentTitle`: Required. Canvas name, max 200 chars
- `agents`: Optional. Omit or use `[]` if empty
- `name`: Required per agent. Max 100 chars
- `phase`: Optional. Defaults to `Backlog`
- `agentOrder`: Optional. Defaults to `0`
- `tools`: Valid names: `forms`, `code`, `rag`, `web-search`, `deep-research`, `context`, `email`, `calendar`, `ms-teams`, `api`. Case-insensitive. Unknown names accepted with generic styling
- `metrics`: All values must be numbers ≥ 0. Can also be numeric strings (e.g., `"42"`)
- `category`: Used for grouping/filtering
- `status`: Valid values: `idea`, `approved`, `wip`, `testing`, `live`, `shelved`. Invalid values are ignored
- `fields`: Optional extension values stored alongside the core fields in
  `agents.fieldValues`
- All other fields: Optional—omit if empty/unused

## Example

```yaml
specVersion: 1
documentTitle: Customer Onboarding Agents

agents:
  - name: Lead Qualifier
    phase: Phase 1
    agentOrder: 0
    category: Sales
    objective: Assess and score incoming leads based on fit criteria
    description: |
      Analyzes lead data from multiple sources, applies scoring rules,
      and routes qualified leads to the appropriate sales team.
    tools:
      - context
      - email
      - deep-research
    journeySteps:
      - Receive lead notification
      - Pull company profile data
      - Calculate fit score
      - Route to sales or nurture
    demoLink: https://demo.example.com/lead-qualifier
    videoLink: https://videos.example.com/lead-qualifier-overview
    metrics:
      numberOfUsers: 12
      timesUsed: 450
      timeSaved: 120
      roi: 25000
    status: live
    fields:
      ownerTeam: BDR

  - name: Account Creator
    phase: Phase 2
    agentOrder: 1
    category: Operations
    objective: Provision new customer accounts automatically
    tools:
      - forms
      - api
    journeySteps:
      - Create account record
      - Set initial permissions
      - Generate welcome email
```
