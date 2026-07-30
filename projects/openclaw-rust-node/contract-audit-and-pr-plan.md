# OpenClaw Rust Node Contract Audit and PR Plan

Date: 2026-07-28  
OpenClaw source: `openclaw/openclaw` `0159f54268ddb777b707bd04666559075cbfe369`  
Rust RFC branch: `docs/rfc-0001-rust-node-host`

## Recommendation

Use a cross-repository sequence and merge each proved boundary as it becomes
ready. Do not build one long implementation stack.

The first useful release target is narrower than the original six-PR plan: one
experimental crate and headless binary that connect, complete both approval
layers, and serve a bounded custom status command. Streaming invocation is a
separate follow-up. `system.which` is a later admin-sensitive parity PR.
Durable pending work, dynamic plugin tools/skills, and `system.run` are not V1
requirements.

## FACES frame

### Thesis

A Rust node is worth maintaining if it can consume an OpenClaw-owned,
language-neutral node contract without becoming a second protocol or execution
policy owner.

### Deletion target

The generic project deletes the need for each Rust adopter to supervise a
JavaScript node host or independently reconstruct Gateway authentication,
pairing, and invocation behavior. The first Lobster slice must name its own
specific process or bridge deletion before claiming product value.

### Disproof conditions

Stop or narrow the effort if OpenClaw will not publish the missing node event
contract, no maintainer accepts the compatibility boundary, the TypeScript host
has lower total deployment cost for intended adopters, or the first adopter
requires product-specific wire fields.

## Source audit

| Surface | Current authority | Audit result | PR disposition |
| --- | --- | --- | --- |
| Frames, connect, `hello-ok`, errors | `@openclaw/gateway-protocol`; Gateway docs | Published schemas and structured errors exist. | Rust contract pin, then transport. |
| Transport state machine | `@openclaw/gateway-client` | Public reference owns challenge ordering, correlation, timeouts, reconnect, sequence gaps, and host-owned identity/TLS policy. | Adapt behavior in one transport PR; do not copy Node-specific implementation details. |
| Protocol versions | `version.ts` | Current wire version is 4; authenticated nodes may be admitted from minimum 3. `hello-ok` still reports the server protocol, so this is a compatibility window, not lower-dialect negotiation. | Record advertised range, returned version, and legacy-window admission separately. |
| Device identity and pairing | connect schemas, device schemas, Gateway connect code | Signed device approval and device-token issuance are one approval layer. | Dedicated identity/auth/device-pairing PR. |
| Node capability approval | node pairing schemas, reconciliation code, pairing docs | Declared commands are filtered until a separate node request is approved; widening can create reapproval. The request ID is not the device-pairing request ID. | Dedicated activation/capability PR. |
| SSH enrollment | node pairing auto-approval code | Default verification calls `openclaw node identity --json`; a standalone `openclaw-node` does not satisfy it automatically. | Manual V1 baseline; shim or configurable upstream hook is later work. |
| Invoke request/result | node schemas, node registry, node-host runtime | Published request/result shapes exist. Operator-to-Gateway invocation requires an idempotency key; the node-facing event may omit it. | Invocation-core PR with no automatic replay. |
| Invoke input/progress | node schemas and node-host tests | Published bounded schemas exist, including ordered input and 16 KiB progress/input limits. | Streaming-lifecycle PR after core invocation. |
| Invoke cancellation | node registry and `src/node-host/invoke-payload.ts` | Runtime wire shape is locally coerced as `{ invokeId, nodeId }`, but no corresponding published payload schema exists. | Upstream blocker before Rust implementation or conformance claim. |
| Pending work | `node.pending.pull/ack` plus `node.pending.drain/enqueue` | Two related queue surfaces exist for connected-node consumption and durable offline work. They are not required by a custom status command. | Exclude from V1 advertised capabilities; add only with a concrete consumer and its own PR. |
| Dynamic plugin tools/skills | node schemas and protocol docs | Separate mutable catalogs with filtering and lifecycle rules; not required for a basic node runtime. | Explicit V1 non-goal. |
| `system.which` | node-host invoke code and operator-scope docs | Path disclosure is admin-sensitive and approval-gated. | Separate parity PR after the generic binary. |
| `system.run.prepare` / `system.run` | TypeScript node-host and exec-approval stack | Security behavior spans preparation, approvals, policy, identity binding, environment/cwd, execution, streaming, audit, and revocation. No accepted language-neutral corpus exists yet. | Separate post-V1 program; never infer policy from Rust needs. |

