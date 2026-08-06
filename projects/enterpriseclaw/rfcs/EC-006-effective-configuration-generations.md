# RFC Scope: Effective Configuration Generations

- ID: EC-006
- Lane: Configuration and activation
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: OpenClaw configuration activation owner

## Scope

- Extend the existing configuration activation owner across authored-source
  resolution, optional ordered-source authority, validation, materialized
  runtime snapshots, immutable accepted generations, atomic runtime
  publication, rollback, and restart-deferred targets/debt.
- Managed inputs enter the same candidate, conflict, preflight, commit,
  canonical-reread, activation, and recovery path as local inputs.

## Current Owner Baseline

Current OpenClaw already owns separate source/runtime snapshots, process-local
revisions, source/runtime fingerprints, validated and preflighted writes,
expected-base conflict fencing, canonical reread, candidate supersession, hot
activation, restart targets, bounded rollback, and recovery debt.

RFC #34 and implementation PR #107026 add a smaller opt-in V1: repeated ordered
ordinary config documents, exact authority, bounded tool-policy tightening,
and one immutable read-only startup snapshot. They intentionally do not add
live layer reload, write routing, provenance APIs, or portable generations.

## Implementation Disposition

- Adopt #107026 without inflating its bounded V1.
- Use the Lobster three-document adapter only after a conformant released
  version exists.
- Prove accepted/active generation and provenance needs against the current
  snapshot/reload owner before proposing a follow-up surface.
- Delete Lobster overlay writers one at a time after equivalent effective
  configuration and rollback proof.

## Explicit Exclusions

- Readiness meaning, host probe ordering, and fleet convergence; those
  consumers observe the generations defined here.
- A managed configuration database as runtime truth.
- Replacing understandable local configuration files as the ordinary local
  source of intent.

## Required Outcomes

- Resolution is deterministic and explainable.
- Conflicts and unsupported fields are explicit.
- In ordinary local mode, files on disk remain the authored source of intent.
- Optional managed inputs contribute proposals, authority, and provenance when
  enabled; they do not become a second runtime or write authority.
- Rejected generations are non-authoritative, and failed resolution preserves
  the prior accepted generation.
- Ordered sources use expected-generation/base-snapshot conflict fencing,
  pre-commit runtime preflight, committed canonical reread, runtime refresh,
  and existing rollback/restart-debt handling.
- Runtime publication is atomic: the prior runtime generation remains
  authoritative until the new generation commits.
- Existing configuration migrates into an initial accepted generation without
  long-lived dual writes.
- A portable effective generation is a composed record, not a replacement
  owner. It preserves owner-native source fingerprint/resolved hash, runtime
  fingerprint, applied source hash, activation disposition, observation time,
  schema compatibility, and dependent generations that affected activation.
- Provenance projection exposes source kind, source owner/generation, field
  authority, and conflict status without disclosing secret values, reusable
  credentials, or host-private paths unless separately authorized.
- Protected managed-source activation and break-glass override bind bounded
  authority, including requester/delegate identity, scope, reason, expiry,
  revocation handle, and incident/correlation identity. Invalid or
  unverifiable authority cannot produce an accepted generation.
- A path is dynamic/no-op only when audited consumers follow the pinned runtime
  snapshot or equivalent source-to-runtime selection discipline; unaudited
  paths default to hot activation or restart.

## Dependencies

- None for the base local generation model.

Protected external sources may use credential and authorization contracts, but
generation identity does not depend on those consumers.

## Proof and Deletion Gate

- Resolve conflicting local and managed inputs reproducibly.
- Prove one mixed-version case where unknown portable-generation fields do not
  alter authority or active state.
- Before depth readiness, name and delete one current duplicated writer or
  disconnected hash/revision inference path and show the replacement
  accepted-generation output.
- Disprove the separate contract if the existing configuration owner can
  expose stable accepted generations, provenance, conflicts, and compatibility
  without a new cross-owner abstraction.
