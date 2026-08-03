# RFC Scope: Resource Admission and Usage

- ID: EC-031
- Lane: Data governance and resource control
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Scoped resource owners

## Scope

- Define limits, allocations, admission, leases, usage, exhaustion,
  reconciliation, and cost/capacity evidence.

## Current Owner Baseline

Current source has multiple owner-local mechanisms: Cron admission and queued
reservations, worktree run leases and git locks, stale-holder fencing, and
usage/cost observations. These are not one durable portable lease or quota
contract. Restart-safe lease identity, cross-node scope, and causal late-usage
reconciliation remain target semantics.

## Explicit Exclusions

- One global budget manager.
- Resource policy as work ownership.

## Required Outcomes

- Decisions bind scope, operation, generation, and authority.
- Exhaustion behavior follows the EC-004 risk class: protected/high-risk work
  rejects; lower-risk work may degrade only with explicit evidence.
- Delayed usage reconciles to causing operations.
- Each admission, allocation, and lease has stable identity, admitted
  generation, expiry, and terminal settlement so delayed usage reconciles
  causally after restart.
- Owners without managed admission remain compatible with ordinary local
  operation; absence of a managed decision is explicit.
- Admission decisions stay within the declared Gateway/runtime latency budget.

## Dependencies

- EC-004, EC-008, and EC-012.

## Proof and Deletion Gate

- Admit, exhaust, and reconcile one bounded resource.
- Disable managed admission and preserve ordinary local operation.
- Delete disconnected local limits and aggregate-only usage.
- Disprove the separate contract if scoped resource owners already provide
  causal admission/allocation/lease identity, exhaustion behavior, and delayed
  usage reconciliation without a global budget owner.

## Implementation Package Reconciliation

- Preserve current owner-local limits, queues, lanes, Cron admission, worktree
  leases, child slots, cooldowns, truncation, and usage observations.
- Use Cron admission, one worktree lease, and one child/subagent slot as the
  unlike-owner comparison set.
- The decisive proof is one bounded lease that persists, exhausts, restarts,
  fences stale holders, renews or expires, and settles terminally.
- Reuse EC-011/EC-012 model-call/run usage and cost provenance; do not create a
  second usage total or billing database.
- Keep tenant budgets, reservations, placement, fairness, chargeback, and fleet
  capacity in Lobster. File no portable lease ask before the fixture.
