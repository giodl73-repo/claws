# r5-send-email fixture — SOUL

Expected decision verb: **review**.

R5 IRREVERSIBLE_EXTERNAL tool binding: `send-email` is never auto-allowed.
The merger surface records a provisional `pending-conjunctive` decision;
once the companion approval returns and the handle-binding validator
(pulse 49) confirms the 7 bound fields + signature, the DecisionEntry
transitions to `allow` and an ApprovalEntry with matching `correlationId`
is appended. If any bound field mismatches, the ApprovalEntry records
`outcome: 'rejected'` with the first-failing `invalidReason`.

## Policy

- R5 tools require companion approval (review verb) regardless of
  sensitivity classification.
- `effectiveTier` is capped at the declared tier (no uplift).
- The approval flow binds `ctx.canonicalInvocationHash` to the companion's
  approvalHandle — the validator short-circuits on signature, then
  evaluates providerId, contentHash, sequenceNumber, approverPrincipal,
  keyId, ttl, nonce in that order (CL-11 §3a).
