# SNS — State machine

**Sub-spec of**: [SN-snap.md](./SN-snap.md)

## 4 states

```
    init ───(load-snapshot)──▶ ready
     ▲                           │
     │                       promote()
     │                           │
     │                           ▼
  (rollback-                promoting
   restart)                  │       │
     │                     ok│     fail│
     │                        ▼       ▼
     └──────(restore)── rolling-back  ready'
```

| State          | Meaning                                    |
| -------------- | ------------------------------------------ |
| `init`         | Daemon started, no snapshot loaded yet     |
| `ready`        | A snapshot is active and serving requests  |
| `promoting`    | A new snapshot is being validated + staged |
| `rolling-back` | A promote failed, restoring prior snapshot |

## Valid transitions

| From           | To             | Trigger                                                      |
| -------------- | -------------- | ------------------------------------------------------------ |
| `init`         | `ready`        | Load snapshot from disk on boot                              |
| `ready`        | `promoting`    | `promote()` call from operator                               |
| `promoting`    | `ready`        | Validation + staging succeeded                               |
| `promoting`    | `rolling-back` | Validation or staging failed                                 |
| `rolling-back` | `ready`        | Prior snapshot restored                                      |
| `rolling-back` | `init`         | Prior snapshot also failed to restore — daemon halts serving |

Every other transition is invalid and raises `SnapStateError`.

## `SnapStateError`

```ts
class SnapStateError extends Error {
  readonly from: SnapState;
  readonly to: SnapState;
  readonly attempted: string; // the method called, e.g. 'promote'
}
```

Thrown synchronously at the state-machine boundary. Calling
`promote()` while already `promoting` → `SnapStateError { from:
'promoting', to: 'promoting', attempted: 'promote' }`.

See [../pitfalls/promote.md](../pitfalls/promote.md) for the common
paths into an `SnapStateError`.

## Persistence contract

State is persisted to disk on every transition into
`/var/lib/claws/snap-state.json`. On boot, the daemon reads the
persisted state and resumes:

- `ready` → reload the named snapshot, transition to `ready`
- `promoting` → the prior promote was interrupted; transition to
  `rolling-back` automatically, restore prior snapshot
- `rolling-back` → the prior rollback was interrupted; retry restore

The daemon NEVER boots directly into `promoting` — there's no safe
way to continue a half-completed promote from a cold start.
