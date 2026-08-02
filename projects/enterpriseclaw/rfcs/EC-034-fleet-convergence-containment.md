# RFC Scope: Fleet Convergence and Containment

- ID: EC-034
- Lane: Operations, assurance, and fleet
- Status: Scoped draft
- Initial posture: New projection and relationship contract
- Primary owner: Per-host owners; fleet projection composes

## Scope

- Define desired, accepted, active, ready, converged, drifted, contained, and
  recovered state across deployment units.
- Define emergency containment settlement across authority, admission,
  connections, work, and effects.
- Compose authority revocation from EC-005, admission halt from EC-031,
  effect certainty from EC-014/EC-025, and per-unit readiness/recovery from
  EC-007/EC-029/EC-032 without redefining them.

## Explicit Exclusions

- A central database as canonical host/runtime state.
- Cancellation or disconnect as universal containment proof.

## Required Outcomes

- Mixed versions and partial fleet results remain visible.
- Each fleet operation binds stable parent operation identity, exact target set
  and target generations, plus per-unit child identities and settlements so
  repair/retry targets only failed or unknown units.
- Units without compatible fleet evidence remain unknown, never converged.
- Healthy units are not rewritten to repair failed units.
- Containment distinguishes prevention, interruption, stopped effect, unknown
  effect, and recovery authorization.
- Fleet recovered state composes per-unit recovery; this contract coordinates
  authorized recovery requests and projects per-unit settlement, but does not
  decide authority or perform recovery.
- Emergency containment uses bounded authority; break-glass carries operator
  identity, reason, scope, expiry, evidence, and reconciliation.

## Dependencies

- EC-005, EC-007, EC-014, EC-025, EC-029, EC-031, EC-032, EC-033.

## Proof and Deletion Gate

- Represent 44 converged and 3 failed/contained units truthfully, including at
  least one mixed-version unit.
- Delete fleet scripts that flatten desired state into success.
- Disprove the separate contract if per-unit owners and existing fleet tools
  already preserve target-set identity, partial settlement, targeted repair,
  containment effect certainty, and convergence without central state.
