# EC-001/EC-034 Projection and Fleet Evidence Packet

## Review Scope

- EC-001 Owner State Projection.
- EC-034 Fleet Convergence and Containment.

The contracts are reviewed together because fleet convergence consumes
per-owner projections. EC-001 must remain side-effect free, and EC-034 must
coordinate owner commands without turning its projection into canonical unit
state.

## Evidence Baseline

- Current relationship model:
  `projects/openclaw-design/relationship-model.md`.
- Current owner audits include configuration, readiness, channels, nodes,
  privacy/lifecycle, resources, and install/update/release.
- Release source audit revision:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current release model:
  `projects/openclaw-design/specs/install-update-release-compatibility.md`.
- Bounded host/fleet analogue:
  `projects/promoteclaw/openclaw-dual-image-rollback.md`.
- Second target family:
  current OpenClaw Fleet cell registry, operation leases, exact attempt
  labels, health-gated replacement, backup/restore, and purge containment.
- Dedicated current EC-034 packet:
  `EC-034-evidence-packet.md`.
- Compatibility analogue:
  `projects/layering-contracts/evidence-compatibility.md`.
- Proposal status: both EnterpriseClaw contracts are local scoped drafts; no
  accepted generic fleet contract is claimed.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| Current owners expose identity, generation, state, freshness, reasons, and evidence in heterogeneous forms. | Current source | Facility source audits and specs |
| Fleet rollout is optional policy above local activation. | Current source/model | Install/update/release spec |
| Desired, installed, active, ready, and converged are distinct. | Current source/model | Release audit/spec and relationship model |
| Lobster can preserve trusted physical target identity, role generation, quarantine, drain, and route pinning. | Fork/host analogue | Dual-image rollback design and linked proof |
| One portable generic fleet parent/child operation exists today. | Target hypothesis | Not found |
| One shared projection envelope is implemented across unlike owners. | Target hypothesis | Not found |

## EC-001 Current Evidence

At least three unlike current owner families already provide the source facts
needed by a common projection:

1. configuration: runtime revision, hashes/fingerprints, accepted source,
   activation, supersession, and restart debt;
2. readiness: subject/generation, condition state, reason, observed time,
   availability, and recovery; and
3. release: exact artifact identity, installed/active state, compatibility,
   migrations, readiness, and layer-specific recovery certainty.

Channel, node, lifecycle, resource, and evidence owners provide additional
heterogeneous examples.

The current gap is repeated administrative inference and incompatible
freshness/error handling, not absent owner truth.

## EC-034 Current Evidence

Current OpenClaw local owners can:

- validate and refuse incompatible local plans;
- stage and activate exact releases;
- run owner-native migrations;
- restart through service owners;
- report readiness and recovery;
- retain release/provenance evidence; and
- preserve partial or unknown external effects.

The release model describes optional cohorts, holds, promotion, pause/abort,
and per-target convergence, but does not prove a generic fleet implementation.

The Lobster slot model proves only a bounded analogue:

- immutable physical target identities;
- atomic generation-checked Active/Previous role changes;
- Candidate, Retiring, Quarantined, and Free lifecycle;
- route pinning across transports;
- drain and reclamation budgets; and
- exact image/build/version evidence.

Current OpenClaw Fleet tenant cells now provide the second independent target
family. They prove owner-local deployment-unit identity, serialized lifecycle,
replacement recovery, and containment-checked purge. Portable multi-unit
parent/child fan-out and repair remain unproven.

## Target Contribution

### EC-001

Define a transport-neutral observation envelope carrying projection metadata,
source owner, subject, generation, owner-native result, observation/freshness,
certainty, reason, compatibility, disclosure, and evidence references.

### EC-034

Define optional fleet parent operations over immutable target sets, per-unit
child identities and settlements, convergence projections, targeted repair,
and multi-dimensional containment/recovery.

## Representative Fixtures

1. **Unlike projections**: configuration, readiness, and release render
   through EC-001 while preserving owner-native states.
2. **Projection failure**: one owner is unavailable, one stale, and one
   incompatible; none is rewritten as unhealthy or healthy.
3. **Audience projection**: local and managed views consume the same owner
   fact with different protected detail.
4. **Fleet partial result**: 44 units converge; 3 fail, remain unknown, or are
   contained, including one mixed-version unit.
5. **Membership churn**: the fleet membership changes after parent acceptance;
   the accepted target-set generation remains immutable.
6. **Lost acknowledgement**: one child reply is lost and reconciled by child
   identity without replaying healthy units.
7. **Containment uncertainty**: new work is prevented while one remote effect
   remains unknown.
8. **Targeted recovery**: a new repair/recovery parent references only failed
   or unknown prior children.

## Operational and Security Constraints

- Owner observations are audience-bound and retain redaction metadata.
- Fleet authority identifies operator/service principal, scope, policy
  generation, reason, expiry, and break-glass reconciliation.
- Projection caches expose source observation time and freshness.
- Fleet controllers never bypass local compatibility, readiness, or policy
  refusal.
- Controller failure cannot corrupt or redefine settled local owner state.
- Containment evidence separates prevention, interruption, effect certainty,
  and recovery authorization.

## Migration, Deletion, and Disproof

### EC-001

- Adapt owner-native status/readiness/result surfaces.
- Do not add a mandatory runtime service or universal owner interface.
- Delete log/process inference and projection-specific freshness conventions.
- Disprove the contract if unlike owners already provide one consumable,
  versioned envelope without shared inference.

### EC-034

- Start as a relationship/projection contract over existing local owners.
- Reuse bounded rollout and slot analogues without adopting their product-
  specific state as the portable model.
- Delete scripts that flatten desired state, fan-out, or containment into
  generic success.
- Disprove the contract if existing tools already preserve immutable target
  sets, child settlement, targeted repair, and containment certainty without a
  new relationship.

## Unproven Normative Claims

| Target claim | Required proof | Status |
| --- | --- | --- |
| Three unlike owners can expose one envelope without losing semantics. | Cross-owner adapter fixture | Planned |
| Envelope and owner payload versions evolve independently. | Mixed-version projection fixture | Planned |
| Fleet parent acceptance and child settlement are durably recoverable. | Restart/lost-ack fixture | Planned |
| Target-set generations remain immutable under membership churn. | Fleet membership fixture | Planned |
| Targeted repair never rewrites healthy units. | Partial fleet repair fixture | Planned |
| Containment preserves remote effect uncertainty. | Multi-owner containment fixture | Planned |
| The fleet relationship generalizes beyond the Lobster release analogue. | Second independent target-family proof | Source-backed by OpenClaw Fleet tenant cells |

## Evidence-Ready Disposition

- EC-001: B-grade, not evidence-ready. Multiple current owners provide the
  required facts, but a shared adapter and mixed-version proof remain.
- EC-034: B-grade, not evidence-ready. Two unlike target families are
  source-backed, but portable fan-out, immutable target-set recovery, targeted
  repair, and containment certainty remain unproven.
