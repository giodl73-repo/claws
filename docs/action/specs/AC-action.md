# AC — @bic/claws-action (primary spec)

**Status**: Alpha · **Upstream target**: none

## Package overview

The `claws-action` GitHub Action wraps the `claws` CLI for CI use:
on PR events it runs the validation suite, emits SARIF so findings
land in GitHub's security tab, and gates merge based on severity.

## Inputs

```yaml
- uses: gim-home/claws-action@v0.1
  with:
    workspace: . # path to workspace root
    severity-gate: warn # block | warn | off (default: warn)
    cache: true # enable ACC cache (default: true)
    fleet: acme # optional fleet override
```

## Outputs

- `findings-count` — total number of findings emitted
- `block-count` — BLOCK-severity findings
- `warn-count` — WARN-severity findings
- `sarif-path` — path to the emitted SARIF file

## Sub-spec index

| Code    | File                                             | Authority over                                  |
| ------- | ------------------------------------------------ | ----------------------------------------------- |
| **ACS** | [ACS-sarif-pipeline.md](./ACS-sarif-pipeline.md) | Finding → SARIF translation, severity mapping   |
| **ACC** | [ACC-action-cache.md](./ACC-action-cache.md)     | Workspace-to-policy cache keyed on content hash |

## Stability

Alpha. The input/output surface is stable. SARIF schema follows
the 2.1.0 spec (fixed).
