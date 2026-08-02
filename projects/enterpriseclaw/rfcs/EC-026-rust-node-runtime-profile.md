# RFC Scope: Rust Node Runtime Profile

- ID: EC-026
- Lane: Nodes, devices, and edge
- Status: Scoped draft
- Initial posture: New component contract
- Primary owner: Rust Node Mode

## Scope

- Define the first supported Rust node profile: identity, pairing, protocol,
  capabilities, execution, isolation, state, update, readiness, recovery, and
  evidence.

## Explicit Exclusions

- A full Rust OpenClaw rewrite.
- Requiring skills/plugins to be rewritten in Rust.
- Any migration mode where TypeScript and Rust nodes can perform the same
  external effect concurrently.

## Required Outcomes

- TypeScript and Rust implementations pass common conformance.
- Deployment profile declares startup, readiness, CPU, memory, loopback/network
  exposure, initialization ordering, drain/shutdown, recovery,
  reconnect/idempotency, and deployment-unit failure isolation.
- The supported Rust node profile remains usable for ordinary local operation
  without fleet services, centralized evidence, or enterprise policy
  infrastructure; managed controls are additive.
- Rust becomes authoritative for supported node-local execution behavior;
  pairing, protocol negotiation, invocation, and external-effect authority
  remain governed by EC-024, EC-022, EC-025, and EC-014.

## Dependencies

- EC-022, EC-023, EC-024, EC-025, EC-029.

## Proof and Deletion Gate

- Canary a real Rust node through restart and update.
- Route each effect to one authoritative implementation during migration.
- Delete superseded TypeScript node behavior only after runtime, ecosystem,
  fresh-install, mixed-version, upgrade, rollback, and security-owner release
  gates pass.
- Disprove the separate Rust profile if the existing node runtime can satisfy
  the same language-neutral conformance, isolation, operational, and deletion
  gates without a distinct implementation boundary.
