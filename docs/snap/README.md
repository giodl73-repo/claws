# @bic/openclaw-snap

Snapshot lifecycle daemon: manages the 4-state machine
(init/ready/promoting/rolling-back), exposes an HTTP API for operator
control, and implements the non-uplift semantics that keep in-flight
decisions safe across snapshot transitions.

## Two-letter code

**SN** — package primary. Sub-specs: **SNS** (state machine),
**SNA** (HTTP API), **SNP** (promote semantics).

## Stability and upstream

- **Stability tier**: Alpha
- **Upstream target**: `@openclaw/snap`

## Contents

### Specs

- [SN-snap.md](./specs/SN-snap.md) — primary spec
- [SNS-state-machine.md](./specs/SNS-state-machine.md)
- [SNA-api.md](./specs/SNA-api.md)
- [SNP-promote.md](./specs/SNP-promote.md)

### Guides

- [snapshot-lifecycle.md](./guides/snapshot-lifecycle.md)

### Pitfalls

- [promote.md](./pitfalls/promote.md)

### Scenarios

- [SNP/SC-01-promote-happy.md](./scenarios/SNP/SC-01-promote-happy.md)
- [SNP/SC-02-non-uplift.md](./scenarios/SNP/SC-02-non-uplift.md)
- [SNP/SC-03-drain-timeout.md](./scenarios/SNP/SC-03-drain-timeout.md)

## Quick links

- [ATOMS.md](./ATOMS.md) — atom registry
- [CHANGELOG.md](./CHANGELOG.md) — version history
- [specs/SN-snap.md](./specs/SN-snap.md) — primary spec
