# p01-decision-start-capture fixture — TOOLS

## tool: slow-approval.act

- declaredTier: R4
- capability: data.internal.write
- action: review (review-required)

The tool needs a companion approval. The harness stalls the approval
response just long enough for the scenario to swap the policy snapshot
underneath. Whatever sha was active at decision-start is the one that
lands in the audit entry.
