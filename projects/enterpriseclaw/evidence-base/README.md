# EnterpriseClaw Evidence Base

This area records the evidence behind all 35 EnterpriseClaw contracts before
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
| B | Current owner behavior is source-backed. Target evidence is absent, fork-only, or incomplete. |
| C | Evidence is primarily conceptual, proposal-based, or an adjacent analogue. A dedicated owner/source audit is still required. |
| D | The owner or material evidence is unresolved. |

The current inventory is in
`evidence-ledger-2026-08-01.md`: **28 A, 7 B, 0 C, and 0 D**.
The B-to-A decisions and exact representative proofs are recorded in
`portfolio-promotion-audit-2026-08-02.md`.

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

### Pass 1: establish missing owner baselines - complete

- EC-026 Rust Node Runtime Profile
- EC-034 Fleet Convergence and Containment

EC-015 and EC-016 moved to B after their existing messaging source audit and
current routing, durable-delivery, retry, and receipt tests were packetized.
EC-001 moved to B after current configuration, readiness, release, channel,
node, and lifecycle projection facts were assembled. EC-010 moved to A after
current Cron source and
tests proved independent schedule, occurrence, restart, admission,
cancellation, and ABA-safe ownership.

EC-026 now has a real fork-only Rust artifact plus six language-neutral
accepted/failure fixtures for one bounded connect/invoke profile. EC-034 now
has two unlike source-backed target families: Lobster version-slot rollout and
OpenClaw Fleet tenant-cell lifecycle. Both move to B. Canary, migration,
portable fan-out, containment certainty, and deletion proof remain open.

### Pass 2: prove high-risk relationship contracts - audited

- authority/effects: EC-003, EC-004, EC-005, EC-014, EC-024, EC-028;
- continuity/recovery: EC-017, EC-019, EC-020, EC-021, EC-023, EC-025;
- compatibility/operations: EC-022, EC-027, EC-031; and
- cross-projection, delivery, replacement, and fleet:
  EC-001, EC-015, EC-016, EC-026, EC-034.

This pass promoted EC-003/004/005/014/015/016/017/019/020/023/024/025/028.
EC-001/021/022/026/027/031/034 remain B because the decisive portable,
cross-owner, cross-language, restart, or multi-unit proof does not yet exist.

### Pass 3: complete remaining general target slices - audited

- EC-002, EC-011, EC-012, EC-013, and EC-018.

All five moved to A after audited accepted/failure proof.

### Pass 4: close remaining B-grade decisive slices

- EC-001 cross-owner projection envelope;
- EC-021 cross-owner restore composition;
- EC-022 language-neutral compatibility;
- EC-026 live Rust/Gateway admission and bounded invocation;
- EC-027 cross-family required metadata;
- EC-031 durable restart-portable lease; and
- EC-034 multi-unit fan-out and targeted repair.

EC-026 now has merged live cross-language admission, bounded invocation,
connection replacement, clean cold-restart continuity, and unclean-restart
settlement-fencing proof. Fresh Gateway and Rust processes reuse durable pairing
and the persisted owner-issued token without renewed approval. After a crash,
the caller loses transport, the restarted Gateway explicitly ignores the old
request ID, and one distinct fresh request settles. It remains B because a
complete runtime profile, effects, readiness, durable crash recovery,
single-authority selection, migration, release, operations, and deletion are
still unproven.

The standalone fleet rollout/recovery simulation now proves immutable target
membership, durable parent/child acceptance, lost-ack reconciliation, targeted
repair, compatibility-before-mutation, generation-bound readiness,
recovery-blocked quarantine, assurance separation, and containment uncertainty.
It also found and corrected a mutable repair-eligibility defect. EC-034 remains
B until the same relationship is proved against disposable current OpenClaw
Fleet cells rather than only fake owners.

### Pass 5: close A-grade target gaps

- all 28 A-grade contracts, prioritized by authority, effect, migration,
  deletion, mixed-version, and disproof risk.

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
