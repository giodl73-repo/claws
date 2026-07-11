# Duplex Transport Project

Use this area to extend `OpenClawTransport` and Gateway peer invocation with a
least-privilege host-provider role, then retire portable ProxyPipe semantics
without upstreaming Lobster's private wire format.

## Objective

Prove one bounded runtime-to-host provider over shared OpenClaw transport
machinery, with identity, permissions, generation fencing, overload behavior,
typed failures, and reusable TypeScript/non-TypeScript conformance.

## Active Notes

| Area | File |
| --- | --- |
| Current session and resume state | `SESSION.md` |
| ProxyPipe semantic and transport decomposition | `proxypipe-decomposition.md` |
| Candidate design and completed gates | `../layering-contracts/duplex-transport.md` |
| OpenClawTransport fit audit | `../layering-contracts/inventory/proxypipe-openclaw-transport-fit-2026-07-10.md` |
| `node.invoke` reuse decision | `../layering-contracts/inventory/node-invoke-duplex-fit-2026-07-10.md` |
| Hosted peer identity decision | `../layering-contracts/inventory/hosted-peer-identity-2026-07-10.md` |
| ProxyPipe frame inventory | `../layering-contracts/inventory/proxy-pipe-frames-2026-07-10.md` |
| Portfolio deletion ledger | `../layering-contracts/lobster-deletion-ledger.md` |

## Active Work

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `giodl73-repo/rfcs` | [Fork PR 2](https://github.com/giodl73-repo/rfcs/pull/2) | `user/giodl/rfc-duplex-transport` at `ade8ddc` | Draft, fork-only | Architecture review before upstream submission. |
| `bic/lobster` | TBD | `user/giodl/layering-contract-audit` | Evidence | Decompose ProxyPipe and select a portable provider. |
| `openclaw/openclaw` | TBD | New isolated worktree | Discovery | Audit provider/secret seams and shared peer-invocation extraction. |

## Delivery Gates

1. Select one portable bounded unary provider, not a Lobster convenience call.
2. Prove it cannot be modeled by an existing Gateway, Channel, plugin, or
   AgentHarness contract.
3. Define the exact shared machinery extracted from `node.invoke` without
   changing node wire behavior.
4. Prove least-privilege admission, generation rollover, timeout, overload,
   idempotency, disconnect, and late-result behavior.
5. Run the same conformance fixtures against TypeScript and Rust providers.
6. Map and delete the corresponding ProxyPipe frame family.

## Boundaries

Channels own messages, Gateway owns approvals and lifecycle APIs, AgentHarness
owns execution events, and Runtime State Continuity owns publication meaning.
Duplex Transport carries typed host-service calls; it does not absorb those
semantics.

## Related Areas

- `projects/layering-contracts/README.md`
- `projects/hosting-profiles/README.md`
- `projects/state-continuity/README.md`
