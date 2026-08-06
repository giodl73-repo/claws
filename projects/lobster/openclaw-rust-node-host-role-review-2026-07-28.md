# Rust Node Host Proposal Role Review

Date: 2026-07-28  
Proposal: `openclaw-rust-node-host-proposal.md`

## Lenses

- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/lobster-container-eng.md`
- `.craft/roles/claws/ciso.md`
- `.craft/roles/claws/founder.md`

## Accepted findings

1. Narrow the Lobster deletion claim. The proposal can remove a Node/Bun
   node-host process for adopted commands, not every Lobster HTTP, SSE, state,
   or hosted-integration sidecar.
2. Classify real Lobster operations before selecting the node protocol. Local
   paired capabilities fit nodes; credentials, durability, fleet authority,
   and provider dispatch remain host-provider or owner APIs.
3. Treat embedding as a fault-isolation tradeoff. Add bounded queues and
   outputs, handler failure containment, activation ordering, and explicit
   readiness semantics.
4. Make credential custody a first-class embedding contract with platform
   keystores or an embedding-owned vault and a hardened file fallback.
5. Require an upstream-owned execution-policy corpus before claiming
   `system.run` parity. Wire-schema parity alone is insufficient.
6. Pin and integrity-check the generated protocol schema rather than trusting a
   mutable CI download.
7. Clarify idempotency: the client does not replay automatically; handlers own
   durable deduplication when their command supports retries.
8. Require a named upstream maintainer and release owner before applying the
   official support label.
9. Collapse the first evidence slice to one crate. The multi-crate layout is a
   target architecture, not a prerequisite.
10. Add measurable Lobster ready-time, RSS, reconnect, and failure-recovery
    gates.

## Findings not accepted as stated

- A review claimed the Linux Rust companion did not exist. Live
  `openclaw/openclaw` main on 2026-07-28 contains `apps/linux/src-tauri` with
  Rust Gateway WebSocket, TLS pinning, Ed25519 identity, reconnect, and pairing
  code. The local catalog worktree used by that review was stale.
- A review claimed OpenClaw accepts only protocol v4 for nodes. The published
  `@openclaw/gateway-protocol` documentation explicitly distinguishes general
  clients from authenticated nodes and exposes `MIN_NODE_PROTOCOL_VERSION` for
  the supported N-1 rolling-upgrade window. The proposal now names those
  authoritative constants instead of describing a generic negotiation rule.
- A review requested Rust-specific audit and fleet-kill semantics beyond the
  current node contract. The proposal instead requires parity with the
  upstream reference and forbids a weaker Rust fail-open path. New audit or
  revocation semantics belong in OpenClaw first.

## Remaining owner decisions

- repository placement and naming;
- support and release ownership;
- conformance artifact publication;
- V1 command subset;
- whether the Linux companion later consumes the shared crates;
- exact Lobster process and workaround deletion target.
