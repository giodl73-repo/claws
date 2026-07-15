# Stage 5: Hibernate And Wake

## Outcome

Deliver Elastic continuity for the first proven Lobster sources: durable Teams
ingress, host/API requests, and cron.

## Repository And Dependencies

- PR 5A: `openclaw/openclaw`
- PR 5B: `bic/lobster`, after PR 5A lands
- Depends on: PR 4 and stable retained-ingress, generation, readiness, and
  carrier foundations

## PR 5A: OpenClaw Change

- Define hibernation as Portable final handoff plus accepted wake intent and
  permission for no runtime process to exist.
- Publish checkpoint-bound `nextRequiredAt` while retaining OpenClaw ownership
  of cron definitions, due decisions, catch-up, and deduplication.
- Define the sleep-authorization token and revocation contract used by a host;
  OpenClaw does not observe new work while absent.
- Reconcile scheduler state before readiness and execute policy-allowed overdue
  work only after readiness.
- Expose stable wake, restore, degraded, missed-deadline, and unsupported
  Channel status.
- Define quarantine semantics that block wake, generation grant, delivery, and
  implicit disaster reset while preserving evidence and retained work.

## PR 5B: Lobster Change

- Retain checkpoint identity, wake deadline, ingress, dedupe identity, and
  provisioning state outside compute.
- Atomically accept final recovery point and wake intent.
- Revoke outstanding sleep authorization when retained ingress arrives before
  compute removal.
- Wake one fenced generation for Teams, host/API, or semantic cron deadline.
- Coalesce provisioning without losing individual retained deliveries.
- Wait for restored readiness before delivery.
- Enforce quarantine and identity-bound wake/reset audit.
- Make quarantine an externally enforceable lifecycle state rather than a
  status field supplied by absent compute.
- Measure provision, restore, validation, and delivery phases against the
  declared cold-start SLO.

## Non-Goals

- No universal Elastic claim for resident-socket or polling Channels.
- No normalized ingress API or host ownership of cron semantics.
- No early work delivery to speed cold start.
- No destructive reset as an automatic restore fallback.

## Proof And Exit

- No OpenClaw process is required during the absent interval.
- Teams/API/cron triggers survive cold start and deliver exactly according to
  their native dedupe semantics after readiness.
- Concurrent triggers provision one current generation without dropping work.
- New work revokes a not-yet-committed sleep authorization.
- Restore failure retains work and applies bounded fallback visibly.
- Missed wake deadlines and unsupported Channels fail visibly.
- Quarantine prevents wake and delivery while retaining artifacts and work.
- Quarantine, generation loss, wake denial, fallback, and destructive reset
  emit redacted, identity-bound audit events suitable for fleet aggregation.
- Resident-only Channels either block Elastic or keep compute resident.

## Rollback

Disable idle retirement and keep Portable compute resident. Retained work and
published recovery points remain valid.
