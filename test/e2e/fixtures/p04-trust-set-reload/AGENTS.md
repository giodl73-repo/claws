# p04-trust-set-reload fixture — AGENTS

## agent: retry-caller

- trustTier: R2
- declaredIntent: "Retry a write around a trust-set rotation"
- allowedTools: [tiered.act]

Single-tool agent, two calls: one before the trust-set flip, one after.
