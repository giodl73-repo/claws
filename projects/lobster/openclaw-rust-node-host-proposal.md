# Proposal: Official OpenClaw Rust Node Host

Status: draft for OpenClaw and Lobster architecture review  
Date: 2026-07-28

Public OpenClaw-only prototype:
`https://github.com/giodl73-repo/openclaw-rust-node`

Public RFC draft:
`https://github.com/giodl73-repo/openclaw-rust-node/pull/1`

## Decision requested

Create an official, reusable Rust implementation of the OpenClaw node-client
contract, plus a small headless node-host binary. Use it as the native node
transport for the Lobster superapp and as a community-supported option for
Linux, embedded, appliance, and managed desktop integrations.

Recommended home:

```text
openclaw/openclaw-rust-node
```

The repository name is provisional. The important decision is to use an
official standalone repository rather than add a second language toolchain and
release matrix to the main `openclaw/openclaw` package.

## Owner-first thesis

OpenClaw already has a working node protocol and a mature TypeScript node host:

- `packages/gateway-protocol` owns the Gateway wire schema, protocol versions,
  validation rules, and generated `protocol.schema.json`;
- `src/node-host` owns the reference node-host behavior, command semantics,
  reconnect posture, and execution-policy implementation;
- the Gateway owns pairing, effective capability narrowing, invocation routing,
  timeouts, progress, disconnect cleanup, and node visibility.

The missing shared capability is a supported, embeddable Rust client for that
existing contract.

```text
working OpenClaw node protocol and reference host
+ official Rust client, conformance suite, and headless binary
-> native Lobster integration and a reusable non-JavaScript node option
```

OpenClaw retains protocol and node-command semantics. Lobster retains its
superapp lifecycle, packaging, product UI, enterprise policy, and any
Lobster-owned command handlers.

## Why make it official

The current TypeScript node host is appropriate for the OpenClaw CLI, but it
forces native Rust products to choose among:

1. shipping Node.js or Bun and supervising another process;
2. implementing the private parts of the protocol independently;
3. using a community implementation without an upstream compatibility promise.

For Lobster, this can add cold-start, memory, packaging, health, and
version-skew cost to a runtime that is already Rust-based. A reusable Rust
crate can remove the separate Node/Bun **node-host** process for the adopted
command path. It does not by itself remove unrelated HTTP, SSE, workspace-state,
or hosted-integration sidecars.

The implementation should also be useful outside Lobster. A Lobster-only bridge
would fragment the node ecosystem and leave protocol drift unsolved.

## Existing homes and precedent

OpenClaw has both a semantic home and an ecosystem precedent:

| Existing surface | What it establishes |
| --- | --- |
| `openclaw/openclaw:src/node-host` | Canonical headless node behavior and security semantics |
| `openclaw/openclaw:packages/gateway-protocol` | Public versioned schemas and generated machine-readable protocol |
| `openclaw/openclaw:apps/linux` | Rust Gateway WebSocket, TLS pinning, Ed25519 device identity, pairing, and reconnect code already exist in the monorepo |
| `openclaw/clawgo` | Official standalone node implementation in another language |
| `openclaw/esp-openclaw-node` | Official standalone constrained-device node |
| `openclaw/openclaw-windows-node` | Official standalone platform companion and node suite |

This makes an official standalone Rust node repository a natural extension of
the current organization, not a new architectural category.

### Placement options

| Option | Verdict | Reason |
| --- | --- | --- |
| Add Rust under `src/node-host` | Avoid | Mixes Cargo into the npm package and makes language implementations share a source directory without sharing a build system |
| Add `apps/node-host-rs` to the main monorepo | Viable but not preferred | The monorepo already builds Rust for the Linux companion, but a portable SDK and binary need independent crates.io, cross-compilation, and release cadence |
| Create an official standalone repository | **Recommended** | Matches `clawgo`, ESP, and Windows precedent; keeps release/toolchain ownership clear; remains usable by Lobster and the community |
| Keep it in Lobster | Reject | Produces a private protocol fork and makes OpenClaw compatibility a downstream responsibility |

## Product boundary: node versus hosted integration

This proposal does not turn Lobster hosting infrastructure into an OpenClaw
node.

Use the Rust node client when the peer is a paired runtime or device exposing
user-visible capabilities such as local execution, device status, media,
notifications, or superapp functions.

Use the separate Hosted Integration `host-provider` contract when Lobster is
acting as deployment infrastructure, credential broker, provider dispatcher,
durability service, or fleet authority. Hosts must not inherit node pairing,
device wake, or local command-approval semantics.

