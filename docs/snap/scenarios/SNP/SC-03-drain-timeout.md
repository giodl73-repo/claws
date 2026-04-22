---
covers: [atom:SNP/non-uplift]
---

# SC-03 · SNP drain timeout

**Series**: SNP · **Runner**: e2e-loop-sim

## Setup

Daemon in `ready` with `uplift_mode: 'drain'`, `drain_timeout_ms:
500`. An in-flight review has been pending for 2 seconds.

## Input

Operator triggers `POST /snap/promote` for snapshot B.

## Run

Daemon transitions `ready → promoting`. New requests held. Drain
counter is 1 (one in-flight call). After 500ms, drain window times
out.

## Expected

- `DrainEntry { timedOut: true, inflightAtTimeout: 1 }` appended
- Daemon host-policy decides; default: abort promote
- State transitions: `promoting → rolling-back → ready`
- SSE events include `drain-window { timedOut: true }` and
  `promote-fail`
- `GET /snap/current` still returns A (promote aborted)

## Proves

Drain timeout is observable; abort-on-timeout default keeps the
system on the known-good snapshot.
