# review-r5-restricted fixture — TOOLS

## tool: fleet-db.query

- declaredTier: R5
- capability: data.restricted.read
- dataSource: fleet-db
- dataClassification: RESTRICTED
- action: review (review-required)

R5 tool binding to the RESTRICTED `fleet-db` source. The merger surface
records a provisional `pending-conjunctive` decision; once the companion
approval returns, the final `DecisionEntry.decision` is `review` and an
`ApprovalEntry` with matching `correlationId` is appended.
