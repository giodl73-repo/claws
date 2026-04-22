# r5-send-email fixture — AGENTS

## agent: mailer

- trustTier: R5
- declaredIntent: "Send outbound email on behalf of the user"
- allowedTools: [send-email]
- requiresApproval: true

Single-tool R5 agent whose call forces the review verb. Companion approval
is mocked by the harness (companion-mock) and the approvalHandle is subjected
to the handle-binding validator before the tool executes.
