# Runtime State Continuity Role Review

## Scope

Reviewed the revised RFC 0021 against RFC 0020 Hosted Integration using:

- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/lobster-container-eng.md`
- `.craft/roles/claws/platform-eng.md`
- `.craft/roles/claws/ciso.md`
- `.craft/roles/claws/founder.md`
- `.craft/roles/claws/lorant-reviewer.md`

The review tested the checkpoint/lifecycle model, CAPE operator projection,
Hosted Integration dependency, storage non-goals, credential boundary, and
Lobster Elastic scope.

## Gateway Runtime Owner

- Recurring capture must stay off message, agent, and tool-call hot paths.
- Capture needs bounded concurrency, timeout, cancellation, memory, disk, I/O,
  event-loop occupancy, and latency evidence.
- A periodic capture failure records degraded RPO but must not crash or stall
  Gateway admission.
- Restore, publication acceptance, generation authority, and
  `safeToDestroy` remain fail closed.

**Finding:** proceed only with explicit runtime budgets and scoped fail modes.
Reject per-tool-call continuity hooks or unbounded in-process copies.

## Lobster Container Operator

- Restore and migration can dominate cold start even when provisioning is fast.
- The host must declare and observe wake/restore SLO without weakening
  validation.
- Writable sidecars, Channel deliveries, API writes, and workspace PATCH
  operations must drain or be fenced before final capture.
- Restored state and dependency resolution must precede user-facing sidecar
  readiness.
- Same-image wake should not copy or migrate state unnecessarily.

**Finding:** the lifecycle ordering is sound after adding closed-state final
capture, owner-specific write blockers, startup ordering, and phase timing.

## Platform Operator

- CAPE must be one enforceable operator setting with machine-readable effective
  posture.
- Status and stable reason codes must support managed configuration, fleet
  drift, canary upgrade, and compliance aggregation.
- Mixed-version migration needs one authority per runtime, shadow comparison,
  mismatch telemetry, explicit fallback expiry, and per-runtime rollback.

**Finding:** approve CAPE as an operator projection, not an implementation
structure. Keep fleet tooling outside continuity authority.

## Security

- Host-managed credentials and short-lived tokens must never enter recovery
  artifacts.
- Captured runtime-owned identity requires explicit classification, external
  key authority, destination authorization, redaction, and audit.
- Generation loss must stop admission, cancel work, reject final publication,
  and terminate.
- Elastic needs a durable quarantine state that disables wake and new
  generation grants while preserving evidence and retained work.
- Destruction authorization, degraded fallback, quarantine, wake, and
  destructive lineage reset require identity-bound audit facts.

**Finding:** approve after adding identity-artifact controls and zero-compute
quarantine. Do not let disaster reset bypass quarantine.

## Community And Simplicity

- Conventional must remain today's behavior with no required host, config, or
  runtime overhead.
- Archived must work with a local publication binding and remain fully
  reversible.
- Generation and fencing concepts begin at Portable, not Archived.
- CAPE may be one setting, but the implementation remains independent
  checkpoint, publication, restore, lifecycle, and wake capabilities.
- Third-party capture registration is deferred; V1 covers core state surfaces.

**Finding:** the model remains a natural OpenClaw extension if lower CAPE levels
stay host-independent and remote storage remains optional.

## Maintainer Review

- RFC 0021 correctly follows Hosted Integration instead of creating a second
  bundle, binding resolver, readiness system, status inventory, generation
  model, or carrier.
- Final handoff now unambiguously completes clean shutdown before closed-state
  capture; online capture is periodic only.
- Publication replay uses the same checkpoint identity and manifest digest;
  uncertain timeout cannot create a new checkpoint and infer failure.
- Elastic wording is limited to Lobster's first proven wake sources: durable
  Teams, host/API, and cron.
- Exact operation names remain deferred, but the normative seam reuses
  `gateway.suspend.*`, normal close, and a continuity-owned publication
  capability rather than a second drain authority.

**Finding:** approve the paper architecture. Before implementation, the first
slice must prove the exact state inventory and local Archived round trip.

## Cross-Role Decisions

Approved:

- no live-storage redesign, global consistency, global mutation generation, or
  `/synced`;
- no runtime-wide pause for periodic capture;
- no credential backup;
- Hosted Integration as prerequisite wiring and PR pattern;
- CAPE as one operator projection;
- restored readiness and generation fencing fail closed;
- periodic capture failure is bounded and does not crash/stall the runtime;
- closed-state final capture after clean shutdown;
- wake SLO is host-declared and measured;
- writable owner surfaces participate in drain through their own lifecycle;
- zero-compute quarantine;
- fleet-consumable Status/Doctor and auditable lifecycle facts.

Still requires evidence:

- complete core state-surface inventory and treatment;
- runtime/memory/I/O budget for online capture;
- local publication and restore round trip;
- Lobster cold-start restore phase budget;
- exact `gateway.suspend.*` extension/close orchestration;
- identity-artifact threat model if any non-reconstructable runtime identity is
  captured; and
- mixed-version shadow migration and private-path deletion proof.

## Cheapest Design-Only Evidence Slice

Create one paper fixture for Archived on a local volume:

1. enumerate core state surfaces;
2. classify each as captured, reconstructed, external, or ephemeral;
3. record native capture and restore ordering;
4. produce one manifest and exact local publication receipt;
5. restore onto a clean directory with host-managed credentials absent;
6. hold readiness until validation completes;
7. inject digest conflict, uncertain timeout, corruption, missing dependency,
   and incompatible schema; and
8. show the Status and Doctor output.

This proves the recovery substrate before Portable or Elastic lifecycle work.
