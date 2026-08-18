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
  `https://github.com/giodl73-repo/openclaw/pull/227` and
  `https://github.com/giodl73-repo/openclaw/pull/228` and
  `https://github.com/giodl73-repo/openclaw/pull/229` and
  `https://github.com/giodl73-repo/openclaw/pull/233` and
  `https://github.com/giodl73-repo/openclaw/pull/234` and
  `https://github.com/giodl73-repo/openclaw/pull/235` and
  `https://github.com/giodl73-repo/openclaw/pull/236` and
  `https://github.com/giodl73-repo/openclaw/pull/237`.
- Latest proof source head:
  `bd2cfb26dea67abac4f3616c77ebea922f1f2307`.
- Latest proof merge commit:
  `916552368850af0cd8bbe6bee85fadc9dcbb30cc`.
- Current Rust slice:
  `experiments/rust-gateway-live-admission/`.
- Current fixtures:
  `.lobster/rust-gateway-live-admission-fixture.json` and
  `.lobster/rust-gateway-side-effect-free-invocation-fixture.json` and
  `.lobster/rust-gateway-reconnect-continuity-fixture.json` and
  `.lobster/rust-gateway-cold-restart-continuity-fixture.json` and
  `.lobster/rust-gateway-unclean-restart-fencing-fixture.json` and
  `.lobster/rust-gateway-deadline-cancellation-fixture.json` and
  `.lobster/rust-gateway-stream-idle-timeout-fixture.json` and
  `.lobster/rust-gateway-stream-input-fixture.json` and
  `.lobster/rust-gateway-artifact-readiness-fixture.json` and
  `.lobster/rust-gateway-single-authority-fixture.json` and
  `.lobster/rust-gateway-durable-selection-fixture.json` and
  `.lobster/rust-gateway-corrupt-selection-recovery-fixture.json` and
  `.lobster/rust-gateway-activation-rollback-fixture.json`.
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
  before accepting fresh work. For streamed work, the Gateway orders
  out-of-order progress, owns accepted-progress inactivity, settles with
  `IDLE_TIMEOUT`, and ignores Rust's late progress and result before accepting
  fresh work. The Gateway also proves bounded ordered input and terminal input
  fencing. One exact fresh-installed Rust candidate now has a readiness receipt
  bound to its SHA-256 digest, bounded side-effect-free profile, protocol,
  connection generation, and pairing generation; a one-byte mutation is
  rejected before launch. One fork-only selection generation now assigns the
  bounded canary to Rust exactly once with zero TypeScript dispatches, while
  ambiguous eligibility fails before either dispatcher runs. An atomic,
  integrity-bound selection receipt now survives process restart: a stale
  expected generation is rejected in a fresh process before either dispatcher
  runs, and a separate fresh process reloads the current generation and
  dispatches only Rust through the exact artifact-bound live proof. A
  digest-mismatched receipt is also rejected in a fresh process at zero
  dispatches without selecting a fallback. Recovery requires a distinct writer
  to repeat owner selection and atomically advance the generation before a new
  fresh reader dispatches only Rust through the exact live proof. It has no
  The fork also proves activation-bound Rust dispatch, newer-generation
  rollback refusal before mutation, and serialized atomic rollback to
  TypeScript in a new generation. It has no effect authority, general runtime
  readiness, production canary authority, state migration, release, or
  deletion proof.
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
| The Gateway orders Rust progress, owns idle settlement, and fences late stream frames. | Fork proof | Merged PR #228: sequences 1 then 0 deliver as `first`, `second`; caller receives `IDLE_TIMEOUT`; Rust observes the correlated cancel; late progress and result are ignored; one distinct fresh request succeeds |
| The Gateway accepts bounded ordered input and fences post-settlement input. | Fork proof | Merged PR #229: oversized input rejected before sequence assignment, sequences 0 and 1 delivered in order, and later input refused after side-effect-free settlement |
| One exact Rust artifact is ready for the bounded side-effect-free profile. | Fork proof | Merged PR #233: fresh candidate digest/profile verification, generation-bound live probe receipt, and tampered candidate rejected before launch/connection |
| One bounded canary selection generation dispatches exactly one runtime. | Fork proof | Merged PR #234: ambiguous TypeScript/Rust eligibility rejects at 0/0 dispatches; accepted Rust selection completes at 0/1 and binds to EVID-023 artifact/Gateway generations |
| A bounded runtime selection survives restart without accepting a stale expected generation. | Fork proof | Merged PR #235: atomic SHA-256-bound receipt, separate writer/stale/current processes, stale refusal at 0/0, and current Rust reload at 0/1 through the exact live proof |
| A corrupted runtime-selection receipt fails closed and requires explicit recovery. | Fork proof | Merged PR #236: digest-mismatched runtime ID rejects at 0/0 with no fallback; separate owner re-selection atomically writes generation 2; a fresh reader then completes Rust at 0/1 |
| Bounded activation and rollback preserve single-runtime selection generations. | Fork proof | Merged PR #237: activation-bound Rust 0/1 dispatch; valid newer-generation rollback refused before mutation at 0/0; serialized atomic generation-3 rollback to TypeScript at 1/0 |
| A bounded Rust process could replace one node profile behind the current protocol. | Target hypothesis | No production canary authority, migration, release, or general runtime-readiness proof |
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
| Rust artifact/release | Release owner | Exact Cargo artifact digest and fresh candidate install proven; packaging/release unproven |
| Local node state generation | Rust node runtime | Unproven |
| Imported TypeScript state receipt | Migration relationship | Unproven |
| Rust connection incarnation | Rust node runtime/protocol | Replacement connection, hard/idle deadline and late-frame fencing, and clean cold process/Gateway restart proven; crash recovery unproven |
| Supported capability profile | Rust node runtime | Partial: one approved side-effect-free command only |
| Rust invocation execution | Rust node runtime | One `system.which` invocation proven; general execution unproven |
| Rust readiness result | Rust activating owner | Partial: exact-artifact readiness for the bounded side-effect-free profile only |
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
   area above. **Connect, one bounded invocation/refusal, live replacement
   reconnect, clean cold restart, unclean-restart settlement fencing, one
   dispatched hard-deadline/cancel lane, and ordered progress with idle timeout
   and late-frame fencing, bounded ordered input, and exact-artifact bounded
   readiness with pre-launch tamper rejection are complete. A fork-only
   selector also proves 0/1 accepted dispatch and 0/0 ambiguous rejection. An
   integrity-bound receipt proves fresh-process current-generation reload at
   0/1 and stale-generation refusal at 0/0. Digest mismatch also fails at 0/0
   with no fallback, and explicit owner re-selection plus an atomic
   generation-2 rewrite recovers in separate processes; effect interruption,
   migration, rollback, and update remain.**
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
| A Rust node implementation exists and is installable. | Built artifact and fresh-install record | Partial: one exact executable is copied to a fresh candidate install and completes a digest-bound probe; packaging/release remains |
| Rust matches TypeScript behavior for the supported profile. | Shared conformance suite | Partial: admission, one `system.which` result/refusal lane, connection replacement, clean cold restart, unclean-restart settlement fencing, hard-deadline cancellation, ordered progress with idle-timeout fencing, bounded input, and exact-artifact bounded readiness only |
| One implementation owns every effect during migration. | Admission-routing and no-dual-dispatch proof | Partial: test-only side-effect-free selector and durable receipt prove fresh-process current-generation 0/1 dispatch plus ambiguous, stale, and corrupted 0/0 refusal; explicit recovery advances the generation before Rust resumes; effects and production authority remain blocked |
| Rust state migration and rollback are safe. | Versioned migration/recovery fixture | Partial: selection activation/rollback is proven for the side-effect-free profile; runtime state migration remains blocked |
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
cancel observed by Rust, and fences the late result before fresh work. The
Gateway also orders out-of-order Rust progress, settles accepted-progress
inactivity with `IDLE_TIMEOUT`, emits the correlated cancel, and fences both
late progress and the late result before fresh work.
Bounded ordered input and terminal input fencing are also proven. One exact
fresh-installed artifact now produces a readiness receipt bound to digest,
profile, protocol, connection generation, and pairing generation, while a
tampered copy is rejected before launch. General execution, effects, general
runtime readiness, and production canary authority remain unproven. The
fork-only selector proves exactly one bounded
Rust dispatch and zero TypeScript dispatches for one selection generation,
plus fail-closed ambiguous selection before dispatch. Its atomic,
integrity-bound receipt also proves stale-generation refusal at 0/0 and
current-generation reload in a separate fresh process at 0/1. A
digest-mismatched receipt also fails at 0/0 without fallback; a separate writer
must repeat owner selection and atomically advance the generation before a
fresh reader resumes Rust at 0/1. Activation-bound Rust dispatch and serialized
atomic rollback to TypeScript are also proven for the side-effect-free
selection profile. Runtime state migration, release, operational, and deletion
claims remain unproven.
