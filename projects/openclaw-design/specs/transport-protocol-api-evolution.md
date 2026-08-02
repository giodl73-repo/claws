# Transport, Protocol, and API Evolution

## Boundary

This portfolio defines version, capability, envelope, connection, streaming,
replay, and compatibility relationships for owner-native operations.

It does not own sessions, runs, tools, messages, provider calls, nodes, or host
capabilities merely because it transports them.

## Status and Sources

- Status: current Gateway and ACP foundations; cross-surface compatibility
  contract incomplete.
- Source audit:
  `../source-audit-transport-protocol-api-evolution-2026-08-01.md`.

## Observed Objects

- protocol/interface declaration;
- package/release and wire version;
- capability set;
- request/response/event/error envelope;
- connection incarnation;
- authenticated peer/binding;
- operation stream;
- replay/idempotency state;
- deprecation/removal state; and
- compatibility evidence.

## Capabilities

- advertise supported version ranges and optional capabilities;
- reject unsupported versions with machine-readable recovery;
- authenticate and authorize a bounded peer relationship;
- validate owner payloads at the selected method/event boundary;
- correlate requests, responses, events, runs, streams, and traces;
- apply deadlines, flow control, cancellation, and terminal settlement;
- deduplicate or replay only where the owner contract permits;
- tolerate additive fields and evolve schemas safely; and
- prove mixed-version support, deprecation, rollback, and removal readiness.

## Contracts

### Protocol declaration

- protocol/interface name;
- wire version separate from package/release version;
- supported minimum/maximum range;
- owner and artifact/build identity;
- stability and support window;
- deprecation and removal date/gate; and
- compatibility/conformance suite.

### Capability set

- peer and protocol version;
- supported optional operations or event forms;
- constraints and resource limits;
- unknown-capability behavior;
- capability generation and freshness; and
- explicit rule that capability does not grant authorization.

### Envelope and correlation

- request, response, event, and error discriminator;
- frame/request ID;
- selected method/event/error code;
- owner payload schema/version;
- trace/correlation metadata;
- sequence and state version where applicable;
- retryability and retry-after; and
- additive/unknown-field rules.

### Connection incarnation

- peer/client/device/workload identity;
- transport and endpoint;
- negotiated version and capabilities;
- credential/auth binding generation;
- owner and deployment generation;
- connect, reconnect, drain, and close;
- terminal versus retryable failure; and
- stale-incarnation rejection.

### Operation stream

- semantic owner and operation ID;
- connection incarnation;
- ordered frames/chunks;
- request/response half-close;
- deadline and flow-control credit;
- advisory or acknowledged cancellation;
- dispatch/side-effect certainty;
- exactly one terminal settlement; and
- late-result behavior.

### Replay and idempotency

- dedupe/idempotency identity;
- replay-safe scope;
- resume cursor/token and retained event window;
- complete versus incomplete replay;
- duplicate accepted/in-flight/completed result;
- reconnect behavior;
- uncertain side-effect state; and
- explicit prohibition on transparent replay where unsafe.

### Compatibility evidence

- artifact, package, and wire identities;
- protocol/capability range;
- conformance suite and result;
- native/client/adapter versions tested;
- mixed-version and rollback coverage;
- deprecated fields/versions still observed;
- partial-fleet and stale evidence; and
- deterministic removal blockers.

## Relationships and Non-Ownership

- Method and event owners define payload semantics.
- Transport authentication establishes peer context; semantic owners decide
  operation authorization.
- Gateway frame IDs do not replace session, run, attempt, tool-call, delivery,
  or provider-native identities.
- Reconnect creates a new transport incarnation.
- Transport retry or replay is allowed only when the semantic owner declares
  it safe.
- HTTP, RPC, WebSocket, ACP, channel, node, and host-carrier parity means
  equivalent owner outcomes, not one shared wire shape.
- No universal service bus, general host invocation method, or `/compatible`
  endpoint is required.

## Fleet and Evolution

- advertise ranges and capabilities before rollout;
- preserve role-specific version-skew rules;
- retain additive compatibility and reserve removed fields/tags;
- bind conformance to exact artifact/build identities;
- compare desired, accepted, connected, and observed versions;
- expose unsupported, stale, partial, and rollback-blocked states;
- prove old-path use reaches zero before removal; and
- keep rollback paths until storage/event/schema compatibility permits removal.

## Enterprise Obligations

- Criticality: **E4**.
- Obligations: `A I O N E R X U`; add `D` where payloads carry governed data.
- Current coverage: **C3**.
- Blocking gaps: complete contract inventory, cross-surface support windows,
  portable settlement/correlation, replay declarations, mixed-fleet
  conformance, deprecation/removal gates, and transport-specific network/data
  boundary evidence.

## Current Gaps

- no single machine-readable inventory of served contract versions;
- capability discovery is strongest at Gateway connect but uneven elsewhere;
- replay/resume rules are not uniformly declared;
- node/provider/delivery attempt identities remain inconsistent;
- no shared bounded terminal-settlement vocabulary;
- deprecation windows are not consistently tied to promotion/removal gates;
- mixed-version evidence is not yet fleet-wide; and
- compatibility declarations are not uniformly bound to artifact digests.

## Promotion Candidates

- generated contract/version/capability inventory;
- shared structured compatibility status and conformance evidence;
- replay/idempotency declaration for every side-effecting operation;
- mixed-version fixture suites for Gateway, ACP, nodes, and native clients;
- stable settlement/error vocabulary; and
- release-promotion removal ledger for deprecated fields and paths.
