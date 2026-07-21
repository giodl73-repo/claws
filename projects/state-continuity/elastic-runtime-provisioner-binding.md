# Elastic Runtime Provisioner Binding

## Frame

### Falsifiable thesis

Production `ElasticRuntimeProvisioner` can remain a narrow Lobster adapter over
the already-proven E6d preparation, E4d restore, and same-start OpenClaw
readiness transaction if:

1. `ContainerSession` supplies the existing identity, proxy, and post-start
   pipe lifecycle around the exact-route restored start;
2. destination paths and restore policy are adapter-owned and deterministic;
3. the durable restore hold retains the exact OpenClaw-authored ready evidence
   before the provisioner returns; and
4. retries inspect that durable evidence and never repeat a completed restore.

This is false if a coordinator retry after Gateway success must infer readiness
from process health, call a new OpenClaw endpoint, or rerun preparation/restore
to recover the lost response.

### V1 boundary

- Plex remains the only production host implementation.
- The existing `EnsureRuntimeReady`, `prepare_and_execute_continuity_restore`,
  `/openclaw-gateway/start`, and restored-startup protocol remain the complete
  operation chain.
- No new Elastic host method, public Gateway API, sidecar, polling loop,
  provider-neutral restore abstraction, or caller-selected filesystem path.
- The existing promotion gate remains closed until the paired OpenClaw and
  Lobster images are deployed together.

### Deletion target

Delete:

- the fake-only `ElasticRuntimeProvisioner` implementation gap;
- host inference from Gateway process or health state;
- any proposal to retry an already-completed restore after a lost response;
- duplicated Gateway-start option and proxy-pipe lifecycle outside
  `ContainerSession`.

## Audit

### Source-backed facts

- `ensure_runtime_ready` durably grants one destination generation before
  calling `ElasticRuntimeProvisioner`.
- Its provision request carries the destination generation and accepted
  recovery identity, but the trait has no production implementation.
- `PlexAdapter::prepare_and_execute_continuity_restore` already performs
  preparation, restore, exact-route Gateway start, strict restored-result
  validation, and durable restore-hold transitions under one allocation.
- The paired Linux proof demonstrates that OpenClaw emits exact
  `continuity-restored-startup-result/v1` success before `[gateway] ready`, and
  Lobster returns `RestoredReady`.
- `ContainerSession`, not `PlexAdapter`, owns normal Gateway-start identity and
  proxy overlays plus required post-start proxy-pipe establishment.
- The handoff hold already retains the full immutable publication provider and
  acceptance needed to build preparation inputs.
- `ContinuityRestoreHoldStore` persists restored admission identity after
  success, but its public snapshot retains no OpenClaw readiness generation or
  recovery-point result.
- The current exact-route composition sets restored startup's
  `destinationRuntimeGeneration` from the E4 restore result's
  `ownerGeneration`. That field is the fixed continuity lifecycle owner
  generation, not the E6c destination runtime generation. Production binding
  must thread the granted destination generation separately; it must not
  reinterpret the existing E4 authority field.
- Proxy-pipe state is process-local and the current Gateway start response does
  not identify the exact child incarnation. Retained continuity readiness alone
  cannot prove that the same child is still running after coordinator recovery.

### Disproved thin-wrapper hypothesis

A direct implementation that merely calls
`prepare_and_execute_continuity_restore` is not replay-safe.

Failure window:

```text
OpenClaw emits exact ready result
  -> Lobster marks restore hold Runnable
  -> process dies before handoff complete_ready
  -> EnsureRuntimeReady retries the same destination generation
```

At that point the handoff still says `Provisioning`, while the restore hold says
`Runnable`. The original OpenClaw readiness result is no longer available to
the coordinator. Rerunning restore is invalid, and process health cannot
reconstruct `readinessGeneration`.

### Required ownership boundaries

- The handoff hold owns wake request coalescing and destination generation.
- The restore hold owns exact destination restore/start progress and must retain
  the exact service-authored ready result needed for replay.
- `ContainerSession` owns Gateway-start overlays and proxy-pipe lifecycle.
- OpenClaw remains the sole author of scheduler, owner, Gateway, and admission
  readiness evidence.

## Compare

### Internal analogues

| Analogue | Decision | Reason |
| --- | --- | --- |
| Handoff wake operation | Reuse | It already coalesces callers onto one destination generation and records final readiness only after provisioning returns. |
| Restore hold exact replay | Adapt | Retain the exact OpenClaw ready evidence beside the restored admission so a lost provisioner response can replay without mutation. |
| E4d preparation/restore replay | Reuse | Unknown outcomes retry only on the same route and same request before completion is known. |
| `ContainerSession` start overlay | Reuse | It is the existing owner of user/agent identity, proxy minting, and pipe lifecycle. |
| `SandboxProvider` abstraction | Avoid for V1 | Restore is currently Plex-specific and adding a provider-neutral restore contract would generalize ahead of a second implementation. |
| New readiness fetch endpoint | Avoid | It would create a second authority path and make host polling part of correctness. |

