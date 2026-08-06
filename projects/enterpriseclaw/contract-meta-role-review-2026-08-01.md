# EnterpriseClaw Contract Meta-Model Role Review - 2026-08-01

## Scope

Reviewed as one system:

- `contract-principles.md`;
- `contract-interface-patterns.md`; and
- `contract-pitfalls.md`.

Role clusters:

- community simplicity: founder, new hire, power user, skill author;
- runtime and release: Gateway, Aether runtime, Lobster container, release;
- security and evidence: CISO, compliance, policy steward, Aether runtime; and
- fleet and integration: platform, Microsoft 365 connector, power user,
  policy steward.

## Accepted Findings

### Keep the mechanics optional and profile-based

- State explicitly that the patterns are not a required runtime, service,
  protocol, SDK, or storage layer.
- Add local-simple, cross-owner, protected-effect, and managed/fleet profiles.
- Permit synchronous local owners to accept, execute, and settle in one
  response without fake polling, durable evidence, readiness, or convergence.
- Protect the baseline OpenClaw workspace and skill artifact contracts from
  enterprise capture.

### Strengthen authority and evidence

- Bind authority to requester, delegate chain, normalized intent, target,
  generations, risk classification, policy/approval generations, issuer,
  validity, revocation, and verification.
- Treat unknown or unverifiable risk/authority as protected until classified.
- Model allow, deny, review, and modify explicitly.
- Require modified intent to receive a new digest and authority treatment.
- Add evidence producer, chronology, policy, integrity, redaction, retention,
  legal-hold, and chain/supersession semantics.

### Add missing reusable mechanics

- Durable acceptance, dedupe retention, and post-restart reconciliation.
- Atomic generation cutover and drain.
- Fleet fan-out with parent/child operations and subset repair.
- Bidirectional-sync causality, source-change identity, and resync behavior.
- Kill/containment settlement distinct from cancellation and revocation.
- Runtime profiles for latency, deadlines, queues, overload, memory, binding,
  probes, and crash containment.
- Package/protocol/artifact compatibility tuples and fresh-install proof.

### Make governance paths honest

- Distinguish removable managed services from bypass of an enabled policy.
- Add explicit break-glass authority, expiry, evidence, and reconciliation.
- Require relays/connectors to preserve actionable owner rejections.

## Simplifications

- One conceptual authority decision envelope replaces ad hoc principal,
  decision, and approval semantics.
- Profile-specific flows replace a universal mandatory lifecycle.
- Shared fan-out and sync-causality patterns replace per-feature partial
  success and echo-suppression conventions.
- Evidence and compatibility envelopes replace bespoke report and version
  shapes.

## Deferred

- Exact risk-tier taxonomy and classifier implementation.
- Exact cryptographic algorithms, key infrastructure, and evidence format.
- Concrete endpoint, package, protocol, and SDK names.
- Numeric runtime budgets for each deployment profile.

Those require source and runtime evidence and remain outside this conceptual
review.
