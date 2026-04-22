# SNA — HTTP API

**Sub-spec of**: [SN-snap.md](./SN-snap.md)

## Endpoints

### `GET /healthz`

Liveness probe. Returns 200 with:

```json
{
  "status": "ok" | "degraded" | "halted",
  "uptime": 123456,
  "state": "ready" | "init" | "promoting" | "rolling-back"
}
```

- `ok`: `state === 'ready'`
- `degraded`: `state === 'promoting' | 'rolling-back'`
- `halted`: `state === 'init'` after a failed rollback

### `POST /snap/promote`

Initiate a snapshot promotion. Body:

```json
{
  "snapshotId": "snap-2026-04-22-01",
  "artifact": "<base64-encoded policy IR blob>"
}
```

Returns 202 with the session id if the transition to `promoting`
succeeds, 409 if the daemon is already `promoting`, or 400 if the
artifact fails initial schema validation.

### `POST /snap/rollback`

Force a rollback to the prior snapshot. Body: none. Returns 202 or
409 (not in `ready` state).

### `GET /snap/current`

Returns the currently-active snapshot metadata:

```json
{
  "snapshotId": "snap-2026-04-22-01",
  "policyArtifactSha256": "<64 hex>",
  "promotedAt": 1714000000000,
  "previous": "snap-2026-04-21-03"
}
```

## SSE event stream — `GET /snap/events`

Server-Sent Events stream. Event types:

| Event | Payload |
|-------|---------|
| `state-change` | `{ from, to, timestamp }` |
| `promote-start` | `{ snapshotId, fromSnapshotId, timestamp }` |
| `promote-success` | `{ snapshotId, timestamp, durationMs }` |
| `promote-fail` | `{ snapshotId, reason, timestamp }` |
| `rollback-start` | `{ fromSnapshotId, toSnapshotId, timestamp }` |
| `drain-window` | `{ startMs, endMs, inflightCount }` — see [SNP](./SNP-promote.md) |

## Session lifecycle

Each SSE subscription is a session. Sessions reconnect automatically
on network disruption (standard SSE reconnect semantics). The server
replays any events missed during disconnect up to a configurable
buffer (default 100 events per session).

## Client contract

Clients MUST NOT cache state across reconnects — always fetch
`/snap/current` on reconnect to ensure they've not missed a rollback.
The SSE stream is advisory; the HTTP polled state is authoritative.
