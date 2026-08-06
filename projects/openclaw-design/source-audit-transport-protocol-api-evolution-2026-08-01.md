# Transport, Protocol, and API Evolution Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw already has a substantial protocol-evolution foundation:

- a separately versioned Gateway WebSocket wire protocol;
- typed request, response, event, and structured-error envelopes;
- min/max protocol advertisement and capability discovery;
- an N-1 compatibility window for authenticated nodes and probes;
- additive-field compatibility rules and intentionally open owner payloads;
- reconnect suppression for terminal protocol/auth mismatches;
- idempotent agent admission keyed by run ID;
- ACP session lifecycle, event replay, ordering, and scoped cancellation; and
- exact tests guarding native-client protocol levels and failure behavior.

The area is a portfolio of runtime relationships and projections, not one
semantic owner. Gateway RPC, HTTP, nodes, ACP, channels, provider transports,
widgets, and future reverse carriers must keep their own authority, ordering,
replay, and settlement rules.

## Current Architecture

```text
semantic owner contract
   session / run / tool / message / node / provider / host binding
        |
        v
method or event schema
   version + capability + auth scope + owner payload
        |
        v
request / response / event envelope
   frame ID + trace + sequence + state version + structured error
        |
        v
transport incarnation
   WebSocket / HTTP / ACP stream / channel / hosted bridge
        |
        v
owner-native terminal settlement and evidence
```

Transport carries and projects owner facts. It does not define session,
execution, tool, provider, message, or host semantics merely because those
objects cross a socket.

## Gateway Protocol Package

`@openclaw/gateway-protocol` owns TypeBox schemas, inferred types, runtime
validators, structural frame guards, client/capability registries, structured
connect errors, general Gateway errors, startup retry metadata, and protocol
version constants:

- `packages/gateway-protocol/README.md:1-145`;
- `packages/gateway-protocol/src/index.ts:1-260`; and
- `packages/gateway-protocol/src/schema/frames.ts:150-190`.

The current wire protocol is version 4. Package release versions follow the
calendar release train and are explicitly separate from the wire protocol
integer.

Top-level envelopes distinguish:

- request: `id`, `method`, optional `params`, optional `traceparent`;
- response: matching `id`, `ok`, optional payload/error;
- event: `event`, optional payload, sequence, and state version; and
- error: stable code/message plus optional details, retryability, and
  retry-after.

Envelope payloads remain open because the selected method, event, or error code
owns the concrete schema.

## Version and Capability Negotiation

Connect handshakes advertise:

- `minProtocol`;
- `maxProtocol`;
- client identity/mode;
- client version; and
- capabilities.

See `packages/gateway-protocol/README.md:94-145` and
`packages/gateway-protocol/src/index.test.ts:204-221`.

A capability advertises client support; it does not grant authorization.
General clients currently require v4. Authenticated nodes and lightweight
probes may use the N-1 compatibility floor during rolling upgrades.

Native protocol guard tests prevent drift across Swift, watchOS, macOS,
Android, and development clients:

- `packages/gateway-protocol/src/native-protocol-levels.guard.test.ts:1-280`.

The tests require role-specific minimum versions and the current maximum
version to be advertised explicitly.

## Schema Evolution and Unknown Fields

The schema graph is strict by default. Selected fields intentionally allow
unknown passthrough data where the transport or downstream owner controls the
shape:

- frame `params`, `payload`, and error `details`;
- channel-owned payloads;
- dynamic config schema;
- worker/node tool arguments and results; and
- logs/chat attachments and message passthroughs.

See:

- `packages/gateway-protocol/README.md:133-145`;
- `packages/gateway-protocol/src/frame-guards.ts:38`;
- `packages/gateway-protocol/src/schema/channels.ts:166-169,220,338,555,680-720`;
- `packages/gateway-protocol/src/index.test.ts:848-1016`.

Lightweight frame guards intentionally tolerate additive payload fields.
Owner validators must narrow open data before reading it.

Deprecated compatibility fields remain marked beside preferred replacements:

- `packages/gateway-protocol/src/schema/sessions.ts:801-813`; and
- `packages/gateway-protocol/src/schema/agents-models-skills.ts:348-350`.

Wire and schema history is recorded in
`packages/gateway-protocol/CHANGELOG.md:21-41,135`.

## Gateway Client and Connection Lifecycle

The Gateway client owns socket state, handshake, request timing, frame
dispatch, reconnect supervision, and authentication selection:

- `packages/gateway-client/src/protocol-client.ts:1-320`;
- `packages/gateway-client/src/connect-auth.ts:1-120`;
- `packages/gateway-client/src/reconnect-policy.ts:1-60`; and
- `packages/gateway-client/src/browser.ts:1-20`.

