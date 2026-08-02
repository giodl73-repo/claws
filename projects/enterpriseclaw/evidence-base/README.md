# EnterpriseClaw Evidence Base

This area records the evidence behind all 34 EnterpriseClaw contracts before
specialist review, upstream RFC work, or implementation planning.

The evidence base prevents a well-written target contract from being mistaken
for current behavior. Every claim must be classified as one of:

- **current source**: behavior verified in the current OpenClaw source;
- **current proof**: behavior exercised by a test, fixture, package, host, or
  production-like run;
- **fork proof**: behavior implemented and exercised outside accepted
  upstream source;
- **accepted proposal**: normative text with verified acceptance status;
- **proposed contract**: intended target behavior not yet accepted; or
- **analogue**: a related pattern that informs design but does not prove it.

## Evidence Grades

Grades measure the evidence base, not contract quality or implementation
readiness.

| Grade | Meaning |
| --- | --- |
| A | Current source is audited and at least one representative proof exists. Target claims may still need proof. |
| B | Current owner behavior is source-backed, but the target contribution lacks representative executable proof. |
| C | Evidence is primarily conceptual, proposal-based, or an adjacent analogue. A dedicated owner/source audit is still required. |
| D | The owner or material evidence is unresolved. |

The initial inventory is in
`evidence-ledger-2026-08-01.md`: **8 A, 20 B, 6 C, and 0 D**.

## Evidence-Ready Gate

A contract is evidence-ready for specialist review only when its packet has:

1. an exact source worktree, revision, and acceptance-status baseline;
2. current owners, entry points, objects, identities, and state transitions;
3. representative current tests or production-like observations;
4. current facts separated from fork proof, accepted proposals, target
   hypotheses, and analogues;
5. one accepted fixture and one structured failure fixture;
6. explicit stale-generation, restart/replay, unknown, and mixed-version
   coverage where applicable;
7. a named migration/deletion target and falsifiable disproof condition; and
8. a ledger of every normative target claim that remains unproven.

An A grade does not automatically satisfy this gate. It only means the packet
already has a stronger starting baseline.

## Work Order

Evidence work proceeds by weakness and risk rather than RFC number.

### Pass 1: establish missing owner baselines

- EC-001 Owner State Projection
- EC-010 Scheduled Activation Lifecycle
- EC-015 Conversation Identity
- EC-016 Delivery Settlement
- EC-026 Rust Node Runtime Profile
- EC-034 Fleet Convergence and Containment

These C-grade contracts need dedicated source audits or bounded owner proofs
before specialist scoring is useful.

### Pass 2: prove high-risk relationship contracts

- authority/effects: EC-003, EC-004, EC-005, EC-014, EC-024, EC-028;
- continuity/recovery: EC-017, EC-019, EC-020, EC-021, EC-023, EC-025;
- compatibility/operations: EC-022, EC-027, EC-031.

### Pass 3: complete remaining B-grade target slices

- EC-002, EC-011, EC-012, EC-013, and EC-018.

### Pass 4: close A-grade target gaps

- EC-006, EC-007, EC-008, EC-009, EC-029, EC-030, EC-032, and EC-033.

Existing source and proof should be reused. A-grade contracts still require
portable target semantics, migration/deletion, and disproof to be executable
before they are depth-ready.

## Durable Outputs

Each contract ultimately receives:

- `EC-NNN-evidence-packet.md`;
- a current-fact and target-claim ledger;
- accepted and structured-failure fixtures;
- proof, migration, deletion, and disproof results; and
- a specialist review only after the evidence-ready gate is met.

Use `../specialist-reviews/TEMPLATE.md` as the packet structure until a
contract-specific packet exists.
