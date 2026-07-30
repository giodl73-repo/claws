# Node-Mode Analogue Audit

Audited 2026-07-28 before drafting Rust implementation PRs.

## Conclusion

There are enough production node-mode implementations to draft R1-R4 without
inventing client behavior. No single implementation is the specification.
OpenClaw's published protocol/schema and Gateway server remain authoritative;
the clients below are behavioral analogues and test-oracle sources.

The strongest comparison set is:

1. the TypeScript headless node for generic host behavior;
2. the shared Swift `GatewayNodeSession` for a mature cross-language session;
3. Android for device auth, role-separated sessions, and dynamic inventory;
4. the official ESP component for a small explicit state machine;
5. the official Windows node for bounded dispatch and backpressure.

The independent Moltis Rust node-host is useful for Rust mechanics only. Its
connect and invoke-result shapes are not the current OpenClaw contract and must
not become a compatibility reference.

## Comparison Matrix

| Implementation | What it proves | Reuse or adapt | Do not copy |
| --- | --- | --- | --- |
| OpenClaw TypeScript `src/node-host/runner.ts` | A generic headless client connects with `mode=node`, `role=node`, empty scopes, a signed device identity, and an advertised manifest; it consumes request, input, and cancel events. | Event routing, manifest boundary, reconnect classification, inventory publication, invocation lifecycle. | Node/Bun process assumptions, dynamic plugin/skill inventory, or `system.run` policy before those enter the Rust scope. |
| OpenClaw shared Swift `GatewayNodeSession.swift` | A reusable cross-language node session owns reconnect generations, route invalidation, request deadlines, result delivery, and request/input/cancel handlers. | Session ownership rules, stale-connection rejection, bounded in-flight result semantics, lifecycle tests. | Apple actors, Keychain profiles, app-route callbacks, or UI lifecycle policy. |
| OpenClaw macOS `MacNodeModeCoordinator.swift` | Capability advertisement is a connection-scoped lease; route/config changes fail closed and cause a refreshed connection. | Snapshot commands and capabilities at admission; recheck route authority before dispatch. | TCC, menubar, worker IPC, browser/camera/computer-control product code. |
| OpenClaw Android `GatewaySession.kt` and `ConnectionManager.kt` | Device tokens are persisted per Gateway/device/role; node and operator use separate sessions; device-auth retry is bounded; command/capability inventory reflects current permission and feature state. | V3 challenge-bound signing inputs, role-keyed credential storage, retry/clear rules, dynamic manifest tests, timeout/result behavior. | Android foreground/background fleet logic, UI onboarding, permission APIs, or operator-session product behavior. |
| OpenClaw Watch `WatchDirectNode.swift` | A compact client can implement signed connect, stored/bootstrap device auth, node invocation, and generation-based stale-work rejection without the TypeScript client. | Handshake fixtures and a small connection-state oracle. | Its HTTP poll bridge and foreground-only constraints; Rust R2 is WebSocket. |
| OpenClaw iOS share extension | An ephemeral node may connect with no capabilities or commands using a profile-isolated identity. | Negative fixture: empty inventory is valid and must not imply capability. | Its one-shot upload lifecycle as the generic host lifecycle. |
| Official `openclaw/openclaw-windows-node` C# client | A standalone native node can separate operator/node connections, handle both device and node-pair events, bound concurrent invocations, reject duplicate IDs, and return busy promptly. | Backpressure, exact command dispatch, duplicate-ID protection, approval diagnostics. | Windows capability catalog, PowerShell execution, or its product-specific UI and service setup. |
| Official `openclaw/esp-openclaw-node` C component | A deliberately small node library separates identity, persisted session, protocol, transport, registry, and runtime; one work queue serializes state changes and ignores retired transport callbacks. | R2/R3 module seams, explicit states, transport generation IDs, registration-before-connect, bounded queues. | ESP/NVS/FreeRTOS details and its intentionally smaller invocation surface. |
| OpenClaw Linux Tauri `gateway_ws.rs` | Existing Rust code implements challenge handling, signed identity, TLS policy, request correlation, and structured pairing-error classification. | Rust implementation patterns and test vocabulary for transport/auth primitives. | Treating it as a node reference: it connects as `mode=ui`, `role=operator`. |
| Moltis `crates/node-host` | Tokio, `tokio-tungstenite`, Rust process handling, timeouts, and a simple node-host crate layout are viable. | Dependency and task-ownership ideas after independent review. | Its v4 extension layout and `node.invoke.result` payload (`result`) differ from current OpenClaw shapes; it also exposes `system.run` without OpenClaw's shared policy corpus. |

