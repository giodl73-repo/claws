# Cron Projection Cancellation Boundary

## Decision

Split the remaining PR 6A work at the durable cancellation boundary:

1. Lobster projection journal: durable `prepare`, `commit`, and `abort` CAS
   arbitration, stacked on fork PR 39.
2. Baked OpenClaw plugin plus bounded host protocol adapter, stacked on the
   journal transaction PR.
3. Production route/bootstrap and per-user ECS projection only after the
   storage account, region-pinned origin, and container-scoped authentication
   choices are owner-reviewed.

This preserves one reviewer-visible invariant per PR and avoids presenting an
unbootstrapped HTTP route as live production wiring.

## Required Invariant

An OpenClaw `cron_reconciled` observation is not authoritative merely because
the host received an HTTP request. The adapter first durably prepares an
attempt. Commit and abort then race on the same permanent Blob ETag:

- commit wins: the replacement receives the next monotonic accepted revision;
- abort wins: the pending attempt is removed and can never later commit;
- a newer prepare wins: the older attempt is superseded and must reread
  OpenClaw;
- transport disconnect alone grants no authority.

The pending attempt is shared permanent state, never pod-local correctness
state, so a request landing on another runtime pod sees the same winner.

## Payload Boundary

The eventual plugin/endpoint carries only bounded scheduling facts:

- job identifier;
- enabled state;
- next-run timestamp;
- projection attempt identifier and expected accepted revision.

It does not carry job definitions, prompts, credentials, actions, or execution
authority. OpenClaw remains the scheduler and executor.

## Rollout Boundary

The plugin must ship baked-disabled and be enabled only by an explicit
per-user ECS rule projected through the shared managed Gateway start path. A
missing/stale ECS decision, endpoint, region-pinned origin, scoped token, or
permanent journal must fail to no new sleep/destruction authority.

## Evidence

The transaction slice must prove:

- prepared state is not returned by accepted-state reads;
- matching commit is monotonic and replayable;
- abort before acceptance makes a stale commit impossible;
- a newer prepare supersedes the old attempt;
- concurrent commit/abort has exactly one durable winner;
- legacy PR 39 accepted receipts remain readable.
