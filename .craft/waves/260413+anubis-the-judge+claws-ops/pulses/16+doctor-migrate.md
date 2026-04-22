---
pulse: 16
slug: doctor-migrate
plan: claws-three-rings
depends_on: [15]
governing_roles: [claws:platform-eng, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 16: Doctor Migrate

## Objective

Add migration support to `claws doctor` so that configuration schema changes between compiler versions are handled automatically. The migration runner detects the current schema version in claws.json, identifies applicable migrations, and applies them in sequence. Each migration is a versioned transform (e.g., v1-to-v2) that renames fields, adds new defaults, and preserves unknown fields for forward compatibility.

Safety is paramount: the migration system backs up the original config before applying any changes and restores on failure. This integrates with the dead man's switch pattern: `claws snap save → upgrade → claws doctor --post-upgrade --fix → claws check || claws snap restore`.

## Deliverables

- [ ] `claws-sdk/src/doctor/migrate/index.ts` — barrel export for migration module
- [ ] `claws-sdk/src/doctor/migrate/v1-to-v2.ts` — claws.json schema migration: rename fields, add defaults, preserve unknown fields
- [ ] `claws-sdk/src/doctor/migrate/runner.ts` — detect current version, find applicable migrations, apply in sequence, write updated config
- [ ] `claws-sdk/src/doctor/migrate/backup.ts` — backup original config before migration, restore on failure
- [ ] `claws-cli/src/commands/doctor.ts` — updated: --fix flag triggers migration runner when version mismatch detected
- [ ] `claws-sdk/tests/doctor/migrate.unit.test.ts` — L0: 4 unit tests
- [ ] `claws-sdk/tests/doctor/migrate.integration.test.ts` — L1: 2 integration tests

## Acceptance Criteria

- [ ] Migration runner detects v1 config and applies v1-to-v2 migration
- [ ] v1-to-v2 migration renames deprecated fields to current names
- [ ] v1-to-v2 migration adds new required fields with sensible defaults
- [ ] Unknown fields in claws.json are preserved through migration (forward compatibility)
- [ ] Original config is backed up before migration starts
- [ ] Failed migration restores original config from backup
- [ ] `claws doctor --fix` applies pending migrations automatically
- [ ] Dead man's switch pattern works: snap save → migrate → check → snap restore on failure
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — version management, migration safety, schema evolution
- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, backup/restore patterns

## Dependencies

- Pulse 15: doctor checks (migration integrates with doctor orchestrator and --fix flag)

## Test Gates

- [ ] L0 unit: 4 tests — v1→v2 migration transforms fields correctly, unknown field preservation, backup creation before migration, restore on migration failure
- [ ] L1 integration: 2 tests — doctor --fix applies v1→v2 migration on fixture workspace, doctor --fix is no-op when config is already current version
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
