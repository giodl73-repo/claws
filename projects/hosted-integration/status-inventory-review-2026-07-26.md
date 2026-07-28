# Read-Only Status Inventory Review

## Thesis And Deletion Target

The independently useful slice is not a second hosted-status framework. It is
one read-only operator view over the canonical runtime-inventory branch's lifecycle-owned,
registry-scoped `host-integration-runtime-inventory/v1` projection.

This deletes the architectural need carried by old fork PR 46 for a duplicate
`host-integration-status/v1` schema and global mutable owner-evidence snapshot.

## Source Audit

- The runtime-inventory branch already owns bounded readiness callbacks, sanitization, aggregation,
  and immutable inventory construction.
- Gateway request context already carries lifecycle state through explicit
  accessors; the new accessor returns the current registry without discovery or
  activation.
- `status --json` already talks to the probed Gateway and already omits optional
  deep fields when unavailable.

## Bounded Evidence Slice

Fork draft PR 177 at `5bdb4354da1` adds `hostIntegration.status` with `operator.read`, rejects
all parameters, and returns `UNAVAILABLE` when no lifecycle registry exists.
The CLI asks only after a Gateway probe succeeds and includes `hostIntegration`
only when the returned inventory contains bundles, preserving the ordinary
installation JSON shape.

The slice deliberately adds no Doctor/health/startup policy, local plugin load,
extra readiness probing, carrier registration, or live service ownership.

## Evidence

- 46 focused tests across the handler, CLI runtime/payload, and method catalog
  behavior.
- Core and core-test TypeScript graphs, type-aware Oxlint, formatting, diff
  hygiene, and the full OpenClaw build pass.
- `codex review --uncommitted` reported no actionable correctness defects.
- The emitted build contains the lazy `hostIntegration.status` Gateway chunk.

## Cross-Repository Proof

Lobster fork draft PR 50 at `15bb845c56` starts a real token-authenticated
Gateway from OpenClaw head `5bdb4354da1`, loads the packaged `lobster-host`
plugin, calls the operator-read RPC, and receives the canonical versioned
inventory. Hosted carrier activation remains intentionally outside this
read-only package.
