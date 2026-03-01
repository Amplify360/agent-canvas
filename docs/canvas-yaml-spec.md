# Canvas YAML Specification

Canonical YAML format for canvas import/export with extensible agent fields.

## Current Canonical Format

```yaml
specVersion: 2
documentTitle: string                  # required, max 200 chars
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
    fields:                            # optional extension fields (new model)
      customKey: any
```

## Notes

- Core fields (`objective`, `tools`, `status`, etc.) remain first-class for readability.
- `fields` is the extension container for non-core values.
- Unknown fields are preserved in `fields` and ignored by UI paths that do not render them.
- If `phase` is omitted, importer defaults to `Backlog`.
- If categories cannot be derived, importer defaults to `Uncategorized`.

## Legacy Compatibility

Importer remains backward-compatible with the previous shape:

- Missing `specVersion` is accepted.
- Legacy documents that only include core fields still import.
- Export now emits `specVersion: 2` and includes `fields` only when extension values exist.

## Example

```yaml
specVersion: 2
documentTitle: Customer Onboarding Agents
agents:
  - name: Lead Qualifier
    phase: Discovery
    agentOrder: 0
    objective: Assess and score incoming leads based on fit criteria
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
    fields:
      confidenceBand: high
      ownerDisplayName: Ops Team
```
