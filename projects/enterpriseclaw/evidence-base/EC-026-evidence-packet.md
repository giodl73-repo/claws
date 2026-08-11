# EC-026 Rust Node Runtime Evidence Packet

## Evidence Baseline

- Current OpenClaw source worktree: `C:\src\openclaw-design-audit`.
- Audited revision: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current source audit:
  `projects/openclaw-design/source-audit-nodes-devices-pairing-2026-08-01.md`.
- Current facility model:
  `projects/openclaw-design/specs/nodes-devices-pairing.md`.
- Transition hypothesis:
  `projects/enterpriseclaw/rust-transition-strategy.md`.
- Historical validator worktree: `C:\src\openclaw-rust-node`; read-only because
  its protocol-v1 proof is obsolete against current Gateway protocol 4.
- Current controlled-fork proofs:
  `https://github.com/giodl73-repo/openclaw/pull/222` and
  `https://github.com/giodl73-repo/openclaw/pull/223` and
  `https://github.com/giodl73-repo/openclaw/pull/224` and
  `https://github.com/giodl73-repo/openclaw/pull/225` and
  `https://github.com/giodl73-repo/openclaw/pull/226` and
  `https://github.com/giodl73-repo/openclaw/pull/227`.
- Latest proof source head:
  `bee22d62d2d771279c65f6e06ae4a270c0934613`.
- Latest proof merge commit:
  `b2d6cc9edfcff2ff737727d35d71b75bf361f099`.
- Current Rust slice:
  `experiments/rust-gateway-live-admission/`.
- Current fixtures:
  `.lobster/rust-gateway-live-admission-fixture.json` and
  `.lobster/rust-gateway-side-effect-free-invocation-fixture.json` and
  `.lobster/rust-gateway-reconnect-continuity-fixture.json` and
  `.lobster/rust-gateway-cold-restart-continuity-fixture.json` and
  `.lobster/rust-gateway-unclean-restart-fencing-fixture.json` and
  `.lobster/rust-gateway-deadline-cancellation-fixture.json`.
- Proposal status: EC-026 is a local scoped draft.
- Rust implementation status: one clean-built fork-only Rust process completes
  current admission and one owner-approved, side-effect-free `system.which`
  invocation. A second process can replace the same identity's connection:
  pending old work settles disconnected, its late result is refused, and only
  the replacement settles fresh work. Fresh Gateway and Rust processes can
  then reload durable pairing and the persisted owner-issued token, retain the
  pairing generation without renewed approval, and execute fresh bounded work.
  When the Gateway and worker are killed with a request in flight, the caller
  loses transport, a fresh Gateway ignores the old request ID, and a distinct
  fresh request settles. For dispatched work that reaches its hard deadline,
  Rust observes the correlated cancel and the Gateway ignores its later result
  before accepting fresh work. It has no effect authority, readiness, durable
  crash recovery, canary selection, state migration, release, or deletion
  proof.
- Evidence grade: B.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| The TypeScript node runtime has mature identity, pairing, protocol, capability, invocation, cancellation, reconnect, and revocation behavior. | Current source/proof | Node/device source audit and extensive current tests |
| The TypeScript Gateway can remain the initial coordinator and compatibility boundary. | Target design grounded in current architecture | Rust transition strategy |
| Rust is the authoritative node owner today. | Unsupported | TypeScript remains authoritative; the fork Rust slice claims authority `none` |
| A bounded Rust process can complete one real authenticated current-protocol node admission. | Fork proof | Merged PR #222: protocol 4 accepted, protocol 1 refused |
| A bounded Rust process can execute one owner-admitted invocation. | Fork proof | Merged PR #223: one fenced `system.which` result; undeclared `system.notify` refused before Rust dispatch |
| A replacement Rust connection fences superseded work. | Fork proof | Merged PR #224: old invoke disconnected, late result refused as pairing changed, fresh replacement invoke accepted |
| Fresh Gateway and Rust processes can reuse durable pairing without renewed approval. | Fork proof | Merged PR #225: original process exit observed, new process IDs, persisted identity/token reloaded, stable pairing generation, and fresh `system.which` accepted |
| A restarted Gateway fences a pre-crash ordinary invocation from settlement. | Fork proof | Merged PR #226: caller transport closed, old request ID explicitly ignored after restart, stable pairing generation, and one distinct fresh request accepted |
| A Gateway hard deadline cancels a dispatched Rust invocation and fences its late result. | Fork proof | Merged PR #227: caller receives node `TIMEOUT`, Rust observes the correlated cancel, late result is ignored, and one distinct fresh request succeeds |
| A bounded Rust process could replace one node profile behind the current protocol. | Target hypothesis | No readiness, authority-selection, migration, or release proof |
| TypeScript node behavior can be deleted after Rust promotion. | Target hypothesis | Exact deletion inventory and proof absent |

## Current Compatibility Baseline

The current TypeScript implementation provides the conformance oracle for:

- device identity and public-key proof;
- pairing approval, token rotation/revocation, and pairing-generation fencing;
- connection incarnation and protocol negotiation;
- capability/command/tool/skill declarations and policy narrowing;
- invocation identity and required idempotency key transport;
- ordered input/progress streams;
- hard and idle deadlines;
- cancellation request behavior;
- disconnect and late-result settlement;
- presence, wake, and pending work;
- approval and dangerous-command policy; and
- N-1 rolling protocol compatibility.

Current limitations such as acknowledged cancellation certainty, fleet
revocation convergence, and cross-Gateway handoff are not requirements the
Rust implementation may silently claim to solve.

## Proposed Rust Objects

