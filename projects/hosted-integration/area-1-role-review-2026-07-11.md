# Area 1 Focused Role Review

## Scope

Review the exact Area 1 design:

- Gateway client attachments;
- Channel endpoint attachments;
- provider traffic policy attachments;
- common prepared bindings and status;
- canonical lifecycle administration; and
- approval and Teams deletion slices.

The review applies the Gateway runtime, Lobster container, security, fleet,
M365 connector, and skeptical maintainer lenses.

## Gateway Runtime Owner

### Findings

- Compiled local provider policy avoids a synchronous governance network call
  on every request.
- Gateway method/event discovery and existing scopes are sufficient for host
  clients; a second host protocol is unnecessary.
- Approval replay and Channel endpoint lifecycle must remain outside the
  Gateway event-loop hot path except for existing owner behavior.
- A shared physical carrier must not aggregate logical authority. One Gateway
  connection has one authenticated scope set, so approval, pairing, and admin
  bindings should normally use separate least-privilege clients.

### Required revisions

- Preserve separate logical principals even if future carrier internals share
  sockets.
- Keep policy evaluation bounded and local in V1.
- Never let attachment failure crash unrelated Gateway services.

### Verdict

**Proceed.** No new Gateway host method or reverse bus is required.

## Lobster Container Operator

### Findings

- The three-kind catalog preserves ProxyPipe's wiring value through one
  generation, inventory, and readiness view.
- Teams already has an ordinary HTTP replacement path, so a remote Channel
  adapter framework is not justified for V1.
- A cross-process activation cannot be described as perfectly atomic. Host
  routes, Gateway clients, and Channel listeners become ready at different
  times.
- Connection incarnation must remain distinct from plan generation so a
  reconnect does not invalidate every binding.

### Required revisions

- Describe activation as prepare, activate, observe, and select-authority
  phases with compensation on failure, not distributed atomic commit.
- Readiness must wait for end-to-end programming, not merely process or socket
  startup.
- Preserve explicit cold-start and stale-route failure reasons.

### Verdict

**Proceed with phased activation semantics.**

## Security And CISO

### Findings

- The design correctly keeps approval, pairing, administration, Channel
  forwarding, and provider routing under separate authorities.
- Trusted-forwarder mode is the highest-risk Channel path because it replaces
  provider-direct authentication.
- Host traffic policy correctly narrows rather than unions permissions.
- The catalog needs durable audit correlation across OpenClaw and host records,
  even when full human-actor provenance is not stored by Gateway.
- Silent fallback to direct egress or a less-governed route would invalidate
  the security model.

### Required revisions

- Every side-effecting decision carries binding ID, plan generation, owner
  request/event ID, and host audit correlation.
- Trusted-forwarder bindings require pinned mutual identity and owner-defined
  validation evidence.
- Required policy and approval-route failures remain fail-closed.
- No implicit governed-to-direct fallback.

### Verdict

**Proceed.** Actor provenance remains an additive audit enhancement, not a new
transport requirement.

## M365 Connector And Channel Operator

### Findings

- The endpoint attachment correctly keeps Teams Activity authentication,
  parsing, sender policy, and acknowledgement with the Channel owner.
- Host validation cannot replace Channel validation unless the Channel
  explicitly defines a trusted-forwarder contract.
- At-least-once delivery, stable delivery IDs, and unconfirmed timeout outcomes
  are necessary because an HTTP timeout can occur after acceptance.
- Live shadow delivery is unsafe because it can duplicate actionable
  activities.

### Required revisions

- Channel shadow proof uses fixtures, route probes, or non-actionable validation
  endpoints; it never copies live production events into the handler.
- Acknowledgement classes remain owner-mapped rather than globally inferred
  from status codes.
- The selected endpoint generation and delivery ID appear in diagnostics.

### Verdict

**Proceed.** No generic `channel.ingress` RPC.

## Fleet And Platform Operator

### Findings

- Stable attachment IDs, observed generation, policy digests, and structured
  conditions are sufficient for fleet drift and rollout diagnosis.
- Free-form status alone is inadequate.
- Desired/effective state and owner status must remain distinguishable.
- The catalog needs a stable schema version and unknown-field compatibility
  rules before implementation.

### Required revisions

- Descriptors are additive and versioned; unknown optional fields are ignored,
  while unknown required capabilities reject activation.
- Status always identifies its observed plan generation.
- Fleet inventory exposes authority mode and source provenance.

### Verdict

**Proceed after schema-evolution rules are normative.**

## Skeptical Maintainer And Simplicity

### Findings

- A speculative remote Channel adapter kind would create a second plugin
  framework without a deletion-bearing use case.
- The remaining three kinds are materially different and source-backed:
  Gateway clients, Channel endpoints, and traffic policy.
- The common catalog must stay metadata-only. Owner handles and schemas remain
  outside the central descriptor.
- A single giant `host integration status` object would become an untyped
  dumping ground unless conditions and provenance remain structured.

### Required revisions

- Defer remote Channel adapters.
- New attachment kinds require a concrete non-Lobster case and proof that the
  three existing kinds cannot express it.
- Do not add a central payload union or executable callback registry.

### Verdict

**Proceed with three V1 kinds.**

## Cross-Role Blocking Findings Resolved

### 1. Speculative fourth attachment kind

Resolved by deferring remote Channel adapters. Teams uses an endpoint
attachment; existing OpenClaw Channel adapters remain in-process owner
contracts.

### 2. Distributed atomicity overclaim

Resolved by defining phased activation:

```text
prepare
  -> activate dependencies
  -> observe owner readiness
  -> select authoritative generation
  -> compensate or remain non-ready on failure
```

The plan switch is authoritative and fenced; external resource creation is not
claimed to be an atomic database transaction.

### 3. Privilege aggregation through shared clients

Resolved by keeping separate logical principals and least-privilege Gateway
clients. A future shared carrier may multiplex only if it preserves independent
authenticated identities, queues, and failure domains.

### 4. Unsafe Channel shadow traffic

Resolved by restricting Channel shadow validation to fixtures, probes, and
non-actionable paths.

### 5. Cross-system audit correlation

Resolved by requiring binding ID, plan generation, owner operation ID, and host
audit correlation on side-effecting flows. Rich actor assertions remain
future additive metadata.

## Normative V1 Decisions

1. Area 1 has three attachment kinds:
   - Gateway client;
   - Channel endpoint;
   - traffic policy.
2. The common catalog is metadata-only.
3. Owner protocols and payload schemas remain independent.
4. Activation is phased and generation-fenced, not globally atomic.
5. Gateway authorities use separate least-privilege logical clients.
6. Required governance failure is fail-closed.
7. No implicit route fallback may weaken governance.
8. Status includes observed generation, provenance, authority mode, and
   structured conditions.
9. Descriptor evolution is additive; unknown required capabilities fail
   activation.
10. New attachment kinds require evidence and a deletion-bearing use case.

## Proof Required Before Implementation

- Rust approval consumer conformance for replay, dedupe, expiry, and resolve;
- Teams HTTP endpoint conformance for identity, duplicate delivery, retryable,
  terminal, and unconfirmed outcomes;
- provider policy fixture proving deny, approved route selection, conflict, and
  no implicit fallback;
- composition fixture proving stale generation cannot become authoritative;
- status snapshot proving desired/effective/observed distinctions; and
- deletion accounting for ProxyPipe tags 12-13 and 29-30.

## Decision

Area 1 is architecturally complete for RFC-level design. The next action is to
revise the RFC around the three-kind attachment catalog and its proof gates,
without adding implementation.
