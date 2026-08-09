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
- Current controlled-fork proof:
  `https://github.com/giodl73-repo/openclaw/pull/222`.
- Proof source head:
  `0679dace040ade395c9a2c2f739abd57ff9cf883`.
- Proof merge commit:
  `3010349dca462492420ba4a1233d0d65c512b5a9`.
- Current Rust slice:
  `experiments/rust-gateway-live-admission/`.
- Current fixture:
  `.lobster/rust-gateway-live-admission-fixture.json`.
- Proposal status: EC-026 is a local scoped draft.
- Rust implementation status: one clean-built fork-only Rust process now
  completes the real protocol-v4 Gateway challenge, device-v3 signature,
  device-token, and empty capability-surface handshake. The same process is
  refused when it offers protocol 1. It has no invocation execution, effect
  authority, readiness, canary selection, state migration, or deletion proof.
- Evidence grade: B.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| The TypeScript node runtime has mature identity, pairing, protocol, capability, invocation, cancellation, reconnect, and revocation behavior. | Current source/proof | Node/device source audit and extensive current tests |
| The TypeScript Gateway can remain the initial coordinator and compatibility boundary. | Target design grounded in current architecture | Rust transition strategy |
| Rust is the authoritative node owner today. | Unsupported | No Rust implementation or canary evidence |
| A bounded Rust process can complete one real authenticated current-protocol node admission. | Fork proof | Merged PR #222: protocol 4 accepted, protocol 1 refused |
| A bounded Rust process can execute one owner-admitted invocation. | Unsupported | Live admission declares no commands and dispatches no invocation |
| A bounded Rust process could replace one node profile behind the current protocol. | Target hypothesis | No execution canary, readiness, migration, or release proof |
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
| Rust connection incarnation | Rust node runtime/protocol | Live authenticated connection observed; restart continuity unproven |
| Supported capability profile | Rust node runtime | Contract only |
| Rust invocation execution | Rust node runtime | Unproven; current live slice declares zero commands |
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
   area above. **Connect/invoke subset complete; lifecycle areas remain.**
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
| Rust matches TypeScript behavior for the supported profile. | Shared conformance suite | Partial: current admission and obsolete-protocol refusal only |
| One implementation owns every effect during migration. | Admission-routing and no-dual-dispatch proof | Blocked |
| Rust state migration and rollback are safe. | Versioned migration/recovery fixture | Blocked |
| Operational budgets are acceptable. | Measured canary results | Blocked |
| TypeScript node-host code can be deleted. | Exact deletion inventory and release gate | Blocked |

## Evidence-Ready Disposition

EC-026 remains B and is not evidence-ready. A real Rust artifact now crosses
the live authenticated Gateway boundary with current-protocol acceptance and
obsolete-protocol refusal. Invocation execution, readiness, lifecycle,
single-authority canary selection, migration, release, operational, and
deletion claims remain unproven.
