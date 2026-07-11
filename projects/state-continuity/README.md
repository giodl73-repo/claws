# Runtime State Continuity Project

Use this area to define and prove OpenClaw's complete portable state contract:
state ownership, writer accounting, consistency, checkpoints, durable
publication, dirty/synced status, fencing, compatible restore, and safe
replacement.

## Objective

Replace Lobster's path discovery, persistence wrappers, restore ordering, and
private shutdown inference with OpenClaw-owned state semantics and host-owned
storage policy. `/synced` is the aggregate durability projection; safe shutdown
is one outcome, not the whole feature.

## Active Notes

| Area | File |
| --- | --- |
| Current session and resume state | `SESSION.md` |
| Original state audit definition | `../layering-contracts/state-continuity.md` |
| Synchronization hypothesis | `../layering-contracts/synchronization-model.md` |
| ProxyPipe lifecycle evidence | `../layering-contracts/inventory/proxy-pipe-frames-2026-07-10.md` |
| Portfolio deletion ledger | `../layering-contracts/lobster-deletion-ledger.md` |
| Snapshot project | `../snapshot/README.md` |

## Active Work

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `giodl73-repo/rfcs` | [Fork PR 3](https://github.com/giodl73-repo/rfcs/pull/3) | `user/giodl/rfc-state-continuity` at `b335298` | Draft, fork-only | Architecture review; ClawBus may carry publication without owning semantics. |
| `openclaw/rfcs` | [Snapshot RFC 20](https://github.com/openclaw/rfcs/pull/20) | Existing | Related | SQLite-safe component checkpoint primitive. |
| `bic/lobster` | TBD | `user/giodl/layering-contract-audit` | Evidence | Trace checkpoint, publication, shutdown, and restore behavior. |
| `openclaw/openclaw` | TBD | New isolated worktree | Discovery | Build the complete state owner/writer/path inventory. |

## Delivery Gates

1. Account for every OpenClaw and Lobster-copied state path and writer.
2. Classify state as durable, reconstructable, ephemeral, or secret.
3. Prove whether one runtime generation is valid or component watermarks are required.
4. Bind checkpoint, publication, restore, and destruction to runtime/checkpoint identity and manifest digest.
5. Execute drain, mutation race, checkpoint, publication, replacement, restore, corruption, quota, and incompatibility proofs.
6. Stage deletion of Lobster path-copy, restore-ordering, and private lifecycle code.

## Boundaries

OpenClaw owns state meaning, consistency, manifests, compatibility, restore
ordering, and continuity evidence. Lobster owns storage destination, encryption,
retention, scheduling, retries, and placement. Duplex Transport may carry a
publication call but does not own publication semantics.

## Related Areas

- `projects/layering-contracts/README.md`
- `projects/snapshot/README.md`
- `projects/duplex-transport/README.md`
- `projects/hosting-profiles/README.md`
