# deny-soul-rule fixture — AGENTS

## agent: outbound-caller

- trustTier: R3
- declaredIntent: "Send internal payload to external ingest"
- allowedTools: [outbound.post]

Single-tool agent whose call triggers the SOUL `prohibit-secrets-exfil` deny.