Reconnect policy pauses on non-recoverable authentication failures and can
treat protocol or client-version mismatch as terminal. Pairing metadata may
instead instruct the client to wait and retry.

A reconnect creates a new transport incarnation. It does not by itself prove
that an in-flight semantic operation can be resumed or replayed safely.

## Request Identity, Idempotency, and Admission

Agent admission uses the request idempotency key as the run ID:

- `src/gateway/server-methods/agent-request-preflight.ts:224-294`.

The preflight:

- validates internal-only session controls;
- derives dedupe keys;
- returns cached accepted/in-flight results;
- captures the current lifecycle generation; and
- binds expected session constraints.

This is semantic admission behavior owned by Agent Execution. The Gateway
request frame ID remains an envelope correlation identity; it is not a
substitute for run ID, session ID, tool-call ID, or provider/delivery attempt.

## RPC Methods, HTTP Surfaces, and Error Contracts

Gateway RPC handlers validate method-specific input, authorization context,
worktree/session constraints, and stable error shapes:

- `src/gateway/server-methods/sessions-create.ts:1-260`;
- `src/gateway/server-methods/agent-run-handler.ts:1-220`;
- `packages/gateway-protocol/src/gateway-error-details.ts:1-120`; and
- `packages/gateway-protocol/src/connect-error-details.test.ts:1-228`.

HTTP routes and WebSocket RPC may expose related owner operations, but they are
separate projections. API parity must mean equivalent semantic outcomes and
authority, not identical transport framing.

## Authentication and Principal Handoff

Connection authentication may select token, bootstrap token, device token, or
password paths and may retry with a stored device token where allowed:

- `packages/gateway-client/src/connect-auth.ts:1-120`.

Gateway handlers receive connection and device identity:

- `src/gateway/server-methods/agent-run-handler.ts:1-80`.

Transport authentication establishes a caller/binding context. The consuming
method, session, node, tool, provider, or channel owner still decides the
authorized operation and scope.

## ACP Session, Stream, Replay, and Cancellation

ACP is an explicit bridge between ACP lifecycle/stream semantics and Gateway
session/execution ownership:

- `src/acp/translator.ts:1-620`;
- `src/acp/server.ts:240-340`;
- `src/acp/event-ledger.ts:1-820`;
- `src/acp/translator.replay.ts:1-57`;
- `src/acp/translator.lifecycle.ts:525-563`; and
- `src/agents/acp-spawn-parent-stream.ts:1-751`.

The translator supports initialize, new session, load/resume, close, prompt,
and event replay. Replay extraction preserves transcript order for user,
assistant, and thought chunks. The event ledger distinguishes complete and
incomplete replay.

Tests cover:

- initialization and lifecycle:
  `src/acp/translator.lifecycle.test.ts:147-521`;
- replay ordering:
  `src/acp/translator.replay.test.ts:1-26`;
- scoped cancellation:
  `src/acp/translator.cancel-scoping.test.ts:220-313`;
- protocol normalization/failure:
  `src/acp/server.startup.test.ts:722-796`;
- parent-stream resume, stall, hidden-tag, and terminal flush ordering:
  `src/agents/acp-spawn-parent-stream.test.ts:289-1351`; and
- separation from legacy thread binding:
  `src/agents/acp-binding-architecture.guardrail.test.ts:1-34`.

ACP replay is ACP-owned continuity behavior. It does not imply that every
Gateway event, provider request, channel send, or external side effect is safe
to replay after reconnect.

## Node, Device, Tool, and Run Correlation

Current identities include:

| Identity | Owner | Renewal boundary |
| -------- | ----- | ---------------- |
| Gateway frame ID | Protocol client/server | Each request/response exchange |
| Connection incarnation | Gateway client/server | Connect or reconnect |
| Logical session key | Routing/session owner | Logical route replacement |
| Session ID | Session registry/transcript owner | Reset, rotation, resume replacement, or migration |
| Run ID/idempotency key | Agent Execution | Each admitted agent request |
| Lifecycle generation | Agent event lifecycle owner | Gateway lifecycle rotation/restart |
| Tool call ID | Tool/provider session | Each invocation |
| ACP session key/session ID | ACP bridge plus Gateway session owner | Logical route versus concrete bridge session replacement |
| Event sequence/state version | Producing event owner | Event publication/state transition |

Tool lifecycle correlation uses run ID plus tool-call ID:
`src/agents/embedded-agent-subscribe.handlers.tools.ts:299-303,1041-1203,1401-1915`.

Cancellation and terminal taxonomy remain owned by the semantic execution:
`src/agents/agent-run-terminal-outcome.ts:508-567`.

## Hosted and Reverse Carrier Analogues

Current source includes bounded host-bridge and ACP overlays:

