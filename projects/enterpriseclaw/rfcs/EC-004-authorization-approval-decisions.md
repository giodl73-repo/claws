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

- EC-003 and operation identity.

## Proof and Deletion Gate

- Exercise all decision states, constrained parameter modification,
  stale-approval rejection, and degraded-source fail-closed behavior.
- Delete runtime paths that discard approval resolution.
- Disprove the separate contract if the existing enforcement seam already
  emits bounded allow/deny/review/modify decisions with normalized intent,
  risk, expiry, revocation, and approval correlation without a second decision
  abstraction.
