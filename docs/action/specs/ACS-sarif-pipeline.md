# ACS — SARIF pipeline

**Sub-spec of**: [AC-action.md](./AC-action.md)

## Finding → SARIF translation

Every `Finding` emitted by the claws validators (doc-structure,
atom-coverage, readme-reachability, accept-runner, the 29 G-rules)
maps to a SARIF 2.1.0 `result`:

```ts
// claws Finding
{ validator: 'doc-structure', severity: 'BLOCK',
  rule: 'required-top-file',
  file: 'workspace/README.md',
  message: 'workspace: missing required top-level file README.md' }
```

becomes

```json
{
  "ruleId": "doc-structure/required-top-file",
  "level": "error",
  "message": { "text": "workspace: missing required top-level file README.md" },
  "locations": [
    {
      "physicalLocation": {
        "artifactLocation": { "uri": "workspace/README.md" }
      }
    }
  ]
}
```

## Severity mapping

| Finding severity | SARIF level | GitHub annotation          |
| ---------------- | ----------- | -------------------------- |
| BLOCK            | error       | annotations show `ERROR`   |
| WARN             | warning     | annotations show `WARNING` |

## Severity gate

The `severity-gate` input controls merge behaviour:

- `block` — any BLOCK finding fails the action (exit 1)
- `warn` — any BLOCK OR WARN finding fails the action (strict)
- `off` — findings emitted, action always exits 0

Default is `warn` — middle strictness. Teams migrating onto claws
often start at `off` to see the findings, then tighten to `warn`,
then `block`.

See [../pitfalls/severity.md](../pitfalls/severity.md) for the
classic severity-gate surprises.

## SARIF emission path

Artifact path: `$GITHUB_WORKSPACE/.claws/sarif/claws.sarif`. The
action uploads via `github/codeql-action/upload-sarif@v3` as a
dependent step so findings flow to GitHub's security tab.