- `src/canvas/wrap.ts:107-159,237-241`;
- `src/canvas/widget-tool.ts:118-179`;
- `src/agents/acp-runtime-overlay.ts:1-29`;
- `src/agents/acp-spawn-bootstrap-delivery.ts:57-104`; and
- `src/cli/acp-cli.ts:1-59`.

The internal hosted-integration design provides the stronger future analogue:
versioned interface and carrier IDs, generation fencing, operation IDs,
dispatch certainty, flow control, no transparent reconnect replay, and a
strict rejection of general host invocation. See
`../hosted-integration/area-4-provider-dispatch-reverse-carrier.md`.

## External Comparison

Official precedents reinforce:

- gRPC/Protobuf additive schema evolution, deadlines, cancellation, and
  explicit version decisions for breaking changes;
- Kubernetes deprecation windows, round-trip preservation, storage-version
  constraints, and bounded version skew;
- Azure REST explicit API versioning, repeatable requests, idempotency, and
  stable HTTP/JSON errors;
- OpenAI and Anthropic typed ordered streaming events with explicit terminal
  events and partial-output concerns; and
- MCP explicit protocol version, unsupported-version errors, retry with a
  mutually supported version, discovery, and opt-in capabilities.

The strongest reusable order is:

```text
version first
-> capabilities second
-> stable errors and settlement third
-> transport realization last
```

## Enterprise Validation

### Covered

- separate package and wire protocol versions;
- min/max protocol advertisement;
- role-specific compatibility floors and N-1 node/probe rollout;
- capability advertisement separate from authorization;
- typed request/response/event/error envelopes;
- structured protocol/auth mismatch errors;
- additive-field tolerance and explicit open owner payloads;
- deprecated compatibility fields and changelog history;
- request idempotency and run/lifecycle correlation;
- reconnect policy and terminal mismatch handling;
- ACP lifecycle, replay, ordering, and scoped cancellation; and
- native-client and protocol failure guard tests.

### Partial or missing

- one inventory of every served HTTP/RPC/event/node/ACP contract and support
  window;
- explicit compatibility policy for every native app, plugin SDK, channel,
  provider backend, and host adapter;
- consistent capability discovery outside Gateway connect;
- portable invocation/attempt IDs for nodes, providers, and deliveries;
- documented replay/resume rules for every streaming or side-effecting
  operation;
- one stable cross-surface terminal-settlement vocabulary;
- API deprecation dates and removal gates tied to release promotion;
- mixed-version fleet evidence across all protocol consumers;
- conformance suites bound to exact artifact digests; and
- enterprise private-network and tenant-boundary declarations per transport.

## Separation Decision

Document seven bounded contracts:

1. **Protocol declaration**: protocol/interface name, version, minimum/maximum
   range, release/artifact identity, and support window.
2. **Capability set**: supported optional behavior, constraints, and
   authorization-independent discovery.
3. **Envelope and correlation**: request/response/event/error shape, frame ID,
   trace, sequence, state version, and owner payload schema.
4. **Connection incarnation**: peer identity, auth binding, negotiated version,
   capabilities, generation, reconnect, and terminal failure.
5. **Operation stream**: owner operation ID, ordering, flow control, deadline,
   cancellation, half-close, and terminal settlement.
6. **Replay/idempotency contract**: dedupe identity, replay-safe boundary,
   resume cursor/token, uncertainty state, and duplicate result.
7. **Compatibility evidence**: artifact/protocol/capability identity,
   conformance result, mixed-version coverage, deprecation state, and removal
   blockers.

Gateway RPC, HTTP, ACP, node, channel, provider, tool, and host adapters
instantiate only the contracts they need. There should be no universal service
bus or general-purpose host invocation protocol.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Protocol, client, ACP, execution, session, and transport owners are real; the portfolio boundary is distributed. |
| Object model | 3 | Versions, capabilities, frames, errors, sessions, runs, sequences, and replay ledgers are concrete; attempt/settlement identities remain uneven. |
| Contract completeness | 3 | Handshake, auth, validation, errors, reconnect, idempotency, replay, and cancellation are substantial. |
| Separation/cohesion | 2 | ACP translator, protocol client, run handlers, and transport-specific modules still combine several lifecycles. |
| Evidence | 4 | Exact package docs, schemas, guard tests, native-client checks, and lifecycle/replay tests support current behavior. |
| Evolution/operations | 3 | N-1 rollout, additive fields, deprecated fields, changelog, reconnect, and replay are explicit; fleet-wide support/removal policy is incomplete. |

**Total: 18/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C3**: the Gateway and ACP foundations are
strong, while cross-surface inventory, support windows, fleet conformance, and
portable settlement evidence remain incomplete.
