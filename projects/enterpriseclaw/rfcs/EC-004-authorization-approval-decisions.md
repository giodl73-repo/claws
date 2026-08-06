# RFC Scope: Authorization and Approval Decisions

- ID: EC-004
- Lane: Identity, authority, and trust
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Policy and approval owners

## Scope

- Define allow, deny, review, and modify decisions with scope, constraints,
  generation, expiry, and approval correlation.
- Map `modify` to constrained parameter replacement that produces a new
  normalized intent digest and reruns risk classification plus the required
  authorization/approval check at the existing runtime enforcement seam.

## Current Owner Baseline

The current approval path has one canonical resolution truth, snapshots
deferred execution parameters, applies expiry, and fails closed for malformed,
disallowed, or late verdicts. The target adds normalized review/modify
semantics and binds them to normalized intent, risk, and policy generations;
it does not replace the existing enforcement seam with a generic transform
layer.

Current owner work already covers two adjacent gaps: #113444 proposes
authenticated external ownership of approval presentation without moving
decision authority, and #115408/#116013 split hosted Control UI shaping from
server-side enforcement. The remaining portable question is whether the exact
consumed decision reference and generation survive through final invocation
and evidence.

## Explicit Exclusions

- One policy language for all facilities.
- External-effect settlement.
- Any permissive fallback for malformed or unmappable protected decisions.

## Required Outcomes

- Protected unknown actions default to review or deny.
- Missing or unverifiable high-risk authority fails closed.
- The consumed invocation records the decision reference.
- Allow, deny, review, and modify each map to one explicit runtime response;
  unmappable decisions deny.
- A modified request never inherits the original decision unless the
  post-modification intent, scope, target, and risk-classifier generation still
  match.
- Expired, revoked, superseded, or unverifiable decision references resolve to
  deny or review; they never degrade to allow.
- Missing, malformed, unsigned, stale, or unavailable decision sources cannot
  silently disable protected enforcement.
- Migration preserves the current enforcement hook until the new decision
  correlation is authoritative; no long-lived parallel policy path remains.

## Dependencies

- EC-003. Operation identity is consumed from the invoking owner rather than
  from a hard dependency on any one runtime contract.

## Proof and Deletion Gate

- Exercise all decision states, constrained parameter modification,
  stale-approval rejection, and degraded-source fail-closed behavior.
- Delete runtime paths that discard approval resolution.
- Disprove the separate contract if the existing enforcement seam already
  emits bounded allow/deny/review/modify decisions with normalized intent,
  risk, expiry, revocation, and approval correlation without a second decision
  abstraction.
