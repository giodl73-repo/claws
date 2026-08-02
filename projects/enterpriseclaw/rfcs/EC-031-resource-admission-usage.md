# RFC Scope: Resource Admission and Usage

- ID: EC-031
- Lane: Data governance and resource control
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Scoped resource owners

## Scope

- Define limits, allocations, admission, leases, usage, exhaustion,
  reconciliation, and cost/capacity evidence.

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
