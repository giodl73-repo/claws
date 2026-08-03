# RFC Scope: Owner Checkpoints and Restore

- ID: EC-021
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: New composition contract
- Primary owner: Each state owner; coordinator composes

## Scope

- Define owner checkpoints, consistency generations, capture manifests,
  restore fences, compatibility, dirty state, and completion evidence.

## Current Owner Baseline

Current source proves per-owner SQLite snapshot, verification, atomic archive
publication, and fresh restore, including refusal of sidecars and unrelated
provider artifacts. The accepted upstream baseline does not yet include a
cross-owner restore coordinator, durable journal/quarantine contract,
mixed-generation admission fence, or truthful aggregate partial settlement.

## Explicit Exclusions

- One universal state database.
- Code rollback as state rollback.

## Required Outcomes

- Owners remain independently restorable where valid.
- Cross-owner capture reports consistency limits.
- Each checkpoint manifest binds the source owner generation, source
  artifact/runtime schema, intended target artifact or migration generation,
  and the compatibility claim required to restore the prior owner.
- Restore identifies retained or externally controlled state using EC-030
  lifecycle vocabulary.
- Restore fails closed on dirty/in-flight owner state or stale/unverifiable
  restore authority.
- Partial restore reports per-owner complete, blocked, deferred, external, and
  unknown settlement.
- Restore commit is atomic per owner generation: an owner exposes the restored
  generation as active or remains on the prior generation; the coordinator
  never projects mixed restored generations as one coherent restored state.
- Reinstalling prior code is not proof of restored state. If the previous
  artifact and checkpoint cannot be proven compatible and active together, the
  owner reports `recovery_blocked` and remains quarantined rather than claiming
  rollback.

## Dependencies

- EC-004, EC-006, EC-020, and EC-030.

Release activation consumes checkpoint/restore behavior; checkpoint identity
does not depend on a release operation.

## Proof and Deletion Gate

- Restore two owners with one incompatible checkpoint.
- Delete host scripts that infer backup consistency from file timestamps.
- Disprove the composition contract if owner-native checkpoints already expose
  compatible capture/restore fences and per-owner settlement without
  cross-owner consistency inference.
