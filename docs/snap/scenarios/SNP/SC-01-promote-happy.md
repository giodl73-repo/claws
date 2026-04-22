---
covers: [atom:SNP/non-uplift]
---

# SC-01 · SNP promote happy path

**Series**: SNP · **Runner**: e2e-loop-sim

## Setup

Daemon in state `ready` with snapshot A active. No in-flight calls.

## Input

`POST /snap/promote` with snapshot B artifact (valid schema).

## Expected

- State transitions: `ready → promoting → ready`
- SSE events: `state-change`, `promote-start`, `promote-success`
- `GET /snap/current` returns B with `previous: A`
- Next `preAuthorize` sees B's policy

## Proves

The clean promote path works. Atomic swap, correct SSE sequence,
correct state transition log.