| Object | Proposed owner | Evidence status |
| --- | --- | --- |
| Rust runtime instance | Rust node runtime | Fork-only validator exists |
| Rust artifact/release | Release owner | Local Cargo artifact only |
| Local node state generation | Rust node runtime | Unproven |
| Imported TypeScript state receipt | Migration relationship | Unproven |
| Rust connection incarnation | Rust node runtime/protocol | Replacement connection, deadline and late-result fencing, and clean cold process/Gateway restart proven; crash recovery unproven |
| Supported capability profile | Rust node runtime | Partial: one approved side-effect-free command only |
| Rust invocation execution | Rust node runtime | One `system.which` invocation proven; general execution unproven |
| Rust readiness result | Rust activating owner | Unproven |
| Update/recovery result | Release/runtime owners | Unproven |

Pairing, policy, approval, protocol negotiation, invocation relationship, and
external-effect certainty remain governed by their existing contracts.

## Required Conformance Matrix

| Area | Accepted fixture | Structured failure |
| --- | --- | --- |
| Connect | Supported protocol and current pairing generation | Unsupported protocol or stale pairing |
| Capability | Declared supported command | Unsupported/removed command |
| Invocation | One bounded accepted command | Policy/approval rejection |
| Streaming | Ordered input and progress | Duplicate/out-of-order or gap overflow |
| Deadline | Completion before deadline | Hard or idle timeout |
| Cancellation | Supported cancellation request | Unsupported/unacknowledged stop certainty |
| Reconnect | New connection incarnation | Late result from old connection |
| Restart | State and readiness recover | Corrupt/incompatible state quarantine |
| Mixed version | Declared compatible Gateway/Rust tuple | Unsupported tuple fails closed |
| Update | Candidate activates and becomes ready | Candidate failure with layer-specific recovery |

## Single-Authority Migration

- TypeScript mode remains the current baseline.
- Shadow mode compares only side-effect-free results.
- Canary routing selects one implementation before admission.
- Every accepted invocation is bound to one runtime and connection generation.
- Unknown post-dispatch outcomes remain with that owner; they do not fail over
  blindly.
- State migration creates a new Rust-owned generation after fencing the old
  TypeScript writer.
- Rust-only is reached only when the supported TypeScript execution path and
  migration adapter can be deleted.

## Operational and Security Constraints

- Local operation remains complete without managed services.
- The Rust process declares bind scope and exposes no broader network surface
  than the profile requires.
- Key material and pairing credentials use owner-approved storage and
  renewal/revocation semantics.
- Resource limits, admission, queue bounds, deadlines, drain, and crash
  isolation are measured.
- Readiness binds exact artifact, state, protocol, and capability generations.
- Evidence is disclosure-safe and never carries reusable credentials or
  unsanitized invocation payloads.

## Representative Proof Plan

1. Build one immutable Rust node artifact. **Complete for the bounded live
   admission slice.**
2. Fresh-install it beside a TypeScript Gateway. **Complete in a fresh
   test-owned Cargo target with a loopback Gateway.**
3. Pass one accepted and one structured-failure fixture in every conformance
   area above. **Connect, one bounded invocation/refusal, and live replacement
   reconnect, clean cold restart, unclean-restart settlement fencing, and one
   dispatched hard-deadline/cancel lane are complete; streaming, idle timeout,
   effect interruption, durable recovery, and update remain.**
4. Run shadow-safe comparisons without dispatching effects twice.
5. Canary one node/deployment unit as Rust-authoritative.
6. Restart, reconnect, update, and exercise downgrade refusal.
7. Roll back the binary and state only within declared compatibility.
8. Measure runtime budgets and failure isolation.
9. Identify and delete the exact superseded TypeScript execution path.

## Migration, Deletion, and Disproof

- Do not count Rust lines, process startup, or protocol connection as
  ownership transfer.
- Do not require JavaScript/TypeScript skills and plugins to migrate.
- Delete only the TypeScript node-host behavior covered by the promoted Rust
  profile.
- Disprove EC-026 if a distinct Rust process boundary provides no isolation,
  reliability, security, operational, or deletion benefit over adapting the
  existing TypeScript owner.

## Unproven Normative Claims

| Target claim | Required proof | Status |
| --- | --- | --- |
| A Rust node implementation exists and is installable. | Built artifact and fresh-install record | Partial: clean-built executable crosses live admission; packaging remains |
| Rust matches TypeScript behavior for the supported profile. | Shared conformance suite | Partial: admission, one `system.which` result/refusal lane, connection replacement, clean cold restart, unclean-restart settlement fencing, and hard-deadline cancellation only |
| One implementation owns every effect during migration. | Admission-routing and no-dual-dispatch proof | Blocked |
| Rust state migration and rollback are safe. | Versioned migration/recovery fixture | Blocked |
| Operational budgets are acceptable. | Measured canary results | Blocked |
| TypeScript node-host code can be deleted. | Exact deletion inventory and release gate | Blocked |

## Evidence-Ready Disposition

EC-026 remains B and is not evidence-ready. A real Rust artifact now crosses
the live authenticated Gateway boundary and settles one owner-approved,
side-effect-free invocation with connection and pairing-generation fencing.
It also proves replacement routing, old-pending settlement, and late-result
refusal. Fresh Gateway and Rust processes also reuse durable pairing without
renewed approval and execute fresh bounded work. After process death, a fresh
Gateway also ignores the old ordinary invocation ID before accepting a distinct
request. A dispatched hard deadline also settles the caller, emits a correlated
cancel observed by Rust, and fences the late result before fresh work.
General execution, effects, readiness, durable crash recovery, single-authority
canary selection, migration, release, operational, and deletion claims remain
unproven.
