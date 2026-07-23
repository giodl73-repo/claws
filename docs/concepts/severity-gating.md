# Severity Gating

<!-- atom:severity-gating (C99) -->

Threshold-based enforcement that lets teams adopt governance checks gradually instead of all-at-once.

> **Prerequisites**: [SARIF Pipeline](sarif-pipeline.md) (the action that invokes gating logic). Next: [Artifact Signing](artifact-signing.md).

---

## Overview

Severity gating controls which violations block merges and which are reported as warnings. The `fail-on` input to `claws-action` sets the minimum severity that triggers a build failure. Combined with `warn-only` mode, this enables an 8-week adoption ramp where teams start by observing violations and progressively tighten enforcement.

---

## Threshold behavior

The `should_block_for_severity` function -- a bash shell function in `claws-action/scripts/run.sh`, not an SDK export -- determines whether to fail based on the severities present in SARIF results:

| `fail-on` value | Blocks on                         |
| --------------- | --------------------------------- |
| `critical`      | Only critical-severity violations |
| `high`          | Critical or high                  |
| `medium`        | Critical, high, or medium         |
| `all` (default) | Any violation                     |

SARIF-level aliases are normalized: `error` maps to `critical`, `warning` to `medium`, `note` maps to `all`. The alias `none` also maps to `all` via the shell function's catch-all default -- it is not a standard SARIF level but is accepted for convenience (e.g., `fail-on: 'none'` means "block on any violation").

---

## Warn-only mode

When `warn-only: 'true'`, the action always exits 0 regardless of violations. Per-severity warnings are emitted as GitHub Actions annotations:

```
::warning::claws found 12 governance violation(s) (warn-only mode)
::warning::  includes critical-severity violations
::warning::  includes high-severity violations
```

This is the recommended starting point for new repositories.

---

## 8-week adoption ramp

The `claws-action/examples/gradual.yml` workflow demonstrates the recommended adoption schedule:

| Week | Configuration         | Effect                                                                           |
| ---- | --------------------- | -------------------------------------------------------------------------------- |
| 1    | `warn-only: 'true'`   | Observe violations as PR annotations without blocking any merges                 |
| 2    | `fail-on: 'critical'` | Block only critical violations (e.g., missing approval gates on dangerous tools) |
| 4    | `fail-on: 'high'`     | Block critical + high. Medium violations remain warnings                         |
| 8    | `fail-on: 'all'`      | Full enforcement -- all violations block merges                                  |

This ramp covers CI enforcement thresholds. For the broader organizational adoption model (maker/citizen/developer tiers), see [Three-Tier Adoption](three-tier-adoption.md).

To adopt:

1. Start with the Week 1 job active and the others commented out
2. Each week, uncomment the next enforcement level
3. At week 8, remove the earlier jobs and keep only full enforcement

---

## Stage 2 CD gate interaction

Stage 2 (CD gate) also uses `fail-on` threshold logic. When claws reports violations (exit code 1):

- If the severity exceeds the threshold, the CD gate blocks deployment
- If violations are below the threshold, the gate passes with a warning

```
::error::CD gate: 5 governance violation(s) found (threshold: critical)
```

or

```
::warning::CD gate: 3 violation(s) below threshold 'critical' -- passing
```

---

## Configuration example

```yaml
# Block on critical + high, report medium as warnings
- uses: craftworks/claws-action@v1
  with:
    stage: "1"
    format: "sarif"
    fail-on: "high"

# Observe everything without blocking
- uses: craftworks/claws-action@v1
  with:
    stage: "1"
    format: "sarif"
    warn-only: "true"
```

---

## Related concepts

- [SARIF Pipeline](sarif-pipeline.md) -- SARIF format generation and Code Scanning upload; invokes severity gating after SARIF output
- [CI/CD Pipeline](cicd-pipeline.md) -- general CI integration
- [Three-Tier Adoption](three-tier-adoption.md) -- progressive adoption model
- [Governance Badge](governance-badge.md) -- badge level reflects enforcement threshold