### External comparators

- Kubernetes controllers reconcile durable desired and observed state and
  report completion back to the shared authority. The useful precedent is that
  retries observe persisted state rather than rerunning completed external
  mutations.
- Kubernetes readiness gates treat missing application-owned conditions as
  false. The useful precedent is fail-closed conjunction, not host synthesis.
- systemd `READY=1` is service-authored. The manager consumes the service's
  completion assertion rather than reconstructing internal startup state.

OpenClaw/Lobster is stricter because the retained ready assertion is bound to
the exact destination generation, recovery point, restore receipt, admission,
and canonical readiness generation.

## Evaluate

### Gateway runtime owner

- No new OpenClaw code path is required for production binding.
- Ordinary startup and steady-state request latency remain unchanged.
- A retry must consume retained evidence; it must not ask a running Gateway to
  re-author readiness.

### Lobster container owner

- Blocking: production restore must enter through `ContainerSession` so the
  restored start gets the same identity/proxy overlay and post-start pipe
  establishment as ordinary user starts.
- Blocking: do not duplicate `overlay_start` or
  `ensure_pipe_after_start_with_policy` in the provisioner.
- Required proof: pipe failure after restored Gateway readiness remains a
  provisioning failure and does not complete the handoff wake operation.

### Security owner

- Destination archive, materialization, and journal paths must derive from one
  fixed adapter-owned private root plus the granted destination generation.
- Authorized publication roots are deployment policy, never request input.
- The provisioner must re-read provider/acceptance from the durable handoff and
  match every identity in `ElasticProvisionRequest` before mutation.
- Retained ready evidence contains identities and bounded metadata only, never
  credentials, payloads, prompts, or restored file paths.

### Platform operator

- Keep the current promotion gate fail-closed and enable it only after the
  paired image rollout.
- Expose stable phases from the two existing authorities:
  `requested`, `provisioning`, `preparing`, `restoring`, `starting`,
  `ready`, or `quarantined`.
- A retry against an in-flight exact destination returns `Pending`; a retry
  against retained exact ready evidence returns `Ready` without allocation.

### Skeptical simplicity review

The smallest truthful change is two narrow ownership additions:

1. retain exact ready evidence in the existing restore hold; and
2. add a `ContainerSession` restored-provision entry point that delegates to
   the existing Plex exact-route operation and shared pipe lifecycle.

A generic provisioner registry, new host method, readiness query, or new
durable record would add authority without closing another failure window.

## Revised V1 Contract

### Durable destination result

The restore hold's successful restored `Runnable` state retains a bounded exact
ready result. Retaining the existing strict
`ContinuityRestoredStartupSuccess` value is simpler and safer than defining a
second partial schema. It also retains one adapter-authored
`gateway_incarnation_identity` that identifies the exact child start which
emitted that result.

```text
continuity-restored-startup-result/v1 success
```

The values are copied only after the complete strict OpenClaw result has
matched the dispatched evidence. Exact replay may return the same value only
after an idempotent start fan-in confirms the same Gateway incarnation and
`ContainerSession` re-establishes the required proxy pipe. Conflicting
identities, result bytes, or child incarnation fail closed.

This requires `continuity-restore-hold/v2` on the existing key. Rollout is
two-phase:

1. deploy readers that accept v1 and v2 while preserving v1 on ordinary and
   legacy transitions; then
2. after every writer is upgraded, enable Elastic activation, whose exact
   restored completion is the first transition that requires and writes v2.

Old code rejects v2 through its current version-mismatch path, so no v2 record
may be written while an old writer can still own the key. New code should use a
distinct unsupported-version error for versions other than v1/v2 rather than
classifying schema incompatibility as Redis unavailability. A legacy v1
restored `Runnable` record has no replayable readiness and cannot be promoted
to Elastic ready.

The redacted status snapshot should remain redacted. Add a separate internal
exact inspection result for the provisioner rather than exposing the full
ready record through general Status/Doctor projection.

### Destination generation binding

`ContinuityPreparedRestoreInputs` carries the E6c-granted
`destination_runtime_generation` separately from E4's lifecycle
`owner_generation`. `ContinuityRestoredStartupBinding` uses the granted value
for the descriptor's `destinationRuntimeGeneration`; the restore request and
result keep their existing owner-generation semantics.

