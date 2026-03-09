# Agent Model Cutover

This repo now treats `agents.fieldValues` as the canonical store for agent
content. The old flattened agent fields remain in `convex/schema.ts`
temporarily so Convex can deploy safely while existing data is migrated.

## Dev Rehearsal

Shared dev cutover was completed on March 9, 2026 against Convex deployment
`expert-narwhal-281`.

- Pre-migration backup:
  `backups/convex-dev-exports/dev-backup-20260309-120005-e8b8a05.zip`
- Post-migration backup:
  `backups/convex-dev-exports/dev-post-migration-20260309-122650.zip`
- Migration result:
  `426 migrated / 0 pending`

Lessons from dev:

- Live data contained schema drift that was not obvious from the repo alone.
  `agents.ownerId` and `canvases.compactIndicators` had to stay in
  `convex/schema.ts` temporarily so the deployment would accept existing docs.
- The migration removes deprecated top-level agent fields from each migrated
  document. The schema cleanup should happen only after production is migrated.
- Do not reopen the app with an old frontend build pointed at the migrated
  backend. Land the frontend branch immediately after the backend deploy and
  migration, before ending the maintenance window.

## Maintenance Window Sequence

1. Deploy this branch to `dev`.
2. Put the app into maintenance mode.
3. Run `agentModelMigrations:modelMigrationStatus` and confirm pending count.
4. Run `agentModelMigrations:migrateAgentsToFieldValues` in batches until
   pending reaches `0`.
5. Deploy the matching frontend branch before bringing the app back.
6. Smoke test create, edit, YAML import/export, grouping, and copy-to-orgs.
7. Repeat the same sequence on production during the production window.

## Command Sequence

```bash
npx convex export --path backups/convex-dev-exports/<pre-backup>.zip
npx convex run agentModelMigrations:modelMigrationStatus '{}'
npx convex run agentModelMigrations:migrateAgentsToFieldValues '{"dryRun": true, "limit": 1000}'
npx convex run agentModelMigrations:migrateAgentsToFieldValues '{"dryRun": false, "limit": 1000}'
npx convex run agentModelMigrations:modelMigrationStatus '{}'
npx convex export --path backups/convex-dev-exports/<post-backup>.zip
```

## Notes

- Normal app reads and writes no longer use the deprecated top-level agent
  fields. If migration is incomplete, affected agents will render without their
  migrated content.
- `migrateAgentsToFieldValues` removes the deprecated fields from each migrated
  document, so the final schema cleanup is a small follow-up patch.

## Follow-Up Cleanup

After `pending === 0` on every deployment, remove these deprecated fields from
`convex/schema.ts`:

- `objective`
- `description`
- `tools`
- `journeySteps`
- `demoLink`
- `videoLink`
- `metrics`
- `category`
- `department`
- `ownerId`
- `status`
