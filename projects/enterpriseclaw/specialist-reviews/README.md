# EnterpriseClaw Specialist Review Program

The portfolio-wide reviews established a consistent contract grammar. The
specialist program tests each contract against current owner behavior,
representative inputs, operational failure, and adjacent consumers.

Specialist scoring begins only after the contract meets the evidence-ready
gate in `../evidence-base/README.md`. The portfolio evidence ledger is
`../evidence-base/evidence-ledger-2026-08-01.md`.

## Required Panel

Each contract receives a small panel:

1. owner implementation specialist;
2. adjacent consumer/integration specialist;
3. runtime/operator specialist;
4. security/data specialist when authority, effects, private state, lifecycle,
   or durable evidence is involved; and
5. simplicity/ecosystem challenger.

One reviewer may fill more than one seat when the evidence remains independent.
Do not send every role to every contract.

## Required Evidence Packet

Before review, record:

- authoritative current source baseline and version;
- current owner, objects, lifetimes, entry points, and tests;
- target contract contribution and retained owner authority;
- proposed interface and state-machine mapping;
- accepted, rejected, stale-generation, restart/replay, unknown, and
  mixed-version fixtures as applicable;
- security, disclosure, and operational budgets;
- migration path, one-authority rule, deletion target, and disproof condition;
  and
- facts still proposed, unverified, or blocked.

Reviewers must distinguish source-backed facts from target hypotheses.

Packets must also label fork proof, accepted proposals, and analogues
separately. A proposal or adjacent implementation is not current-source proof.

## Review Dimensions

Score each dimension from 0 to 4:

| Dimension | Question |
| --- | --- |
| Ownership | Is every fact and transition assigned to the correct current or proposed owner? |
| Object model | Are identities, generations, copies, attempts, and lifetimes concrete? |
| Interfaces | Are commands, observations, settlement, evidence, and projections separated? |
| State machines | Are meaningful transitions, terminal states, and unknowns explicit? |
| Failure/recovery | Do restart, replay, cancellation, partial results, and recovery stay truthful? |
| Security/data | Are risk, authority, revocation, disclosure, retention, and evidence bounded? |
| Compatibility | Are local, managed, old/new, mixed-version, upgrade, and rollback behavior clear? |
| Operations | Are latency, startup, readiness, resource, drain, and failure-isolation expectations known? |
| Migration/deletion | Is there one authority during migration and a measurable deletion target? |
| Simplicity | Does the contract avoid burdening owners or profiles that do not need it? |

A contract is **depth-ready** only when:

- no dimension scores 0 or 1;
- every normative target claim has source evidence or an explicit proof plan;
- no blocking specialist contradiction remains;
- the contract has one representative accepted fixture and one structured
  failure fixture; and
- migration, deletion, and disproof are independently testable.

## Area Review Batches

These batches remain the specialist-review order after their evidence packets
are ready. No C-grade contracts remain. The portfolio promotion audit now
records 28 A and seven B contracts. Work first closes the decisive proof for
EC-001, EC-021, EC-022, EC-026, EC-027, EC-031, and EC-034, then closes
target, migration, deletion, mixed-version, and disproof gaps across A-grade
packets.

| Batch | Contracts | Core specialists |
| --- | --- | --- |
| Configuration, activation, release | EC-006, EC-007, EC-021, EC-029, EC-032 | Configuration/Gateway, release, hosting/container, platform operator |
| Identity, trust, and effects | EC-003, EC-004, EC-005, EC-014, EC-024, EC-028 | Credential/trust, policy/Aether, CISO/compliance, effect owner |
| Runtime, protocol, Node/Rust | EC-008, EC-009, EC-010, EC-022, EC-023, EC-025, EC-026, EC-031 | Agent runtime, Gateway/protocol, Node/Rust, resource operator |
| Providers and extensions | EC-011, EC-012, EC-013, EC-027 | Provider routing, usage/budget, skill author, release |
| Conversations and delivery | EC-015, EC-016, EC-017 | Messaging/channel, connector, session, UX/operator |
| Memory, context, lifecycle | EC-018, EC-019, EC-020, EC-030, EC-035 | Memory owner, context runtime, workspace/filesystem, privacy/compliance, storage operator |
| Administration, evidence, fleet | EC-001, EC-002, EC-033, EC-034 | Doctor/admin, evidence/compliance, platform/fleet, simplicity challenger |

## Durable Outputs

For each review:

- `<contract>-evidence-packet.md`;
- `<contract>-specialist-review.md`;
- revised contract scope;
- proof and deletion ledger; and
- project session checkpoint.

## Completed Pilots

- `EC-006-007-evidence-packet.md`
- `EC-006-007-specialist-review-2026-08-01.md`
