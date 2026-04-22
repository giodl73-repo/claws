---
covers: [atom:SNS, atom:SNP]
---

# Snapshot lifecycle

The operator's guide to promoting and rolling back snapshots, with
pointers to the specs that govern each phase.

## Typical promote

```
  Build new policy-IR from updated workspace
       │
       ▼
  POST /snap/promote  ──┐
                        │
  Daemon transitions    │  STATE: ready → promoting
  to promoting          │
                        │
  Validate new artifact │  (fail → rolling-back)
       │                │
  Stage new snapshot    │  (drain mode: wait for in-flight)
       │                │
  Commit (atomic swap)  │  STATE: promoting → ready
       │                │
  onSnapshotPromoted    │  (host hook; non-blocking)
       │                │
  SSE: promote-success  │
```

## Watching promotes via SSE

```bash
curl -N http://localhost:8080/snap/events
```

Events stream as they happen:

```
event: state-change
data: {"from":"ready","to":"promoting","timestamp":...}

event: drain-window
data: {"startMs":...,"endMs":...,"inflightCount":3}

event: promote-success
data: {"snapshotId":"snap-2026-04-22-01","durationMs":847}
```

## Typical rollback

```
  POST /snap/rollback
       │
       ▼
  Daemon transitions to rolling-back  STATE: ready → rolling-back
       │
  Restore prior snapshot from disk
       │
  (fail → transition to init; halt serving)
       │
  Commit (atomic swap back)            STATE: rolling-back → ready
       │
  SSE: rollback-success
```

## Reading current state

```bash
curl http://localhost:8080/snap/current
```

Returns the active snapshot metadata, including `previous` (the
snapshot before the most recent promote — what rollback restores to).

## Non-uplift rules in practice

See [../specs/SNP-promote.md](../specs/SNP-promote.md) for the 4
formal rules. Operator-visible implications:

- **During `promoting`**: new requests get 202 + `Retry-After` (in
  drain mode) or proceed immediately under the NEW snapshot (in
  immediate mode)
- **In-flight calls**: ALWAYS finish against the snapshot they
  started under (Rule 1)
- **During `rolling-back`**: same holds — calls under B finish under
  B even though the daemon is rolling back to A

## Cross-references

- [../specs/SNS-state-machine.md](../specs/SNS-state-machine.md) —
  4-state formal model
- [../specs/SNP-promote.md](../specs/SNP-promote.md) — non-uplift rules
- [../specs/SNA-api.md](../specs/SNA-api.md) — HTTP + SSE surface
- [../pitfalls/promote.md](../pitfalls/promote.md) — common traps
