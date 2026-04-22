# p02-canonical-invocation-hash-conjunctive fixture — TOOLS

## tool: records.export

- declaredTier: R5
- capability: data.restricted.read
- dataClassification: RESTRICTED
- requiredProviders: [security-review, compliance-review]
- action: review (conjunctive)

Export tool gated by two orthogonal approvers. Both providers emit an
approvalHandle; both must bind to the same `ctx.canonicalInvocationHash`.