## Analogues and competitors

### Reuse or adapt

- `@openclaw/gateway-client`: behavioral reference for the WebSocket state
  machine and host-owned dependency boundary.
- `packages/gateway-protocol`: sole schema, version, and error authority.
- TypeScript `src/node-host`: semantic oracle for node runtime and built-in
  commands, not a source to transliterate wholesale.
- The Rust/Tauri Linux companion: useful for Rust TLS, Ed25519, persistence,
  and reconnect patterns, but it connects as an operator UI and is not a node
  semantic reference.

### Avoid

- Reconstructing undocumented behavior from Gateway implementation alone.
- Generating Rust types for the entire Gateway schema when only the node
  projection is supported.
- Treating public REST-oriented Rust clients or separate Rust agent products as
  evidence of OpenClaw node compatibility. The reviewed external projects do
  not implement this full node contract.

## Stakeholder evaluation

### Gateway engineer

Approve the ownership split and reference-client reuse. Require the node
contract manifest to point to immutable released artifacts. Reject a Rust
implementation of cancellation until its event payload is published.

### Container and platform engineer

Keep the initial crate monolithic and the service binary separate from command
parity work. Require foreground behavior before systemd, launchd, Windows
Service, cross-compilation, signing, and artifact installation are reviewed.

### Security owner

Approve the custom bounded command as the first vertical slice. Keep
`system.which` behind its admin-sensitive gate. Treat `system.run` as a new
security program with a shared corpus and named owner, not as the last item in
an otherwise routine implementation stack.

### Founder and maintainer

Demand a useful stop point before remote execution and minimize permanent
surface area. The project should remain experimental and unofficial until
repository, support, and release ownership are explicit.

## Recommended PR sequence

### OpenClaw prerequisite U1: publish the complete node event contract

