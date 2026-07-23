# CI/CD Pipeline Integration

The @bic/claws-action GitHub Action for governance validation in CI pipelines.

## Overview

`@bic/claws-action` is a GitHub Action that runs governance checks as part of CI/CD pipelines. It executes `claws build` and `claws verify` on every pull request, blocking merges that introduce governance violations. The action produces structured output compatible with GitHub's checks API.

## Pipeline Integration

```yaml
# .github/workflows/governance.yml
name: Governance Check
on: [pull_request]
jobs:
  claws:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: craftworks/claws-action@v1
        with:
          command: verify
          fail-on: warning # block on warnings, not just errors
```

## Check Levels

| Level     | Behavior                      |
| --------- | ----------------------------- |
| `error`   | Fail only on errors (default) |
| `warning` | Fail on warnings and errors   |
| `info`    | Fail on any diagnostic        |

## Output

The action produces:

- GitHub check annotations (inline errors on changed files)
- Summary table in the PR check output
- Machine-readable JSON artifact for downstream consumption

## Related

- [CI/CD Composition](../../agent/concepts/infrastructure/cicd-composition.md) -- workspace-aware CI
- [Governance Badge](governance-badge.md) -- CI results contribute to badge level
- `design/claws/ATOMS.md` -- C92 `atom:cicd-pipeline`
