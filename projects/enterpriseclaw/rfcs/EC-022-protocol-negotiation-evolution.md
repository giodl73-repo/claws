# RFC Scope: Protocol Negotiation and Evolution

- ID: EC-022
- Lane: Runtime fabric and protocols
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Gateway/ACP/MCP protocol owners

## Scope

- Define peer identity, protocol/schema version, capability negotiation,
  compatibility, unsupported behavior, and deprecation.

## Current Owner Baseline

Current TypeScript gateway-protocol source proves separate wire versions,
role-specific minimum/maximum negotiation, structured protocol mismatch
errors, and additive unknown-field behavior at declared seams. Current N-1
commitments apply to node and probe roles, not universally to every client.
Language-neutral TypeScript/Rust compatibility and explicit removal windows
remain unproven.

## Implementation Disposition

- Reuse the current Gateway protocol as the compatibility oracle.
- Build and publish one versioned language-neutral fixture format before
  proposing new negotiation fields.
- Keep protocol fixtures in the portable OpenClaw contract; keep the Rust
  implementation in an independent open-source component.
- Add owner fields only when TypeScript/Rust conformance exposes a concrete
  portable gap.

## Explicit Exclusions

- Transport capability as authorization.
- One protocol for all semantic owners.

## Required Outcomes

- Mixed versions degrade or fail explicitly.
- Unknown compatible fields survive relays where required.
- Language-neutral conformance fixtures are normative evidence.
- Supported version ranges, authoritative upgrade order, fresh-install
  defaults, and downgrade/rollback behavior are explicit.
- Negotiation declares a per-connection latency budget and cannot block the
  Gateway event loop or destabilize unrelated operations.

## Dependencies

- EC-001 for base peer identity semantics.

Pairing or trust owners may supply authenticated peer identity into
negotiation but are not prerequisites for base protocol/version negotiation.

## Proof and Deletion Gate

- Run fresh-install, upgrade, and downgrade between TypeScript and Rust peers
  across adjacent versions.
- Delete version inference from build/package identity.
- Disprove the separate contract if existing protocols already negotiate
  versions, extensions, unsupported behavior, and mixed-language compatibility
  without build/package inference.
