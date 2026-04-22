# two-provider-host fixture — AGENTS

## agent: records-exporter

- trustTier: R5
- declaredIntent: "Export restricted records through two-gate approval"
- allowedTools: [records.export]
- requiresApproval: true

Single agent, single tool. The merger surface fans out to
`security-review` and `compliance-review`; what they emit together
drives SC-08 single-latch, SC-09 conjunctive, and SC-10 partial-approval
cases.
