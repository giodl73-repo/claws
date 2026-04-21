# review-r5-restricted fixture — SOUL

Expected decision verb: **review**.

Canonical review pairing per CL-07 §1a: an R5 tool touching a RESTRICTED
data source escalates to human review. The merger surface emits a
`pending-conjunctive` audit entry initially and transitions to
`review`-outcome once the companion verdict lands.

## Policy

- R5 tools automatically require companion approval (review verb) when the
  data classification is RESTRICTED or higher.
- `effectiveTier` is capped at the declared tier (no uplift).
- The approval flow binds `ctx.canonicalInvocationHash` to the companion's
  approvalHandle — SC-06 (P-02) covers the binding; here the scenario only
  checks that review is the resolved verb.

## Data sources

- `fleet-db` — classification: RESTRICTED. Tool invocation must pass through
  the companion approval gate before the host admits the call.
