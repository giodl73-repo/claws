# E4b: Lobster continuity restore hold

## Outcome

Implement E4a in Lobster's launcher owner so managed restore can safely claim
and assemble original runtime paths.

## Repository and dependencies

- Repository: `bic/lobster`
- Depends on: E4a and F1

## Change

- Persist the non-expiring hold in the stable tenant/user workspace owner
  generation, not a pod, process, worker, or container identity.
- Make acquisition atomic with start admission after proving no runnable
  Gateway incarnation remains.
- Fence runtime-side chat, Teams, cron, diagnostics, scheduler, and warm-up
  start fan-in.
- Fence adapter-side HTTP, gRPC, reset, health-recovery, and direct
  `start_openclaw_if_needed` spawn fan-in.
- Commit only the exact continuity receipt and admit one matching restored
  startup.
- Register the implementation in a new `lobster-host` snapshot and project its
  required posture through `lobster/managed`, Status, Doctor, and audit.

## Non-goals

- No reuse or hardening of the advisory proxy-pipe owner lease.
- No TTL, Redis fail-open behavior, or automatic reopening after failure.
- No restore materialization or claim/assembly journal.
- No provider-dispatch, reverse-carrier, or ProxyPipe authority change.

## Proof and exit

- Concurrent hold acquisition and every start source produce one admitted
  authority, never both.
- Lobster process, adapter, and container restarts preserve the held state.
- Store unavailability, unknown authority, and stale owner generations block
  every start path with one structured recovery-in-progress result.
- A mismatched receipt, ordinary start, duplicate consume, or stale generation
  cannot clear or consume `restore-committed`.
- Before the first target claim, explicit cancel returns to `runnable`; after
  publication begins, only same-identity resume or quarantine is available.
- Conventional tenants without the selected lifecycle implementation retain
  current startup behavior and pay no restore-hold lookup.
