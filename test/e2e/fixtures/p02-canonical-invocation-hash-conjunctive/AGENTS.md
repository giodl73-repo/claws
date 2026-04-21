# p02-canonical-invocation-hash-conjunctive fixture — AGENTS

## agent: records-exporter

- trustTier: R5
- declaredIntent: "Export restricted records for audit"
- allowedTools: [records.export]
- requiresApproval: true

Single-tool agent, single invocation. The merger surface receives two
independent `approvalHandle` contributions; both MUST carry the same
`canonicalInvocationHash`.
