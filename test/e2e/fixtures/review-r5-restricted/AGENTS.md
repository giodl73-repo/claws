# review-r5-restricted fixture — AGENTS

## agent: fleet-analyst

- trustTier: R5
- declaredIntent: "Query fleet database for restricted telemetry"
- allowedTools: [fleet-db.query]
- requiresApproval: true

Single-tool R5 agent whose call forces the review verb. Companion approval
is mocked by the harness (companion-mock).
