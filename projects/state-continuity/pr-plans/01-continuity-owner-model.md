# PR 1: Continuity Owner Model

## Outcome

Establish the additive OpenClaw contract that later checkpoint, replacement,
and wake work uses without changing current runtime behavior.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Branch base: latest upstream `main`
- Depends for merge on: RFC 0021 approval
- Alignment only: follow the Hosted Integration owner, Hosting Profile, Status,
  and Doctor conventions as they land; do not base this branch on the Hosted
  Integration implementation branch

## Change

- Add the continuity owner and stable lifecycle vocabulary.
- Add `continuity.level`; absence means Conventional without writing or
  materializing a new default into existing configuration.
- Define typed state-surface descriptors and treatments: captured,
  reconstructed, external, and ephemeral.
- Inventory every required core state surface without adding third-party
  registration.
- Define only the inventory and status contracts exercised by this PR. Manifest,
  artifact, and restore-dependency shapes land with PR 2 where tests exercise
  them.
- Project proven capabilities into CAPE status.
- Add stable validation and Doctor reasons for unsupported level and missing
  state-surface treatment.
- Report machine-readable desired/effective level, capability maturity, version,
  and stable reasons for fleet drift and canary decisions.
- Add conformance fixtures consumed by later PRs.

## Non-Goals

- No checkpoint scheduler, artifact creation, publication, or restore.
- No generation fencing, hibernate, wake, or retained ingress.
- No host-specific config or Lobster package.
- No global consistency, writer accounting, mutation watermark, or `/synced`.

## Proof And Exit

- With no continuity config, startup and shutdown behavior are unchanged.
- Conventional reports no aggregate recovery guarantee.
- The core inventory has no unclassified required surface.
- Config and status use the same stable CAPE vocabulary.
- Unknown configured levels fail validation; absent configuration remains
  Conventional.
- Secrets and sensitive paths are redacted from Status and Doctor.
- Later PR fixtures can consume the types without redefining them.

## Rollback

Remove the unused additive model and fixtures; no persisted artifact or runtime
behavior depends on them yet.
