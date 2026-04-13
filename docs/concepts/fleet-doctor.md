# Fleet Doctor

<!-- atom:fleet-doctor -->

## Overview

Fleet Doctor provides fleet-wide upgrade and migration operations for governed workspaces. It diagnoses governance configuration health across the fleet, identifies workspaces running outdated or incompatible governance versions, and automates the upgrade sequence: snapshot the current state, apply the migration, verify post-upgrade compliance, and roll back on failure.

## How It Works

Fleet Doctor combines three capabilities:

1. **Health Scan** -- Iterates all discovered workspaces, checking governance version, schema compatibility, and plugin freshness against the fleet baseline.
2. **Upgrade Orchestration** -- For each workspace that needs updating, executes the `snap -> upgrade -> doctor -> verify` lifecycle (see `atom:upgrade-lifecycle`).
3. **Rollback Safety** -- If post-upgrade verification fails, restores the pre-upgrade snapshot automatically. No workspace is left in a half-migrated state.

## Key Design Decisions

- Fleet Doctor runs from the fleet CLI (`claws fleet doctor`), not from individual workspaces.
- Upgrades are applied sequentially by default; `--parallel N` enables concurrent upgrades with a concurrency limit.
- A dry-run mode (`--dry-run`) reports what would change without modifying any workspace.

## Related Atoms

- `atom:upgrade-lifecycle` (C83) -- The per-workspace upgrade sequence
- `atom:fleet-scan` (C62) -- Workspace discovery
- `atom:snap-restore` (C84) -- Snapshot rollback mechanism

## Spec

Governed by [CL-05 Developer Experience](../../design/claws/specs/CL-05-developer-experience.md).
