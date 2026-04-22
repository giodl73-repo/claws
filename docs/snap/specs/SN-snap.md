# SN — @bic/openclaw-snap (primary spec)

**Status**: Alpha · **Upstream target**: `@openclaw/snap`

## Package overview

The snap package is the snapshot-lifecycle daemon. It tracks which
policy artifact is "active" at any moment, promotes new artifacts
atomically, rolls back on failure, and enforces the non-uplift rules
that prevent in-flight decisions from being silently upgraded to a
stricter policy mid-flight.

## Exported subpaths

| Subpath | Exports |
|---------|---------|
| `/state` | `SnapState`, `SnapStateMachine`, `SnapStateError` — see [SNS](./SNS-state-machine.md) |
| `/api` | HTTP route handlers, `createSnapServer`, session lifecycle — see [SNA](./SNA-api.md) |
| `/promote` | `promote(fromSnapshot, toSnapshot)`, non-uplift rules — see [SNP](./SNP-promote.md) |
| `/events` | SSE event emitter for state transitions |

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **SNS** | [SNS-state-machine.md](./SNS-state-machine.md) | 4 states, valid transitions, error on invalid |
| **SNA** | [SNA-api.md](./SNA-api.md) | HTTP endpoints, SSE shape, session contract |
| **SNP** | [SNP-promote.md](./SNP-promote.md) | 4 non-uplift rules + drain window |

## Stability contract

Alpha. HTTP API routes are stable; state-machine transition diagram
is stable; promote-rule surface is stable.
