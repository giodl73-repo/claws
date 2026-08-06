# RFC Scope: Release Activation and Recovery

- ID: EC-029
- Lane: Extensibility, artifacts, and release
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Release/update relationship

## Scope

- Define release target, channel, compatibility, staging, release-triggered
  migration, rollback, downgrade, partial publication, and release-recovery
  evidence.
- Surface readiness evidence from EC-007 and EC-032 at all release boundaries;
  surface EC-034 convergence evidence only for multi-unit or fleet release
  targets without redefining those contracts.

## Explicit Exclusions

- One package version for all components.
- Code rollback as state/effect rollback.
- Host process lifecycle/readiness ordering (EC-032) and owner readiness
  semantics (EC-007).

## Required Outcomes

- Fresh-install and published-artifact smoke are release gates.
- Mixed TypeScript/Rust per-component compatibility is declared.
- Protocol, artifact, migration, checkpoint, and evidence compatibility is
  checked before mutating a deployment unit.
- Release commit requires the exact candidate artifact to be active and a
  readiness observation for that candidate generation; stale readiness cannot
  commit a release.
- Upgrade, downgrade, and partial-publication recovery are explicit.
- Partial activation and recovery remain explicit.
- `rolled_back` requires both the previous artifact and compatible prior state
  to be active and ready. Reinstalling previous code over incompatible migrated
  state reports `recovery_blocked` and quarantines the unit.
- Operational activation and assurance completeness are separate. Failure to
  persist required evidence does not rewrite owner runtime state, but it blocks
  attestation and any claim of assured convergence.
- Release evidence records target, component versions, owner generations,
  time, outcome, and retained recovery state.

## Dependencies

- EC-007, EC-021, EC-028, EC-032.

## Proof and Deletion Gate

- Upgrade and recover one mixed-component deployment.
- Delete bespoke upgrade scripts after Phase 0 has dispositioned local patches.
- Disprove the separate contract if existing artifact owners already provide
  fresh-install, atomic activation, mixed-version recovery, downgrade, and
  published-artifact proof without a release relationship.

## Implementation Package Reconciliation

- Extend the existing package/git updater, target-owned Doctor migration,
  database downgrade checks, service handoff, plugin convergence, publication,
  and fresh-install owners rather than building a second updater.
- Generate the compact release-component manifest from current package,
  protocol, database, plugin, and recovery facts; do not make it a parallel
  hand-authored source of truth.
- Keep this contract scoped to one deployment unit. Lobster release slots,
  rings, cohorts, quarantine, patch promotion, and fleet repair consume the
  result but do not own local activation truth.
- Adopt #111542 for localized human preview while preserving canonical
  machine-readable release facts.
- Require exact candidate-generation readiness and compatible prior state
  before claiming commit or rollback.
