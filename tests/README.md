# Test Suite

AgentCanvas is now **Convex-native**. YAML import/export is covered in unit tests.

## Tests

- **Unit tests** (`tests/unit/*.test.ts`)
  - YAML import/export and slug utilities
  - Grouping/filtering
  - Formatting and config helpers
  - Frontend + Convex validation utilities
  - Convex auth helpers (org access / super admin)
- **E2E happy path smoke** (`tests/e2e/*.spec.ts`)
  - Runs against the internal `/e2e` route which renders the real UI with an in-memory Convex/auth mock.
  - No WorkOS/Convex credentials needed; intended to catch UI regressions in the primary flow.

## Running Tests

```bash
# Unit tests once
pnpm test:run

# Unit tests (watch)
pnpm test

# Unit tests UI
pnpm test:ui

# E2E tests (first time only, install browser)
pnpm exec playwright install chromium

# E2E happy path (builds + starts Next automatically)
pnpm test:e2e

# Everything
pnpm test:all

# MCP server end-to-end test (requires running app + service token)
MCP_TOKEN=mcp_xxx pnpm test:mcp
```

### MCP End-to-End Test

The MCP client validates the MCP handshake, then runs a real Transformation Map lifecycle:

- verify required tools and token scopes
- create a test Transformation Map
- verify reads from `list_transformation_maps` and `get_transformation_map_snapshot`
- run dry-run and persisted updates
- verify department and service reads after writes
- delete the test Transformation Map and confirm cleanup

Prerequisites:

- Next.js app is running (`pnpm dev`)
- Valid MCP service token from **MCP Access** in the app
- Token includes `transformation:read` and `transformation:write`

Optional environment variables:

- `MCP_SERVER_URL` (defaults to `http://localhost:3000/api/mcp`)

## Test Structure

```
tests/
├── e2e/
│   └── happy-path.spec.ts
├── fixtures/
│   └── danucem-agents-complete.yaml
└── unit/
    ├── convex-auth.test.ts
    ├── convex-validation.test.ts
    ├── yaml.test.ts
    ├── grouping.test.ts
    ├── formatting.test.ts
    ├── config-utils.test.ts
    ├── status-config.test.ts
    └── validation.test.ts
```

## Test Environment

- **Framework**: Vitest (ESM-native, fast)
- **E2E**: Playwright (Chromium)

## Notes

- Unit tests intentionally avoid UI rendering specifics; they focus on **data integrity** and **security-sensitive logic**.
- E2E tests focus on the **happy path** and should stay small and stable (smoke-level coverage).