The same credential must never be accepted for both roles. Node device identity
and host-provider admission remain separate trust domains even when both are
implemented by one Lobster process.

### Lobster workload classification

| Lobster operation | Expected boundary |
| --- | --- |
| Local execution on the paired superapp runtime | Node |
| Device/runtime status tied to that paired instance | Node |
| User-visible media, notification, or local app capability | Node |
| Read-only superapp capability explicitly approved during node pairing | Node |
| Workspace settings HTTP API, state mutation, or SSE publication | Existing owner API, not automatically a node command |
| Credential acquisition or provider request dispatch | Host provider |
| Durable state publication, restore, or fleet placement | Hosted integration / continuity |
| Tenant-wide policy or control-plane operation | Host/operator owner, not node |

The first Lobster slice must inventory the real process and operations it
replaces. A read-only `describe` proof validates the transport; it does not
prove that an entire sidecar or hosted integration path can be deleted.

## Target repository structure

```text
openclaw-rust-node/
  Cargo.toml
  crates/
    openclaw-gateway-protocol/
    openclaw-node-client/
    openclaw-node-runtime/
    openclaw-node-conformance/
  src/bin/
    openclaw-node.rs
  fixtures/
    protocol/
  examples/
    custom-command.rs
    lobster-embedding.rs
```

This is a target shape, not a requirement for the first prototype. The first
slice should use one experimental crate and split packages only after the
transport and embedding boundaries are proven.

### `openclaw-gateway-protocol`

- Serde frame and node-method types for the supported protocol window.
- No Gateway business logic.
- Unknown additive event and payload fields remain safely ignorable.
- Generated or checked against the pinned
  `@openclaw/gateway-protocol/protocol.schema.json`.
- Records both the OpenClaw release version and wire protocol version used to
  generate or validate the crate.

### `openclaw-node-client`

- WebSocket and WSS connection management.
- System-root TLS and explicit leaf-certificate fingerprint pinning.
- Ed25519 device identity and signed challenge response.
- Device-token persistence and rotation.
- `role: "node"` and `client.mode: "node"` handshake.
- Current and supported N-1 node protocol negotiation, using the
  `MIN_NODE_PROTOCOL_VERSION` and `PROTOCOL_VERSION` values published by the
  authoritative OpenClaw protocol release.
- Pairing-required and credential-required states.
- Capability, command, permission, plugin-tool, and skill advertisement.
- `node.invoke.request`, input, progress, cancellation, and result lifecycle.
- Reconnect backoff and terminal reconnect-pause reasons.
- Bounded frames, payloads, queues, output, and in-flight invocations.
- Disconnect fails in-flight work; the client does not automatically replay
  invocations.
- Idempotency keys are exposed to handlers. A handler that supports caller
  retries owns durable deduplication for its command semantics.

### `openclaw-node-runtime`

- Command-handler registration trait.
- Declared and effective command/capability surfaces.
- Deadline and cancellation propagation.
- Idempotency-key exposure to handlers.
- Structured success and error results.
- Progress writer with ordering and output bounds.
- Optional persistent state interfaces supplied by the embedding product.
- Embedding-controlled activation so command advertisement and readiness wait
  for product state, policy, and dependencies to become ready.
- Handler task isolation. With unwinding enabled, handler panics are converted
  into structured failures and cannot unwind into the embedding product.
- No dependency on Lobster.

### `openclaw-node-conformance`

- Black-box tests against a real OpenClaw Gateway.
- Shared accepted and rejected frame fixtures.
- Compatibility matrix for current Gateway and the supported N-1 node window.
- A test adapter that can be reused by `clawgo`, platform nodes, and future
  node implementations.

### `openclaw-node` binary

- Minimal headless reference host.
- Configuration compatible in intent with `openclaw node run`.
- `system.which` and low-risk status commands first.
- `system.run.prepare` and `system.run` only after execution-policy parity is
  proven against the TypeScript reference host.
- Service examples for systemd, Windows Service, and container supervision.

## Contract authority and drift control

The Rust repository must not become a second protocol owner.

1. `@openclaw/gateway-protocol` remains authoritative.
2. Each Rust release pins an OpenClaw protocol package/release.
3. The corresponding generated `protocol.schema.json` is vendored with its
   release identity and integrity hash. CI may download it only to compare
   against that committed pin.
4. Rust types and fixtures are checked against that schema.
5. End-to-end CI runs the Rust node against real Gateway versions.
6. Incompatible behavior blocks release instead of adding a silent fallback.

Protocol additions discovered by the Rust implementation belong in
`openclaw/openclaw` first. The Rust repository consumes them after they are
documented and released.

