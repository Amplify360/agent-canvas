# Canvas YAML Specification

Compact spec for LLM-generated agent canvas documents.

## Structure

```yaml
documentTitle: string (required)
agentGroups:
  - groupName: string
    agents:
      - name: string (required)
        objective: string
        description: string
        tools: [string]
        journeySteps: [string]
        demoLink: url
        videoLink: url
        metrics:
          numberOfUsers: number
          timesUsed: number
          timeSaved: number  # hours
          roi: number        # currency
        tags:
          department: string # e.g., "Sales", "Engineering"
          status: string     # e.g., "active", "draft"
```

## Rules

- `documentTitle`: Canvas name, max 200 chars
- `agentGroups`: Logical phases/stages containing agents
- `groupName`: Phase label (e.g., "Discovery", "Implementation")
- `name`: Agent name, required
- All other fields optional, omit if empty
- `tools`: List of tool/capability names
- `journeySteps`: Ordered workflow steps
- `metrics`: Values can be numbers or numeric strings (e.g., `42` or `"42"`)
- `tags.department`: Maps to `category` field in database

## Example

```yaml
documentTitle: Customer Onboarding Agents
agentGroups:
  - groupName: Initial Contact
    agents:
      - name: Lead Qualifier
        objective: Assess and score incoming leads
        tools:
          - CRM
          - Email
        journeySteps:
          - Receive lead notification
          - Check company profile
          - Score based on criteria
        tags:
          department: Sales
          status: active

  - groupName: Setup
    agents:
      - name: Account Creator
        objective: Provision new customer accounts
        tools:
          - Admin Portal
          - Billing System
        journeySteps:
          - Create account
          - Set permissions
          - Send welcome email
```
