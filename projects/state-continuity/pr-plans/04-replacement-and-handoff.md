# Stage 4: Replacement And Final Handoff

## Outcome

Deliver Portable continuity: planned handoff and automatic restored startup on
fresh compute under exclusive runtime-generation authority.

## Repository And Dependencies

- PR 4A: `openclaw/openclaw`
- PR 4B: `bic/lobster`, after PR 4A lands
- Depends on: PR 3 and Hosted Integration generation/carrier foundations

## PR 4A: OpenClaw Change

- Extend the existing suspension authority for admission closure, blockers,
  lease revocation, and drain; do not add a second drain state machine.
- Define writable-owner drain/fence participation for Channels, API adapters,
  and sidecars.
- Complete conventional clean shutdown before final closed-state capture.
- Return an exact closed-state handoff result to an outer continuity
  coordinator. The exited Gateway cannot capture itself after shutdown.
- Publish the exact final point and emit generation-bound `safeToDestroy` only
  after acceptance.
- Declare restore dependency closure: captured, re-resolved, reconstructed, or
  blocking.
- Restore immutable source state onto a new runtime generation.
- Hold readiness closed through integrity, compatibility, dependency, identity,
  scheduler, and generation validation.
- Stop admission, cancel work, forbid final publication, and terminate on
  generation loss.

## PR 4B: Lobster Change

- Allocate and fence one runtime generation.
- Re-resolve destination credentials and shared capabilities.
- Act as the outer continuity coordinator: orchestrate suspend, close, verify
  process exit, capture closed persisted state, publish, authorize destruction,
  allocate fresh compute, restore, and open readiness in that order.
- Start writable sidecars and expose user-facing sidecar readiness only after
  restore and dependency validation; retain or reject pending writes explicitly
  during handoff.
- Record phase timing and identity-bound lifecycle audit.

## Non-Goals

- No idle retirement, zero-compute wake, retained ingress, or wake deadline.
- No credential-byte transfer.
- No live migration or pause/resume after final handoff begins.
- No final capture before clean shutdown completes.
- No second drain authority in Lobster or a sidecar.

## Proof And Exit

- Planned replacement loses no state beyond successful conventional clean
  shutdown.
- Active work, writable-owner blockers, invalidating shutdown warnings,
  publication failure, or stale authority prevent `safeToDestroy`.
- Gateway exit without a valid closed-state result prevents capture and
  `safeToDestroy`.
- Only one generation accepts work or advances the durable lineage.
- Fresh compute restores with no dependency on source-local paths.
- Missing credentials are re-resolved or block visibly; they are never read
  from artifacts.
- Fallback reports the selected point and actual lost interval.
- Cold restore phases are measured against the declared Portable SLO.
- Sidecar startup, health, pending-write treatment, and readiness ordering are
  covered in the container proof.

## Rollback

Stop automatic replacement and keep the current generation resident. Existing
Archived recovery points remain usable for explicit restore.