The supported-release policy must define terminal behavior when a Gateway raises
its minimum accepted node protocol above the Rust client's maximum. That case
pauses reconnect with an actionable upgrade diagnostic rather than creating an
infinite retry storm.

## Credential storage

The client must make key custody an embedding boundary rather than assuming a
single filesystem layout.

- Provide a secret-store trait for the device private key and device token.
- Prefer OS keyrings, platform keystores, TPM-backed storage, or an
  embedding-owned vault.
- Permit a file fallback only with owner-only permissions, symlink/path
  hardening, bounded reads, atomic replacement, and zeroization of temporary
  secret buffers.
- Bind persisted device tokens to the intended Gateway identity.
- Support explicit key rotation, token revocation, and credential deletion.
- Treat pairing revocation and terminal authentication failures as not-ready;
  do not silently create a new identity or auto-pair.
- Document that a fully compromised node host can act with that node's approved
  command surface; the design limits and revokes authority but cannot hide
  commands from the machine that executes them.

## Execution security

Transport parity is not sufficient for `system.run`. The official Rust host
must preserve the security invariants of the TypeScript reference:

- pairing and approved command-surface narrowing;
- exact invocation and connection binding;
- canonical prepared execution plans;
- approval decisions bound to the prepared command, working directory,
  environment, session, and relevant executable/file identity;
- command allowlists and dangerous-command classification;
- environment filtering;
- working-directory validation;
- timeout and cancellation behavior;
- bounded stdout/stderr and ordered progress;
- audit events for start, denial, completion, timeout, and cancellation;
- no shell-string fallback where argv execution is required;
- fail-closed behavior when the request cannot be represented safely.

The first release should not claim `system.run` parity until OpenClaw publishes
an upstream-owned, language-neutral execution-policy corpus and both
implementations pass it. The corpus must cover plan canonicalization,
allow/deny decisions, dangerous-command classification, environment filtering,
working-directory and executable/file binding, argv and shell edge cases,
timeout, cancellation, and output truncation. A corpus-version change blocks a
Rust execution release until parity is restored.

Audit and revocation behavior must match the upstream reference contract. Rust
must not add a weaker fail-open path. Security-sensitive execution should not
begin until the required decision/audit record has been accepted by the
configured owner boundary, and Gateway/device revocation must stop accepting
new work and cancel in-flight work where the protocol provides cancellation.

## Embedded runtime reliability

Embedding removes a process boundary and therefore needs explicit reliability
gates:

- all library-owned queues, frames, progress buffers, outputs, and in-flight
  tasks have hard bounds;
- a saturated bound returns a structured overload error and changes readiness
  when useful work cannot be accepted;
- handler panic or task failure cannot terminate the superapp when unwinding is
  available;
- the embedding product controls activation ordering and does not advertise
  commands before state rehydration and policy initialization complete;
- readiness means connected, authenticated, paired, protocol-compatible,
  activated, and able to accept a bounded invocation;
- terminal reconnect-pause, revoked credentials, protocol incompatibility, and
  exhausted critical capacity are not-ready states;
- any optional local health endpoint binds loopback only;
- the evidence slice compares embedded and sidecar fault isolation rather than
  assuming one process is always safer.

## V1 scope

### V1.0: transport and embedding

- protocol crate;
- device identity and pairing;
- reconnect and protocol negotiation;
- command advertisement;
- request/result, progress, input, and cancellation;
- custom command-handler API;
- Gateway conformance suite;
- Lobster proof using one harmless, bounded command.

### V1.1: generic headless host

- `system.which`;
- device/runtime status;
- service packaging;
- structured diagnostics and health;
- cross-platform release artifacts.

### V1.2: execution parity

- `system.run.prepare`;
- exec approvals and allowlists;
- `system.run`;
- upstream-owned parity fixtures and adversarial security tests.

## Non-goals

- Replacing the TypeScript node host.
- Changing `node.invoke` wire names or pairing semantics.
- Making Rust the protocol source of truth.
- Loading TypeScript node-host plugins inside Rust.
- Treating hosted provider infrastructure as a node.
- Reimplementing every platform camera, Canvas, notification, browser, MCP,
  local-inference, or agent-CLI command in the first release.
- Adding Lobster-specific methods to the generic crate.

## Lobster superapp integration

Lobster should embed `openclaw-node-client` and `openclaw-node-runtime` as
libraries.

```text
Lobster process
  superapp lifecycle and UI
  enterprise policy and diagnostics
  Rust OpenClaw node client
    signed Gateway connection
    paired node identity
    command registry
      Lobster-owned bounded handlers
      optional generic OpenClaw handlers
```