Tracking: [openclaw/openclaw#115375](https://github.com/openclaw/openclaw/issues/115375)

- Add the missing `node.invoke.cancel` schema and exported type.
- Add language-neutral fixtures for request, result, input, progress,
  cancellation, relevant structured errors, and disconnect cleanup.
- Define the supported node-contract projection or an equally durable mapping.
- Release these artifacts before Rust claims the affected compatibility.

This may begin while the RFC is under review, but Rust invocation work cannot
cross its release gate.

### Rust R0: RFC, ownership, and gates

- Land the RFC, this source-backed scope, official-versus-independent outcome,
  and explicit non-goals.
- No crate or runtime code.

### Rust R1: protocol pin and conformance harness

- One experimental crate.
- Pin an immutable OpenClaw release, package integrity, and node-contract
  manifest.
- Decode accepted and rejected fixtures and run a real pinned Gateway harness.
- Keep OpenClaw `main` drift detection non-gating.

### Rust R2: WebSocket transport state machine

- Challenge ordering, frame parsing, correlation, timeouts, sequence gaps,
  reconnect backoff, close classification, WSS, and certificate pinning.
- Host-owned auth/identity hooks only; no persistent identity or pairing yet.
- Prove the state machine with a scripted server and pinned Gateway handshake
  failures.

### Rust R3: identity, authentication, and device pairing

- Ed25519 identity, canonical challenge signing, credential-store trait,
  hardened file implementation, device token lifecycle, revocation, and manual
  enrollment diagnostics.
- Prove device approval, reconnect, token rejection, explicit re-pairing, and
  terminal pause behavior.

### Rust R4: node capability approval, activation, and minimal command

- Declared versus effective command surfaces, separate node request state,
  approval/rejection/reapproval, embedding activation, readiness, and one
  bounded custom status command.
- Add only the fixed request/result path required by that proof command; do not
  expose the reusable handler-registration API yet.
- Prove the two request IDs are distinct and the command is unavailable before
  approval.

This is the first end-to-end evidence slice and the earliest sensible point to
reassess whether the project should continue.

### Rust R5: reusable bounded invocation runtime

- Replace the fixed proof handler with the public command-registration runtime.
- Complete request/result lifecycle, deadlines, cancellation token plumbing
  without wire cancellation, idempotency exposure, concurrency/queue/output
  bounds, structured overload, panic containment, disconnect cleanup, and
  malformed payload behavior.
- Do not automatically replay invocations.

### Rust R6: streaming invocation lifecycle

- Ordered input, bounded progress, and wire cancellation after U1 is released.
- Prove out-of-order input, duplicate/late frames, timeout, cancellation races,
  disconnect, and output caps.

### Rust R7: generic headless binary

- Configuration, foreground process, local health/readiness, structured
  redacted diagnostics, graceful shutdown, and the custom status command.
- No `system.*` commands and no release publication yet.

### Rust R8: packaging and experimental release

- Service examples, signed supported-platform artifacts, checksums, SBOM,
  provenance, dependency audit, install smoke, compatibility/support tables,
  and rollback/yank runbook.
- Publish only after ownership and naming gates resolve; otherwise retain local
  artifacts and the explicit experimental label.

### Rust R9: `system.which` parity

- Implement its exact validation, PATH handling, disclosure, result, policy,
  and admin-sensitive pairing semantics.
- Keep it independent of initial packaging so reviewers can reject or defer it
  without blocking the generic host.

## Deferred programs

Pending work and dynamic tool/skill publication each require a concrete adopter
and their own contract-plus-implementation PR. They are not hidden requirements
of V1.

Remote execution begins only after an OpenClaw PR establishes an owned,
language-neutral execution-policy corpus and emergency-disable contract. The
Rust work should then be split at minimum into preparation/approval semantics,
execution/streaming semantics, and adversarial cross-implementation proof. No
part advertises `system.run` until the complete gate passes.

## Stack and merge policy

- Merge R0 before implementation.
- Merge U1 before R6 and before any cancellation conformance claim.
- Prefer merge-as-you-go. Keep at most one short-lived dependent Rust PR stacked
  on an unmerged predecessor when review latency would otherwise idle work.
- Never stack across an unresolved ownership, schema publication, security, or
  release gate.
- Rebase a dependent PR onto its merged predecessor and review its final diff
  independently.
- Do not combine the entire R1-R9 sequence into one review train.

## Verification ladder

Each PR proves its touched boundary first. Broad release validation is reserved
for R8 and actual release candidates.

| PR | Cheapest blocking proof | Broader exit proof |
| --- | --- | --- |
| U1 | Focused protocol-schema generation/validator tests plus node registry and node-host cancellation tests. | OpenClaw changed-lane checks and the normal PR CI gate; no full release umbrella. |
| R1 | Fixture decoding, schema-integrity, and manifest-coverage unit tests. | Harness against immutable current and predecessor Gateway artifacts. |
| R2 | Deterministic scripted WebSocket tests for every state transition, timer, close class, and sequence gap. | Focused real-Gateway handshake success and rejection cases. |
| R3 | Identity, signing, store-hardening, and reconnect unit/integration tests. | Fresh real-Gateway device approval, persistence, rejection, revocation, and re-pairing E2E. |
| R4 | Capability-state, readiness, and fixed request/result proof tests. | Real-Gateway two-request-ID, preapproval denial, approved fixed-command result, rejection, reconnect, and widening E2E. |
| R5 | Public handler runtime, bounds, and failure tests. | Real-Gateway registered-handler result, timeout, saturation, malformed payload, and disconnect E2E. |
| R6 | Ordered-frame and cancellation-race fixtures shared with TypeScript. | Real-Gateway input/progress/cancel E2E after released U1 artifacts. |
| R7 | CLI/config/health/readiness/shutdown process tests. | Fresh-machine foreground smoke on each supported OS. |
| R8 | Artifact inventory, signature, checksum, SBOM, and install tests. | Cross-OS package acceptance against the exact candidate artifacts. |
| R9 | Shared `system.which` parity fixtures. | Real-Gateway scope/approval and reference-result comparison. |

For OpenClaw U1 implementation on Windows, use a Linux-side WSL worktree. Run
focused tests through the repository test wrapper, then the changed gate through
Crabbox/Blacksmith Testbox when it fans out. Do not spend Docker or full-release
lanes on a focused protocol-schema PR unless its actual diff expands the risk.

## Smallest evidence slice

R1 through R4 prove or disprove the thesis: a pinned contract, a reference-like
transport, both approval layers, and one bounded command against a real
Gateway. Stop there for a cost and ownership review before invocation streaming,
packaging, built-in commands, or Lobster adoption.
