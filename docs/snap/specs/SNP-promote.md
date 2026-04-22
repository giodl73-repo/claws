# SNP — Promote semantics

**Sub-spec of**: [SN-snap.md](./SN-snap.md) · **Absorbs**: CL-07 Amendment B

## The 4 non-uplift rules

When a promote takes the system from `snapshot A` to `snapshot B`, the
runtime MUST enforce these four invariants:

### Rule 1 — In-flight decisions complete against pre-promote snapshot

A request that entered `preAuthorize` against snapshot A completes its
entire decision lifecycle (including review if any) against snapshot
A's policy. A promote mid-flight does NOT re-evaluate the decision
against the new snapshot.

**Rationale**: reviewer saw snapshot-A's policy and descriptor.
Swapping in B mid-flight means the reviewer's approval no longer
reflects what the runtime enforces — chain integrity broken.

### Rule 2 — New decisions use new snapshot

Any request arriving at `preAuthorize` after the promote commit
point sees snapshot B immediately. There is no "keep serving A
for N more seconds" gracePeriod (it would open a race window).

### Rule 3 — Rollback cannot reduce protection mid-flight

If a rollback moves from `snapshot B` back to `snapshot A`, decisions
that were under B's stricter policy (R5 with review) cannot be
silently reclassified under A's looser policy (R3 with allow). Any
in-flight B-decision runs to completion under B; it does NOT revert.

### Rule 4 — Uplift drain is a host-policy choice

When the new snapshot UPLIFTS a tier (R3 → R5), the host must decide:

- **Drain**: wait for all in-flight R3 calls to complete, then
  promote. `DrainEntry` records the drain-window boundaries.
- **Immediate**: promote instantly; any in-flight R3 calls continue
  under A (per Rule 1).

The choice is configured in the snap daemon's startup config
(`uplift_mode: 'drain' | 'immediate'`). The default is `drain` —
conservative.

## Drain window

During a `'drain'` promote:

1. Daemon transitions `ready → promoting`
2. New requests are held (202 with `Retry-After: 1` or equivalent
   host signal)
3. Daemon watches the in-flight-decision counter; when zero, step 4
4. Commit the promote; emit `DrainEntry`; transition to `ready`
5. Resume serving

The drain has a host-configured timeout (default 60s). On timeout,
the host decides: continue waiting, or abort the promote and
rollback.

## Hung `onSnapshotPromoted` hook

Hosts can register `onSnapshotPromoted(snapshotId, fromSnapshotId)`
hooks. A hook that blocks or throws does NOT block the promote
transition — the state machine has already committed. But it DOES
block traffic if the host uses the hook return as a "ready to
resume" signal.

See [../pitfalls/promote.md § Hung hook](../pitfalls/promote.md) for
the mitigation.

## Commit point

The promote is ATOMIC at the commit point: the swap from "A is
active" to "B is active" in memory is a single reference assignment
(JS single-threaded). There is no moment where both are active or
neither is active. This matters because it's what makes Rule 1 +
Rule 2 implementable without races.

See [../scenarios/SNP/](../scenarios/SNP/) for the concrete
scenarios that verify these rules.
