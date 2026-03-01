# Agent Model Migration Plan

This plan defines how we introduce the extensible agent model and remove
temporary backward-compatibility code on a fixed timeline.

## Scope

- Canonical model fields:
  - `agents.fieldValues` (extensible key/value payload)
  - `agents.modelVersion` (migration/version marker)
- Compatibility bridge (temporary):
  - dual-read (legacy fields + `fieldValues`)
  - dual-write (legacy fields + `fieldValues`)

## Release Gates

1. **Phase A: Foundation (this branch)**
- Schema and backend support for `fieldValues`/`modelVersion`.
- YAML v2 support for extension fields (`fields`).
- Migration tooling:
  - `agentModelMigrations:modelMigrationStatus`
  - `agentModelMigrations:migrateAgentsToFieldValues`

2. **Phase B: Data migration on dev**
- Run dry-run migration report.
- Run live migration in batches until pending reaches 0.
- Verify no regressions in create/update/import/export.

3. **Phase C: Production rollout**
- Run migration in prod (dry-run then live).
- Confirm 100% migrated agents.
- Hold for one release cycle while monitoring.

4. **Phase D: Cleanup (required)**
- Remove compatibility bridge once exit criteria are met.

## Exit Criteria For Cleanup

- `modelMigrationStatus.pending === 0` in dev and prod.
- All write paths create/update agents with `modelVersion === 2`.
- No consumers depend on legacy-only YAML assumptions.

## Cleanup Tasks (Do Not Skip)

1. Remove dual-read hydration fallback in backend read paths.
2. Remove dual-write mapping from legacy fields to `fieldValues`.
3. Remove legacy agent columns from `convex/schema.ts`:
   - `objective`, `description`, `tools`, `journeySteps`, `demoLink`,
     `videoLink`, `metrics`, `category`, `status`.
4. Remove legacy YAML keys from canonical export if no longer required.
5. Remove migration utilities once rollout is complete.
6. Delete compatibility tests and keep only new-model tests.

## Ownership

- Refactor owner: Platform/agent-canvas engineering.
- Cleanup owner: same owner that executes production migration.
- Target: complete cleanup within 2 releases after prod migration.
