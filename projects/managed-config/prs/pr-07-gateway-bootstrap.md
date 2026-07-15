# PR 7: Gateway Pre-Migration Bootstrap

## Objective

Expose managed layers as an explicit Gateway startup capability while keeping
the single-config path byte-for-byte and call-shape compatible when unused.

## Dependency

- Fork PR 60: Gateway managed controller.

## Production scope

- Register repeatable ordered `--config-layer <id=path>` flags.
- Merge parent and child declarations in CLI order.
- Activate before future-version guards, recovery, and state migrations.
- Recompose and compare at the migration checkpoint.
- Return the accepted composed snapshot from both migration checkpoints so
  config-dependent doctor migrations use the full authority chain.
- Reject primary selection drift during bootstrap.
- Disable suspicious recovery and ordinary config mutation in managed mode.
- Hand the exact accepted snapshot to initial and in-process Gateway starts.
- Disable the single-file watcher and primary last-known-good promotion.

## First-slice restrictions

- Managed CLI startup is read-only.
- The selected OpenClaw primary must be one declared layer.
- A top-level `env` declaration is rejected; process/service-manager environment
  must be ready before startup.
- Source changes require full process stop/start.

## Lobster example

1. `scout-global`: fleet-wide Gateway posture.
2. `tenant-network`: tenant URLs and private-network facts.
3. `operator`: ordinary selected OpenClaw config and customization.

The labels are examples only. Core sees ordered descriptors and recursively
applies the same composition operation for every layer.

## Proof

- Managed controller, managed bootstrap, doctor migration, pre-action,
  fast-path, and Gateway collision suites pass: 6 files / 265 tests.
- Focused `oxlint` passes.
- Unused repeatable options do not add `configLayer: []` to legacy pre-action
  calls.
- `tsgo` debt is confined to six inherited errors in earlier layer-stack files;
  full `tsc` remains inconclusive due memory/time bounds.

## Review focus

- No recovery or migration can mutate a managed primary before acceptance.
- Trusted dotenv cannot redirect the primary after controller creation.
- File changes between recheck and start cannot cause a single-file reread.
- In-process restart reuses the accepted complete snapshot.
- Ordinary users cannot observe the feature without the explicit flag.
