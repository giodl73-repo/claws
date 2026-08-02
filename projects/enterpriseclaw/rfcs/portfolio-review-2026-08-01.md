# EnterpriseClaw Contract Portfolio Review - 2026-08-01

## Decision

Keep 33 contract scopes separate.

Keep EC-010 as a blocked candidate until its separation gate is tested. If
schedule/wake/activation-lease state is not independently authoritative from
EC-008 run attempts, fold EC-010 into EC-008 and reduce the portfolio to 33.

Do not split another contract before source audit. The current boundaries are
small enough to test and preserve explicit owner authority.

## Applied Naming Corrections

- EC-010 is now **Scheduled Activation Lifecycle**, because it does not own run
  execution or terminal run settlement.
- EC-033 is now **Evidence, Audit, and Attestation**, because EC-001/EC-002 own
  projection and diagnostic/repair behavior.

## Merge and Split Watchlist

| Contract | Current decision | Revisit only if |
| --- | --- | --- |
| EC-005 | Keep together | federation adapters acquire a lifecycle independent of revocation/trust generations |
| EC-010 | Conditional fold into EC-008 | the independent-owner separation test fails |
| EC-017 | Keep together | export becomes a multi-destination delivery product rather than a generation-bound session operation |
| EC-033 | Keep one evidence base | audit and attestation require incompatible persistence or integrity authorities |
| EC-034 | Keep together | emergency containment becomes an independent authority owner rather than a fleet composition |

Contract boundaries and upstream RFC packaging need not be one-to-one. Preserve
the contract seams even when one focused RFC adopts several tightly coupled
contracts.

## Dependency Order

The hard-dependency graph is acyclic and resolves in these layers:

1. EC-001, EC-006, EC-015.
2. EC-003, EC-007, EC-022.
3. EC-004, EC-013, EC-023, EC-032.
4. EC-008, EC-016, EC-027, EC-033.
5. EC-005, EC-011, EC-014, EC-028, EC-030.
6. EC-009, EC-012, EC-017, EC-020, EC-024.
7. EC-019, EC-021, EC-025, EC-031.
8. EC-002, EC-010, EC-018, EC-029.
9. EC-026, EC-034.

This is a specification dependency order, not an implementation program. A
later-layer contract can be source-audited early, but its proof plan must name
the unresolved prerequisite contracts.

## September Evidence Queue

### 1. Configuration and readiness

- EC-006 Effective Configuration Generations.
- EC-007 Owner Readiness Observations.

Use the existing readiness work as the first owner/generation/convergence
reference and avoid inventing a second readiness vocabulary.

### 2. Memory and memory ACL

- EC-020 Memory Corpus Lifecycle.
- EC-019 Memory Scope and ACL.
- EC-018 Context Assembly only after the memory identities are proven.

Audit current OpenClaw and Scout memory stores, copy relationships, retrieval
authorization, and deletion/retention behavior before selecting SQL or Dolt.

### 3. Mail authentication and delivery

- EC-003 Credential Runtime Binding.
- EC-004 Authorization and Approval Decisions.
- EC-005 Trust Revocation and Federation.
- EC-015 Conversation Identity.
- EC-016 Delivery Settlement.

Use a Microsoft 365 connector slice to prove credential binding, protected
effect authority, thread identity, ambiguous delivery, revocation, and durable
evidence without making the connector a trust owner.

### 4. Node and Rust

- EC-022 Protocol Negotiation and Evolution.
- EC-023 Streaming, Cancellation, and Replay.
- EC-024 Node Pairing and Trust.
- EC-025 Remote Node Invocation.
- EC-026 Rust Node Runtime Profile.
- EC-029 Release Activation and Recovery.
- EC-032 Hosting Lifecycle and Readiness.

Rust Node Mode remains the first replacement slice. Promotion requires
cross-language conformance, mixed-version behavior, rollback, operational
budgets, and deletion of the authoritative TypeScript path.

### 5. Claws and artifact compatibility

- EC-013 Capability Surface Negotiation.
- EC-027 Extension Capability Metadata.
- EC-028 Artifact Trust and Provenance.

Start from one existing Claw/extension and prove metadata, compatibility,
capability exposure, artifact identity, and JavaScript/TypeScript host
continuity before adding a generalized catalog.

## Hold for Runtime Evidence

- EC-010 until the owner-separation gate is falsified or passed.
- EC-021, EC-030, and EC-031 until Scout deployment, canonical state,
  synchronization, recovery, and resource constraints are documented.
- SQL/Dolt selection until those same runtime facts identify an owner problem
  that a database can solve.
- EC-034 until deployment-unit identity, mixed-version evidence, and
  per-unit recovery are proven.
- EC-001/EC-002 managed projections until owner facts and evidence schemas are
  stable enough to avoid a second truth.

## Ready for FACES Source Audit

Start detailed source audits and proof plans in this order:

1. EC-006/EC-007.
2. EC-020/EC-019.
3. EC-003/EC-004/EC-005 plus EC-015/EC-016.
4. EC-022 through EC-026, with EC-029/EC-032 release and hosting gates.
5. EC-013/EC-027/EC-028.

Each audit must identify the working OpenClaw/Scout owner, current workaround,
cross-owner contract gap, migration path, compatibility proof, and concrete
deletion target before an upstream RFC is filed.
