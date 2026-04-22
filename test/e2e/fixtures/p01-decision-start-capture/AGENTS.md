# p01-decision-start-capture fixture — AGENTS

## agent: slow-actor

- trustTier: R4
- declaredIntent: "Perform internal write that requires approval"
- allowedTools: [slow-approval.act]
- requiresApproval: true

The scenario drives a single call, pauses in the approval wait, promotes the
policy snapshot, then releases the approval. `policyArtifactSha256` bound
at decision-start is the assertion anchor.
