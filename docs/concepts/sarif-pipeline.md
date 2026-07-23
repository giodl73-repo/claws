# SARIF Pipeline

<!-- atom:sarif-pipeline (C98) -->

SARIF 2.1.0 output, GitHub Code Scanning upload, and stage-based enforcement via `@bic/claws-action`.

> **Prerequisites**: [Aether Integration](aether-integration.md) (policy emission). Next: [Severity Gating](severity-gating.md).

---

## Overview

The claws GitHub Action runs governance checks as part of CI/CD pipelines. It produces SARIF 2.1.0 output for GitHub Code Scanning, so governance violations appear as inline PR annotations alongside security findings. The action supports four pipeline stages with different enforcement behaviors, compilation caching, and optional artifact signing for release pipelines.

---

## Pipeline stages

| Stage | Name       | SARIF upload | Enforcement                                                 |
| ----- | ---------- | ------------ | ----------------------------------------------------------- |
| 0     | Pre-commit | No           | Fast check, no upload                                       |
| 1     | PR check   | Yes          | Full check + annotations                                    |
| 2     | CD gate    | Yes          | Full check + fail on violations + optional artifact signing |
| 3     | Fleet cron | Yes          | Scheduled fleet-wide check                                  |

---

## How it works

### 1. Cache key computation

The action computes a SHA-256 cache key from the concatenated hashes of governance source files:

- `claws.json` (configuration)
- 8 OC governance files: `SOUL.md`, `TOOLS.md`, `AGENTS.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md`, `lobster.yaml`
- All files in the `skills/` directory (sorted for determinism)

Non-governance files (README.md, etc.) are excluded so documentation changes don't invalidate the cache. On cache hit, recompilation is skipped.

### 2. Run claws check

The action invokes `claws check --format sarif` and captures the output to `claws-results.sarif`. Stage 2 (CD gate) appends `--sign` when requested to sign governance attestation artifacts.

### 3. SARIF upload

For stages 1, 2, and 3, the SARIF file is gzipped, base64-encoded, and uploaded to GitHub Code Scanning via `gh api /repos/{owner}/{repo}/code-scanning/sarifs`. The upload requires `security-events: write` permission.

### 4. Severity gating

The `should_block_for_severity` shell function (defined in `claws-action/scripts/run.sh`, not an SDK export) determines whether to fail the check based on the `fail-on` threshold and the severities present in SARIF results. Severity gating is a shell-level decision function that the action calls after SARIF generation -- see [Severity Gating](severity-gating.md) for threshold logic and adoption ramp.

---

## Action inputs

| Input       | Required | Default | Description                                          |
| ----------- | -------- | ------- | ---------------------------------------------------- |
| `stage`     | Yes      | --      | Pipeline stage: 0, 1, 2, or 3                        |
| `format`    | Yes      | `sarif` | Output format: sarif, json, csv, default             |
| `fail-on`   | No       | `all`   | Severity threshold: critical, high, medium, all      |
| `warn-only` | No       | `false` | Report without failing (exit 0 with warnings)        |
| `sign`      | No       | `false` | Sign artifacts during Stage 2 CD gate                |
| `framework` | No       | `''`    | Target framework hint (claude-code, cursor, copilot) |
| `cache`     | No       | `true`  | Enable governance compilation cache                  |

---

## Action outputs

| Output            | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `sarif-file`      | Path to the generated SARIF file                                |
| `violation-count` | Total number of governance violations found                     |
| `exit-code`       | Exit code from claws (0=clean, 1=violations, 2=bypass, 3=error) |
| `cache-hit`       | Whether a cache hit occurred                                    |

---

## Example workflow

```yaml
name: Governance Check
on: [pull_request]

permissions:
  contents: read
  security-events: write

jobs:
  claws:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @bic/claws-cli

      - name: Run claws governance check
        uses: craftworks/claws-action@v1
        with:
          stage: "1"
          format: "sarif"
          fail-on: "high"
```

---

## SARIF severity mapping

SARIF uses three levels (`error`, `warning`, `note`). The SARIF format cannot distinguish between critical and high -- both map to `error`. The shell function sets both `HAS_CRITICAL` and `HAS_HIGH` to 1 for any `error`-level result, so the `fail-on` threshold treats them equivalently:

| SARIF level | claws severity                               | Flags set                      |
| ----------- | -------------------------------------------- | ------------------------------ |
| `error`     | critical + high (indistinguishable in SARIF) | `HAS_CRITICAL=1`, `HAS_HIGH=1` |
| `warning`   | medium                                       | `HAS_MEDIUM=1`                 |
| `note`      | low                                          | (counted in total only)        |

---

## Related concepts

- [Severity Gating](severity-gating.md) -- threshold-based enforcement and gradual adoption
- [CI/CD Pipeline](cicd-pipeline.md) -- general CI integration overview
- [Artifact Signing](artifact-signing.md) -- Ed25519/HMAC-SHA256 signing used in Stage 2
- [Governance Badge](governance-badge.md) -- CI results contribute to badge level
