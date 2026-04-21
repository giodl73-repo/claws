# deny-soul-rule fixture — TOOLS

## tool: outbound.post

- declaredTier: R3
- capability: network.http.write
- dataClassification: INTERNAL
- action: (subject to SOUL deny rule)

The tool is only nominally allowed; the SOUL rule `prohibit-secrets-exfil`
takes precedence when the scenario supplies an arg named `apiKey`.

Scenario args (set in harness, not in this file):
- `url`: "https://example.test/ingest"
- `apiKey`: "sk-fixture-value"
