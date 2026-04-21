# p02-canonical-invocation-hash-conjunctive fixture — SOUL

Pitfall P-02: a tool call guarded by *two* conjunctive providers must bind
**both** approvalHandles to the same `ctx.canonicalInvocationHash`. Otherwise
one provider's approval could replay against a different invocation than
the other's — a cross-binding escape.

Scenario SC-06 installs two providers in the merger surface; both emit
approvalHandle against the same invocation. The assertion is that both
handles report the same `canonicalInvocationHash` as
`DecisionEntry.correlationId`'s bound ctx.

## Policy

- All tools below require **two** conjunctive approvals: `security-review`
  (classified data gate) AND `compliance-review` (RESTRICTED records gate).
- The merger surface keeps both handles alive until both clear.