The first Lobster evidence slice should:

1. connect to a real Gateway with a dedicated test identity;
2. require normal node pairing;
3. advertise one namespaced, read-only command;
4. return one accepted result and one structured rejection;
5. prove timeout, cancellation, reconnect, and oversized-payload behavior;
6. expose readiness and version/conformance status;
7. gate command advertisement on Lobster state and policy readiness;
8. prove handler panic/overload containment;
9. identify the exact Node/Bun node-host process and command path that would be
   deleted, without claiming removal of unrelated HTTP/SSE sidecars.

No Lobster credential-provider, hosting, or fleet-control method should be
placed on the node surface.

## Release and support

- MIT license, matching OpenClaw and `clawgo`.
- Rust stable with a documented minimum supported version.
- Published crates plus signed binaries for Linux x64/arm64, Windows x64/arm64,
  and macOS x64/arm64 where CI is available.
- SBOM, checksums, organization-held signing keys, build provenance, dependency
  audit, and documented reproducibility measurements.
- Vendored protocol schema pins and dependency policy enforced with existing
  Rust ecosystem audit tooling.
- Compatibility table keyed by OpenClaw release and wire protocol version.
- Explicit support and end-of-life window for fielded node versions.
- Security reports follow OpenClaw's existing private disclosure process.
- The repository is labeled official only after a named upstream maintainer and
  release owner accept the support obligation; until then it remains an
  experimental community/fork proof.

## Success criteria

- Lobster can use the adopted node-command path without embedding Node.js/Bun
  or supervising a separate node-host process.
- A community Rust application can register a custom command in fewer than 100
  lines excluding setup and error display.
- Current and N-1 Gateway conformance passes in CI.
- Invalid signatures, stale nonces, changed connection identity, unapproved
  commands, oversized payloads, timeout, cancellation, and disconnect all fail
  deterministically.
- The TypeScript and Rust headless hosts produce equivalent results for the
  promoted command subset.
- No Lobster-specific protocol field or Gateway exception is introduced.
- Lobster P99 activation-to-ready time is at most 3 seconds after its required
  state and policy dependencies are ready.
- Idle and loaded RSS deltas, reconnect latency, and failure recovery are
  measured against the existing sidecar and accepted by the Lobster container
  owner before embedding replaces it.

## Evidence that would disprove the proposal

- The Gateway protocol cannot provide a stable language-neutral node contract
  without importing TypeScript runtime behavior.
- Execution-policy parity requires continuous duplication too costly to review
  safely.
- Lobster's required operations are actually host-provider infrastructure
  operations rather than paired-node capabilities.
- Maintaining a separate Rust release costs more than supervising the existing
  TypeScript node host after measured cold-start, memory, reliability, and
  packaging comparison.

## Smallest implementation slice

1. Extract the minimal reusable Rust Gateway identity and WebSocket code from
   the current Linux companion into one clean experimental crate. Reuse the
   behavior and tests selectively; do not move Tauri-specific UI code.
2. Connect as `role: "node"` rather than operator.
3. Advertise `lobster.runtime.describe`.
4. Return bounded build/version/readiness data.
5. Reject malformed parameters with the canonical result envelope.
6. Run against current OpenClaw main and one released N-1 Gateway.
7. Gate advertisement on an embedding-supplied ready signal.
8. Prove panic, saturation, credential revocation, and protocol-mismatch
   behavior.
9. Measure binary size, idle/loaded RSS, connect time, reconnect time,
   invocation overhead, and crash recovery against `openclaw node run`.

Keep this slice fork-only until the OpenClaw runtime owner confirms repository
placement, ownership, and the protocol-conformance publication path.

## Owner decisions before implementation

This adds an official public SDK and release surface and therefore needs
explicit OpenClaw owner confirmation, defaulting to `@steipete` for routing:

1. standalone repository versus `apps/` in the monorepo;
2. official support level and release owner;
3. crate and binary naming;
4. whether generated protocol JSON is sufficient as the cross-language source
   or whether OpenClaw should publish a dedicated conformance artifact;
5. the command subset required before calling the binary a node host;
6. whether the Linux companion should later consume the shared Rust crates;
7. the named non-Lobster maintainer and release owner required for official
   support;
8. the upstream home and versioning process for protocol and execution-policy
   conformance artifacts.

## Recommended next action

Open an architecture discussion, not an implementation PR, with:

- this owner-first proposal;
- a link to the existing official Go, ESP, Windows, and Linux/Rust precedents;
- the explicit node-versus-host-provider boundary;
- the proposed V1.0 conformance slice;
- Lobster as the first adopter, not the protocol owner.