## Source Pins

- `openclaw/openclaw`: audited local `origin/main` at
  `98591fda13112737aa73cc23974c68a304e8212d`.
- `openclaw/openclaw-windows-node`: `fe43b157b56183ed0746ac53315f39fee41aa3c7`.
- `openclaw/esp-openclaw-node`: `321604b329516712af5e1dc391f526116b2ca414`.
- `moltis-org/moltis`: `9a8d7dd70a97bb119727fe4e66f15fd61f8f44f4`.

Repository-wide GitHub code search also found Python, Java, Go, Dart, and other
Rust projects containing OpenClaw node protocol strings. They are not selected
as contract authorities; most are forks, ports, server implementations, or
unverified third-party clients. They can be sampled only when a specific Rust
design question remains unanswered by the sources above.

## PR Draft Briefs

### R1: Protocol Pin, Node Manifest, and Conformance Harness

Purpose: create the Rust boundary that prevents every later PR from hand-writing
wire shapes.

Include:

- an exact released `@openclaw/gateway-protocol` schema pin with integrity;
- a reviewed node-contract projection/manifest derived from that pin;
- fixtures for connect challenge/connect response, request/result, input, and
  released cancellation shapes;
- canonical JSON and unknown-field/additive-field tests;
- a drift-canary lane against OpenClaw `main`, non-gating until a release is
  selected.

Primary analogues: the published Gateway packages and generated Swift/Kotlin
models. Client implementations are evidence, not schema sources.

### R2: WebSocket Transport State Machine

Purpose: connect, correlate requests, deliver events, and reconnect without
identity persistence or command execution.

Include:

- explicit stopped/connecting/ready/backoff/auth-paused states;
- challenge-before-connect ordering and protocol-range enforcement;
- request correlation, timeout cleanup, close cleanup, and bounded backoff;
- a monotonically increasing transport generation so retired sockets cannot
  mutate current state;
- loopback plaintext policy and remote TLS requirements;
- deterministic fake-Gateway tests.

Primary analogues: `@openclaw/gateway-client`, Swift `GatewayNodeSession`, ESP
runtime/transport, and Linux Rust `gateway_ws.rs`.

### R3: Identity and Device Pairing

Purpose: add stable Ed25519 identity, challenge-bound signing, and role-keyed
device-token persistence while remaining commandless.

Include:

- stable device ID/key generation and atomic private-state persistence;
- signed payload fixtures matching OpenClaw V3 inputs exactly;
- credential precedence and one bounded stored-device-token retry;
- device-token storage keyed by Gateway, device, and role;
- explicit device-pair-required/rejected/auth-paused outcomes;
- manual enrollment as the documented V1 path.

Primary analogues: Android `GatewaySession`, Watch direct node, ESP identity and
persisted-session modules, and Windows `DeviceIdentity`.

### R4: Capability Approval and One Bounded Invocation

Purpose: prove a commandless paired device is distinct from an approved node,
then execute exactly one namespaced read-only command.

Include:

- a connection-scoped immutable command/capability manifest;
- separate device-pair and node-capability request IDs and outcomes;
- reconnect after node approval/reapproval;
- exact command lookup, duplicate invoke-ID rejection, a small concurrency
  bound, deadline behavior, and a canonical result/error mapping;
- only `example.status` (or the finally approved generic namespace), with no
  `system.*` handler;
- a mandatory stop/go review before generalizing the runtime.

Primary analogues: TypeScript node-host invocation, Swift route-bound dispatch,
Android dynamic inventory, Windows backpressure, and ESP registry/queue bounds.

## Review Lenses

- Gateway/runtime: no client may block the receive loop, retain requests after
  disconnect, or create an unbounded reconnect/invocation loop.
- Platform/operations: identity and credentials must survive restart with
  deterministic upgrade behavior, while manifest drift remains observable.
- Security: pairing and capability approval remain separate, advertised
  capability is a lease rather than ambient authority, and R4 stays read-only.

## Decision

Draft R1-R4 from these briefs. Do not open all four as a deep stack. R1 can be
drafted now for review; R2 may be prepared as the sole short-lived dependent PR.
R3 waits for the transport contract to settle, and R4 waits for the identity and
two-stage approval behavior to be proved.
