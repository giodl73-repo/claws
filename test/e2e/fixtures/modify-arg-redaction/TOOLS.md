# modify-arg-redaction fixture — TOOLS

## tool: notes.store

- declaredTier: R2
- capability: data.internal.write
- dataClassification: INTERNAL
- transforms: [redact-email-addresses]
- action: modify

Persists a free-text note. Before the call is admitted, the redact transform
rewrites any embedded email addresses. The modified args are what `modifiedArgsHash`
is computed over.

Scenario args (harness-supplied):
- `title`: "weekly sync"
- `body`: "Ping alice@example.test and bob@example.test for Friday."

Post-redaction body:
- "Ping [REDACTED-EMAIL] and [REDACTED-EMAIL] for Friday."
