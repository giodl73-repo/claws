# Four-Area Architecture Role Review

## Scope

Review the overarching split:

1. host integration and traffic governance;
2. host capability providers;
3. host wiring and composition; and
4. replaceable carriers.

The review uses the current `.craft/roles/claws` runtime, container, security,
simplicity, and fleet-operation lenses.

## Gateway Runtime Owner

### Findings

- The four-area split is safer than a Gateway-owned host bus.
- Gateway descriptors and `OpenClawTransport` are appropriate for host operator
  traffic such as approvals, status, and lifecycle administration.
- Provider bodies, publication, and future streams must not share unbounded
  queues with Gateway control traffic merely because a carrier is shared.
- The composition plan should be compiled outside hot paths and expose cheap
  effective lookups.

### Required constraints

- no global synchronous interception hook;
- no arbitrary host method registry;
- independent queue and flow-control budgets;
- portable failures for consumers and detailed causes for operators; and
- carrier failure must not crash or restart unrelated Gateway behavior.

### Verdict

**Proceed.** Deepen Area 1 around existing Gateway and Channel attachment
points rather than adding new Gateway machinery.

## Lobster Container Operator

### Findings

- ProxyPipe's operational value is one bootstrap, identity, generation,
  readiness, and reconnect story.
- The host wiring model preserves that value without requiring one protocol.
- Plan generation and binding/carrier incarnation must remain distinct so one
  reconnect does not invalidate every integration.
- Carrier choice must account for cold start, memory, health, and crash
  recovery, not only socket count.

### Required constraints

- one inspectable hosted integration status;
- mandatory versus optional readiness;
- explicit startup ordering;
- recovery behavior per binding;
- one authoritative migration writer; and
- no requirement for an additional sidecar unless evidence justifies it.

### Verdict

**Proceed.** The composition root is the key product surface; a shared carrier
is secondary.

## Security And Compliance

### Findings

- Explicit attachment points and typed providers create clearer authority than
  ProxyPipe's central frame union.
- Traffic governance may only narrow OpenClaw policy. It must never widen a
  destination, permission, or subject scope.
- An approval is an authorization decision, not a capability service.
- Provider credentials, operator scopes, Channel identity, and user approval
  authority must remain separate.

### Required constraints

- default-deny unknown attachment points and provider operations;
- immutable tenant/user/runtime provenance derived from authenticated state;
- schema-defined and audited transformations only;
- single-writer migration for all side effects;
- explicit redaction per interface; and
- no silent fallback from governed to less-governed bindings.

### Verdict

**Proceed with these constraints as normative.**

## Simplicity And Ecosystem

### Findings

- Local OpenClaw remains understandable because hosted composition is optional.
- The architecture uses existing Gateway, Channel, SecretRef, provider
  transport, lifecycle, and AgentHarness concepts.
- The largest simplicity risk is turning the composition root into a second
  plugin framework or a universal deployment manifest.
- "ClawBus" should remain a carrier nickname until evidence proves it deserves
  a durable product name.

### Required constraints

- owner registries construct bindings;
- the composition root coordinates prepared handles only;
- no new provider interface without a non-Lobster use case;
- no mandatory bus or sidecar; and
- delete temporary compatibility layers on schedule.

### Verdict

**Proceed.** The corrected model is simpler than the original ClawBus proposal.

## Fleet And Platform Operator

### Findings

- The four-area split is operationally useful only if it produces one effective
  inventory across deployments.
- Plan generation, provenance, readiness, last transition, and reload
  disposition are necessary for drift and rollout diagnosis.
- Per-binding status must aggregate without hiding partial failure.

### Required constraints

- stable integration and provider IDs;
- desired versus effective status;
- source and policy provenance;
- required/optional posture;
- plan generation and binding incarnation;
- structured transition reasons; and
- mixed-version authority and expiry.

### Verdict

**Proceed.** Area 3 must remain coordinated with Area 1 rather than becoming a
late operational add-on.

## Cross-Role Conclusions

The overarching model is coherent:

```text
semantic owner
  -> prepared binding
  -> hosted composition plan
  -> selected carrier
```

No role requires a shared bus. Every role values the common wiring, readiness,
generation, provenance, and migration model.

## Approval Classification

Exec approval belongs to **Area 1: host integration and traffic governance**.

OpenClaw has already produced the pending operation and canonical approval
record. The host:

1. observes `exec.approval.requested`;
2. presents it to the user or an authorized policy surface;
3. binds the decision to authenticated tenant/user/runtime provenance; and
4. calls `exec.approval.resolve`.

The host is not performing a capability requested by OpenClaw. It is carrying
an authorization decision from the user or governing policy back to the
Gateway.

Even when Lobster's ApprovalBroker implements the UI and policy workflow, it is
an integration adapter for the canonical approval surface, not a generic
capability provider.

## Decision

Proceed to a deeper FACES pass on Area 1 with:

- canonical attachment-point inventory;
- approval event and resolution semantics;
- host identity and least privilege;
- policy attachment and precedence;
- status and readiness;
- migration authority; and
- deletion proof for ProxyPipe tags 29-30.