The production provisioner derives stable `restore_identity` and
`preparation_identity` values from the owner, destination generation, recovery
point, and manifest. An exact internal restore-hold inspection may compare
those identities to classify the same attempt as `Pending`; it never parses
authority back out of an identity string.

### Concrete provisioner

A Plex-only runtime object composes:

- the existing `PlexAdapter`;
- the current `ContainerSession`;
- one fixed private continuity layout/policy; and
- the durable handoff and restore authorities already injected into the
  adapter.

On each call it:

1. validates the requested destination generation and recovery identity against
   the current durable handoff;
2. inspects the destination restore hold;
3. when exact retained readiness exists, performs an idempotent
   `ContainerSession` start fan-in with the retained Gateway incarnation as an
   expected identity, requires the adapter to reject mismatch before spawn,
   re-establishes the required proxy pipe, and only then returns retained
   `Ready`;
4. returns `Pending` if the same exact destination is already preparing,
   restoring, or starting;
5. derives private destination paths and fixed publication-root policy;
6. calls the existing preparation/restore/start transaction through a
   `ContainerSession`-owned overlay;
7. establishes the required proxy pipe;
8. durably retains the exact OpenClaw ready result plus the Gateway incarnation
   returned beside it, without recomputing the identity later; and
9. returns that projection for `complete_ready`.

It never replaces the granted destination generation, re-resolves after the
exact route is selected, or turns a different in-flight generation into
success.

### Gateway incarnation fence

`GatewayStartResponse` gains one optional adapter-authored child-incarnation
identity for rolling compatibility. Paired activation requires it to be
present. The adapter already owns:

- `process_meta::boot_id()`, which changes on adapter restart; and
- `gateway_lifecycle_generation`, which increments on every fresh tracked
  Gateway spawn and remains unchanged on the healthy already-running path.

Define the identity as a versioned SHA-256 over the adapter boot ID and lifecycle
generation. This reuses existing lifecycle ownership rather than introducing
another mutable counter. The field asserts only child identity; it does not
assert continuity readiness.

Initial restored completion stores the identity returned beside the OpenClaw
success. Replay supplies that retained value as
`expected_gateway_incarnation_identity` on the existing start request. Under
the same adapter start serialization used for child reuse/spawn, the adapter
requires a healthy existing child with that exact incarnation and rejects a
missing or different child before any spawn.

This is distinct from the existing restored-startup
`retry-same-incarnation` disposition. That disposition names the adapter
execution incarnation and may deliberately replace a failed Gateway child.
Only replay of already-retained successful readiness uses the Gateway-child
expectation.

- matching healthy child: re-establish/verify the pipe, then reuse retained
  OpenClaw readiness;
- different, missing, or unhealthy child: do not spawn, never reuse the old
  readiness result, and return a stable non-ready failure until a new
  restored-readiness transaction is designed and proven.

This keeps current liveness/transport proof separate from OpenClaw-authored
continuity readiness.

## Smallest Fork-Only Evidence Slice

1. Add restore-hold v2 compatibility fixtures: read ordinary v1, preserve v1
   before activation, write v2 only for exact ready evidence, reject v2 from a
   simulated old reader, and fail closed for legacy restored Runnable without
   ready evidence.
2. Extend the in-memory restore-hold fixture with the complete strict ready
   result and exact replay/conflict tests.
3. Prove the E6c destination generation reaches OpenClaw independently of E4's
   fixed lifecycle owner generation.
4. Add a `ContainerSession` test proving restored start reuses identity/proxy
   overlay and post-start pipe handling.
5. Add one concrete Plex provisioner fixture using the current paired
   preparation/restore/start operation.
6. Prove first execution returns exact OpenClaw `Ready`.
7. Inject a coordinator crash after restore-hold completion but before handoff
   `complete_ready`; prove retry returns the identical readiness generation
   without another allocation, preparation, or restore, after the idempotent
   identity-fenced start fan-in confirms the same child without permitting a
   replacement spawn and re-establishes the pipe.
8. Prove a concurrent same-generation call returns `Pending`.
9. Prove a mismatched recovery point, destination generation, retained ready
   result, or Gateway incarnation fails closed.
10. Keep `LOBSTER_CONTINUITY_ENSURE_RUNTIME_READY_ENABLED` false in production
   until the paired fork image and this replay proof are promoted.

The deletion gate is satisfied when `ensure_runtime_ready` uses this concrete
provisioner in a fork environment and the fake provisioner is no longer the only
implementation of the production trait.

## Primary External References

- Kubernetes controllers:
  <https://kubernetes.io/docs/concepts/architecture/controller/>
- Kubernetes Pod readiness gates:
  <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-readiness-gate>
- systemd service-authored readiness:
  <https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html>
