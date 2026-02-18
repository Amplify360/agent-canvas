# Test Suite

AgentCanvas is now **Convex-native**. YAML supports import and full-canvas export for backup/round-trip workflows.

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
```

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
