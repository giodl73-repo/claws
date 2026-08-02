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
- Upgrade, downgrade, and partial-publication recovery are explicit.
- Partial activation and recovery remain explicit.
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
