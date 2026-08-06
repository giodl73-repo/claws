# EC-006/EC-007 Specialist Review - 2026-08-01

## Panel

| Seat | Lens |
| --- | --- |
| Owner implementation | Current OpenClaw configuration IO, runtime snapshot, write, reload, rollback, and restart-debt behavior |
| Consumer/operator | Readiness criteria/providers/results, hosting probes, watch/wait, recovery, mixed versions, and fleet consumption |
| Runtime/hosting | Gateway event-loop safety, activation cutover, startup deadlines, provider replacement, and host boundaries |
| Security/data | Managed-source authority, provenance disclosure, readiness detail authorization, break-glass, and evidence classification |
| Simplicity/ecosystem | Local-file authority, optional readiness, teachability, removability, and concrete script/inference deletion |

## Separation Decision

Keep EC-006 and EC-007 separate as two thin contracts:

- EC-006 extends the existing configuration activation owner and defines
  accepted/active configuration generations.
- EC-007 defines owner-readiness and availability observations attached to an
  owner-native active generation.

EC-007 does not own activation, watch/wait facilities, hosting profiles,
conformance artifacts, durable evidence packaging, host probes, or fleet
convergence.

## Accepted Findings

### EC-006

- Rename the owner to the existing configuration activation owner.
- Reuse current source/runtime snapshots, CAS-style write fencing, preflight,
  canonical reread, atomic publication, rollback, supersession, and restart
  debt.
- Treat optional managed inputs as additional authored sources through the same
  candidate path, not a second writer or database.
- Define portable effective generation as a composed record over owner-native
  identities rather than a replacement truth.
- Limit dynamic/no-op classification to audited snapshot-selection behavior.
- Preserve local files as ordinary authored intent.
- Add bounded managed-source and break-glass authority plus disclosure-safe
  provenance.
- Require a mixed-version proof and one named deleted writer/inference path
  before depth readiness.

### EC-007

- Rename the contract to Owner Readiness Observations.
- Separate accepted/active generations, readiness, and availability rather than
  combining them into one generation/state machine.
- Make readiness result ownership an activating-owner surface using
  criterion-owner semantics.
- Bind evaluation to one active configuration/plugin-registry snapshot.
- Preserve required/advisory, unavailable/not-ready, provider replacement,
  recovery, and mixed-version distinctions.
- Make EC-032 probes consume owner-produced readiness rather than supply it.
- Keep catalogs, watch/wait, hosting profiles, conformance, and durable
  packaging outside core scope.
- Require audience-bound authorization/redaction for protected details.
- Classify live results as operational by default and retained artifacts as
  auditable only when assurance metadata is present.
- Require one named process/install-state readiness check or private evaluator
  deletion before depth readiness.

## Source-Backed Facts

- The current configuration owner already separates source and runtime
  snapshots with revisions/fingerprints.
- Write flows already provide conflict fencing, preflight, canonical reread,
  refresh, and rollback-if-unchanged.
- Reload already supports candidate supersession, one hot commit edge,
  owner-shaped actions, and retained restart debt.
- Dynamic/no-op safety depends on pinned-snapshot selection discipline.
- Existing readiness proof covers canonical results, semantic transitions,
  unavailable/recovery, inert catalogs, one-total-deadline wait, subject
  lifetimes, profile validation, package-installed upgrade, and opt-in
  requirements.

## Remaining Hypotheses and Proof Gaps

### EC-006

- exact portable-generation composition/encoding;
- ordered managed-source and per-field authority semantics;
- exact protected provenance/break-glass enforcement seam;
- exact mixed-version behavior for unknown generation fields; and
- named current writer/inference deletion target.

### EC-007

- exact current upstream status of readiness/profile proposals;
- current authorization scopes for detailed reasons and related subjects;
- provider runtime budgets and safe execution model;
- retained artifact integrity/signing/retention implementation; and
- named current host evaluator/process-state inference deletion target.

## Scores After Revision

### EC-006

| Dimension | Score | Reason |
| --- | ---: | --- |
| Ownership | 4 | Extends the current configuration activation owner. |
| Object model | 4 | Current source/runtime/candidate/debt objects are concrete. |
| Interfaces | 3 | Candidate and publication flow is clear; portable projection remains unproven. |
| State machines | 4 | Validation, acceptance, atomic publication, rollback, supersession, and debt are separated. |
| Failure/recovery | 4 | Current source has strong last-known-good and recovery behavior. |
| Security/data | 2 | Target semantics are set; current enforcement/disclosure proof remains. |
| Compatibility | 2 | Mixed-version target exists but lacks executable proof. |
| Operations | 3 | Current behavior is strong; portable/runtime budgets remain incomplete. |
| Migration/deletion | 2 | One-authority rule is clear; exact deletion target is unnamed. |
| Simplicity | 4 | Local files and existing owner remain primary. |

Total: **32/40**

### EC-007

| Dimension | Score | Reason |
| --- | ---: | --- |
| Ownership | 3 | Owner/readiness boundaries are corrected; proposal status remains mixed. |
| Object model | 3 | Criterion, producer, subject, result, and generations are concrete. |
| Interfaces | 3 | Core observation is separated from consumer facilities. |
| State machines | 4 | Active, readiness, availability, and recovery are orthogonal. |
| Failure/recovery | 3 | Unavailable/recovery is strong; provider failure budgets remain incomplete. |
| Security/data | 2 | Authorization/evidence classes are defined but not source-proven. |
| Compatibility | 3 | Version and provider-replacement rules are explicit. |
| Operations | 3 | Existing watch/wait proof is strong; provider runtime budgets remain. |
| Migration/deletion | 2 | Consumer migration is clear; exact evaluator deletion is unnamed. |
| Simplicity | 3 | Core is thin and optional; adjacent proposal boundaries still need live verification. |

Total: **29/40**

## Disposition

- Blocking contradictions: resolved in the contract revisions.
- Depth-ready EC-006: **No**.
- Depth-ready EC-007: **No**.
- Reason: both contracts still require named deletion targets and executable
  proof for their unresolved target semantics.

## Cheapest Next Proof

1. EC-006: use the current config source/runtime snapshot identities to produce
   one composed portable-generation fixture and prove stale managed-source
   conflict leaves the active runtime unchanged.
2. EC-007: use the existing readiness implementation to prove protected
   summary/detail projection, provider replacement, and mixed-version retained
   result behavior without adding a second evaluator.
