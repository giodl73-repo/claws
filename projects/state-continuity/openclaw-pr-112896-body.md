Related RFC: https://github.com/openclaw/rfcs/pull/46

Umbrella outcome: https://github.com/openclaw/openclaw/issues/114145

Non-normative host follow-on evidence (Microsoft access): https://microsoft.ghe.com/giodl/lobster/pull/51

Stacked on: https://github.com/openclaw/openclaw/pull/112865

Exact reviewed head: `5dc5e719e7a3ce3a6953cf3b0d89509543aa24ab`

## What problem this solves

A replacement Gateway must not accept work merely because SQLite files exist.
This PR restores only the exact accepted recovery point into fresh canonical
targets, closes work admission before startup, reconciles the scheduler and
required owners, commits generation-bound readiness evidence, and only then
releases admission.

It also proposes one concrete host-neutral observation seam:

```ts
gateway.restore.status({ restoreOperationId })
  -> { status: "not-restored" }
   | { status: "held", reason, retryAfterMs, ...restoreIdentities }
   | { status: "ready", ...restoreIdentities, schedulerIdentity,
       ownerReadinessIdentity, readinessIdentity }
```

The method follows the shipped `gateway.suspend.status` pattern: closed Gateway
Protocol schemas, `operator.read`, exact operation fencing, no mutation, and a
typed `UNAVAILABLE` conflict that does not disclose the active operation. It
projects the same in-memory restored-start object and operation-scoped SQLite
journal that own admission. It adds no status file, config key, public probe,
listener, sidecar, or caller-controlled `admit` method.

While restored admission is held, a new supervisor still needs to authenticate
before it can inspect this method. The exception is limited to OpenClaw's local,
device-less backend probe shape and is tracked as root work for the full
handshake. Nodes, browsers, device enrollment, remote clients, ordinary RPCs,
and every connection during restart drain remain blocked.

This is the destination slice of the scale-to-zero contract tracked in #114145.
It is motivated by skipped recurring work while Gateway is stopped (#104412),
unified recovery (#13616), and per-agent restore (#63392). It builds on Josh
Lehman's restart-recovery admission work (#111869), Vincent's SQLite snapshot
work, and Peter's cooperative suspension/status pattern.

## End-to-end contract

```text
accepted recoveryPointId + acceptanceSetId
  -> exact fresh-target restore
  -> held: scheduler-reconciliation
  -> held: owner-readiness
  -> held: ready-commit
  -> durable RestoredAdmissionReadyRecord
  -> release the same admission identity
  -> ready from gateway.restore.status
  -> host may deliver retained owner work
```

The host owns retained ingress, wake, placement, compute generations, and
delivery acknowledgement. OpenClaw owns component restore, scheduler/owner
readiness, the durable ready record, and opening its own work admission.

## Decisions requested

1. Accept the restored-admission ownership split above.
2. Accept `gateway.restore.status` as the small public observation seam, or ask
   us to remove/replace it before merge. The implementation is representative
   proof, not a claim that the public API is already owner-approved.
3. Keep the exact-operation mismatch fail-closed and identity-redacted.
4. Keep corrupt or contradictory durable records quarantined and temporary
   owner unavailability held.

## Real behavior proof

The underlying restored-start path was exercised on Ubuntu 24.04 WSL with Node
24.15.0: a two-owner recovery point was captured, restored through the hidden
CLI, started through the emitted descriptor, observed with work admission
closed, committed to one SQLite `ready` row, and then admitted. The Gateway shut
down cleanly.

On exact head `5dc5e719e7a3ce3a6953cf3b0d89509543aa24ab`, the restored-admission,
Gateway Protocol, and Admin HTTP matrix passes. The final suspension/handshake
rerun passes 51 tests across six Vitest projects. They cover:

- closed request validation and token bounds;
- ordinary, held, ready, invalid, and mismatched-operation results;
- mismatch identity redaction;
- scheduler, owner-readiness, and ready-commit phase projection;
- ready only after durable evidence and admission release;
- restored-fence reachability without opening unrelated methods;
- authenticated local probe reachability while nodes, enrollment, remote
  clients, and restart-draining connections remain blocked;
- root-work tracking across a concurrent restart during the probe handshake;
- core method descriptors and request-context wiring; and
- authenticated Admin HTTP method routing.

Exact command:

```text
pnpm test packages/gateway-protocol/src/gateway-restore.test.ts \
  src/gateway/server-methods/restore.test.ts \
  src/gateway/restored-admission.test.ts \
  src/gateway/server-methods.suspension-admission.test.ts \
  src/gateway/server-request-context.test.ts \
  src/gateway/server-methods-list.test.ts \
  src/gateway/methods/core-descriptors.since.test.ts \
  extensions/admin-http-rpc/src/handler.test.ts
```

The production core, core-test, and extension typecheck lanes also completed
without findings after rebasing onto current `main`. The extension-test lane
was still running when the local orchestrator timed out; CI is authoritative
for that lane and the packaged build.

The checked-in Swift and Kotlin Gateway clients were regenerated for the new
method, and the exact protocol-generation diff is stable. Targeted Oxfmt,
type-aware Oxlint, and `pnpm tsgo:core` pass. The full changed-test run passed
136 tests and hit one unrelated fake-timer prewarm assertion in an unchanged
test; that assertion passed immediately in isolation. Final `codex review
--uncommitted` reported no actionable regression.

## Merge gate

Ready for owner review, not owner-approved. Merge remains gated on Peter's
Gateway Protocol decision and the ownership split in openclaw/rfcs#46. The
stack's pre-existing private restored-start environment carrier also exceeds
main's current `OPENCLAW_*` count ratchet by one; that must be removed,
consolidated, or explicitly owner-resolved rather than hidden by raising the
budget.

This PR is one bounded implementation of #114145, not a mandate for this exact
decomposition. Retained ingress, Teams/API payloads, cron wake, placement, and
source destruction remain host-owned.
