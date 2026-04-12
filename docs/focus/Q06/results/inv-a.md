# Experiment a: CI/CD Landscape Survey

**QID**: Q12f-a
**Method**: Training data synthesis + design analysis
**Date**: 2026-04-11
**Status**: Complete

---

## Objective

Survey how existing governance, security, and linting tools integrate with CI/CD pipelines. Extract patterns for GitHub Actions integration: inputs/outputs, SARIF support, caching, PR annotations, merge gating.

---

## Tool Survey

### 1. ESLint

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | No official action. Community uses `reviewdog/action-eslint` or runs via `npx eslint` in workflow steps |
| **Inputs** | Source paths, config file (`.eslintrc`), `--format` flag |
| **Outputs** | Exit code (0/1), stdout text, SARIF via `--format @microsoft/eslint-formatter-sarif` |
| **SARIF support** | Via third-party formatter. Upload with `github/codeql-action/upload-sarif@v3` |
| **Caching** | `actions/cache` on `node_modules/` and `.eslintcache` (file-level cache via `--cache` flag) |
| **PR annotations** | Via SARIF upload (inline code scanning alerts) or `reviewdog` (PR review comments) |
| **Merge gating** | Branch protection rule: require "eslint" check to pass |
| **Key pattern** | Formatter pluggability. ESLint outputs text/json/sarif/stylish. CI chooses the format. |
| **Latency** | 5-30s for typical JS project. `--cache` cuts repeat runs by ~70%. |

**Takeaway for glint**: Formatter pluggability is essential. `glint pinch --format sarif` should be a first-class output mode. The `--cache` flag pattern (file-level incremental) maps to `.glint/cache/`.

---

### 2. Semgrep

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | `returntocorp/semgrep-action` (official). Also `semgrep ci` CLI command designed for CI. |
| **Inputs** | `config` (rules — `p/default`, `p/owasp-top-ten`, custom YAML), `auditOn` (push/PR), `generateSarif` |
| **Outputs** | SARIF file, JSON findings, exit code. Semgrep App integration for dashboard. |
| **SARIF support** | Native. `semgrep ci --sarif --output results.sarif`. First-class, not a plugin. |
| **Caching** | Semgrep caches rule compilation. In CI: `actions/cache` on `~/.semgrep/`. Differential scanning: only files changed in PR. |
| **PR annotations** | Two modes: (1) SARIF upload for code scanning alerts, (2) Semgrep App posts inline PR comments with fix suggestions |
| **Merge gating** | `semgrep ci` exits non-zero on findings. Branch protection on the check. Also: Semgrep App can block via status check API. |
| **Key pattern** | `semgrep ci` is a CI-specific entry point. Different from `semgrep scan` (local). CI mode auto-detects PR context, diff base, and output format. |
| **Latency** | 10-60s. Differential scanning (PR diff only) is the major speedup. |

**Takeaway for glint**: A dedicated CI entry point (`glint ci` or `glint pinch --ci`) that auto-detects PR context, only scans changed files, and defaults to SARIF output. Differential scanning (only files in PR diff) is the key latency optimization.

---

### 3. Snyk

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | `snyk/actions` (official, per-language: `snyk/actions/node`, `snyk/actions/python`, etc.) |
| **Inputs** | `command` (test/monitor/code), `args` (severity threshold, project name), `SNYK_TOKEN` secret |
| **Outputs** | SARIF file, JSON report, exit code. Snyk dashboard integration. |
| **SARIF support** | Native. `snyk code test --sarif-file-output=snyk.sarif`. Dedicated flag for SARIF file path. |
| **Caching** | Snyk caches vulnerability DB locally (`~/.snyk/`). In CI: `actions/cache` on `~/.snyk/`. |
| **PR annotations** | (1) SARIF upload for code scanning, (2) Snyk bot posts PR comment with vulnerability summary + fix PRs |
| **Merge gating** | `snyk test` exits non-zero if vulnerabilities found above threshold (`--severity-threshold=high`). Branch protection gates on check. |
| **Key pattern** | Severity threshold gating. Don't fail on low-severity findings in CI; fail on high/critical. Configurable per-environment. |
| **Latency** | 15-90s (depends on dependency tree size). `--prune-repeated-subdependencies` helps. |

**Takeaway for glint**: Severity-based gating. `glint pinch --fail-on=critical,high` lets CI block only on severe violations while allowing warnings to pass. Maps to `--strict` (all warnings become errors) vs default (only errors block).

---

### 4. Trivy

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | `aquasecurity/trivy-action` (official). Very popular (5k+ GitHub stars on action). |
| **Inputs** | `scan-type` (fs/image/repo/config), `severity` (CRITICAL,HIGH), `format` (table/json/sarif), `output` (file path), `ignore-unfixed` |
| **Outputs** | SARIF file, JSON, table. Exit code based on severity filter. |
| **SARIF support** | Native. `format: 'sarif'` input in action. `trivy fs --format sarif --output trivy.sarif .` |
| **Caching** | Trivy DB cache (`~/.cache/trivy/`). Action has built-in `cache: true` input for DB caching. |
| **PR annotations** | Via SARIF upload. Trivy itself doesn't post PR comments — relies on GitHub code scanning UI. |
| **Merge gating** | `exit-code: 1` input in action. Branch protection on check. Severity filter determines what triggers the exit code. |
| **Key pattern** | Built-in caching input on the action itself (`cache: true`). No need for separate `actions/cache` step. The action manages its own cache. |
| **Latency** | 5-30s for filesystem scan. DB download is the bottleneck — caching DB eliminates it. |

**Takeaway for glint**: The glint action should have built-in cache management (`cache: true` input), not require users to configure `actions/cache` separately. Self-managing cache is the best UX.

---

### 5. Checkov (Bridgecrew)

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | `bridgecrewio/checkov-action` (official). Also runs as `checkov -d .` CLI. |
| **Inputs** | `directory`, `framework` (terraform/cloudformation/k8s/etc.), `check` (specific check IDs), `skip_check`, `output_format` (json/sarif/cli), `soft_fail` |
| **Outputs** | SARIF file, JSON, CLI table. Exit code (configurable via `soft_fail`). |
| **SARIF support** | Native. `output_format: sarif`. Upload with `upload-sarif` action. |
| **Caching** | Checkov caches custom policy downloads. Python package caching via `actions/cache` on pip. |
| **PR annotations** | Via SARIF upload. Bridgecrew platform posts PR comments with fix suggestions and compliance context. |
| **Merge gating** | `soft_fail: true` makes all findings non-blocking (warn only). Default: hard fail on any finding. Per-check suppression via `skip_check`. |
| **Key pattern** | `soft_fail` flag for gradual adoption. New teams start with soft_fail=true (warnings only), then tighten to hard fail over time. |
| **Latency** | 10-45s. Framework-specific scanning is faster than full-directory. |

**Takeaway for glint**: The `soft_fail` / gradual adoption pattern. `glint pinch --warn-only` in CI lets teams adopt governance incrementally: start with warnings, graduate to blocking. Critical for enterprise rollout where day-one hard-fail on 200 repos would be a non-starter.

---

### 6. Ruff

| Dimension | Detail |
|-----------|--------|
| **GitHub Action** | `chartboost/ruff-action` (community) or direct `ruff check --output-format sarif`. |
| **Inputs** | Source paths, config (`pyproject.toml` or `ruff.toml`), `--output-format` |
| **Outputs** | SARIF, JSON, text, GitHub-annotated text. Exit code. |
| **SARIF support** | Native. `ruff check --output-format sarif > ruff.sarif`. Built into the CLI, not a plugin. |
| **Caching** | Ruff is Rust-fast (~100x faster than flake8). Caching is less critical but `--cache` exists. |
| **PR annotations** | `--output-format github` outputs `::error file=...` annotations that GitHub Actions natively renders inline on PRs. No SARIF needed for basic annotations. |
| **Merge gating** | Exit code non-zero on findings. Standard branch protection. |
| **Key pattern** | `--output-format github` for native GitHub Actions annotations WITHOUT SARIF upload. Simpler, faster, no upload step. Two-tier: `github` format for quick annotations, `sarif` format for code scanning integration. |
| **Latency** | <2s for most projects. Speed makes caching nearly irrelevant. |

**Takeaway for glint**: Two annotation modes: (1) `--format github` for native `::error` / `::warning` annotations (zero-config, instant), (2) `--format sarif` for full code scanning integration. The GitHub format is perfect for `glint pinch` since it's already designed for <1s execution.

---

## Cross-Tool Pattern Matrix

| Pattern | ESLint | Semgrep | Snyk | Trivy | Checkov | Ruff | glint should... |
|---------|--------|---------|------|-------|---------|------|-----------------|
| **Official GH Action** | No | Yes | Yes | Yes | Yes | No | Yes (`@craftworks/glint-action`) |
| **SARIF native** | Plugin | Yes | Yes | Yes | Yes | Yes | Yes — native `--format sarif` |
| **GitHub annotations** | Via SARIF | Via SARIF | Via SARIF | Via SARIF | Via SARIF | Native `--format github` | Both: `github` native + SARIF |
| **Built-in cache mgmt** | No | Partial | No | Yes | No | N/A (fast) | Yes — `cache: true` input |
| **Diff-only scanning** | `--cache` | `--diff-depth` | No | No | No | No | Yes — `--staged` / `--diff base..head` |
| **Severity gating** | Warning/error | By rule severity | `--severity-threshold` | `--severity` | Per-check | Per-rule | `--fail-on` / `--strict` |
| **Soft fail mode** | N/A | `--audit-on` | N/A | N/A | `soft_fail` | N/A | `--warn-only` for gradual adoption |
| **CI-specific mode** | No | `semgrep ci` | `snyk monitor` | N/A | N/A | N/A | Consider `glint ci` or auto-detect |
| **Fix suggestions** | `--fix` | Via App | Fix PRs | N/A | Via platform | `--fix` | `--fix` + PR comment suggestions |
| **Dashboard integration** | N/A | Semgrep App | Snyk dashboard | N/A | Bridgecrew | N/A | Future: glint dashboard |

---

## Key Findings

### F1: SARIF is the universal CI lingua franca

All 6 tools support SARIF. GitHub, GitLab, Azure DevOps, and Bitbucket all accept SARIF for code scanning. `glint pinch --format sarif` is non-negotiable.

### F2: Two-tier annotation strategy

Ruff shows the optimal pattern: `--format github` for lightweight native annotations (zero-config, instant PR feedback), `--format sarif` for full code scanning with dashboard, tracking, and security tab integration. glint should support both.

### F3: Built-in cache management in the action

Trivy's `cache: true` action input is the best UX. Users shouldn't need to configure `actions/cache` separately. The glint action should manage `.glint/cache/` automatically.

### F4: Differential scanning is the latency win

Semgrep's diff-only scanning (only files changed in PR) is the biggest CI latency optimization. `glint pinch` already has `--staged` for pre-commit; in CI, it needs `--diff <base>` to scan only PR changes.

### F5: Severity-based gating enables gradual adoption

Snyk's `--severity-threshold` and Checkov's `soft_fail` enable gradual adoption. Enterprises can't hard-fail 200 repos on day one. `glint pinch --warn-only` or `--fail-on=critical` is essential for enterprise rollout.

### F6: CI-specific entry point simplifies configuration

Semgrep's `semgrep ci` auto-detects PR context, diff base, and output format. A CI-aware mode in glint (auto-detect `GITHUB_ACTIONS`, `CI`, `GITLAB_CI` env vars) reduces configuration burden.

### F7: The action is the distribution mechanism

Snyk, Trivy, Checkov, and Semgrep all have official GitHub Actions. The action is how governance reaches every repo in an org. `@craftworks/glint-action` is the highest-leverage distribution channel.

---

## Design Implications for glint

### New flags needed on GLINT-MAP

| Flag | Command | Rationale |
|------|---------|-----------|
| `--format sarif` | `pinch`, `comply` | SARIF output for CI code scanning (already exists as `--format` on audit/comply/report; extend to pinch) |
| `--format github` | `pinch` | Native GitHub Actions `::error`/`::warning` annotations |
| `--diff <ref>` | `pinch` | Scan only files changed since ref (PR diff scanning) |
| `--fail-on <severity>` | `pinch` | Severity gating: only fail on specified severity levels |
| `--warn-only` | `pinch` | Soft-fail mode for gradual adoption (all findings are warnings) |
| `--sign` | `comply` | Sign compliance evidence artifacts for CD gates |
| `--ci` | `pinch` | Auto-detect CI environment, set defaults (format, diff base, exit codes) |

### Architecture alignment

| glint concept | CI pattern match |
|---------------|-----------------|
| `glint pinch` (<1s) | Perfect for PR checks. Already fast enough. |
| `glint comply` (evidence) | CD gate. Run before deploy, sign artifacts. |
| `.glint/cache/` | Action-managed cache. Hash-keyed by glint.json + policies. |
| `glint drift` | Scheduled workflows. `cron: '0 6 * * 1'` (weekly Monday 6am). |
| `--staged` | Pre-commit hooks (already designed). |
| Three-ring model | Inner = pre-commit, CI-ring = PR check + CD gate, Outer = scheduled fleet. |

---

## References

| Source | Contribution |
|--------|-------------|
| GitHub Actions documentation | Action schema, SARIF upload, branch protection |
| Semgrep CI docs | CI-specific entry point pattern, differential scanning |
| Trivy action source | Built-in cache management pattern |
| Checkov docs | soft_fail gradual adoption pattern |
| Ruff docs | Native GitHub annotations format |
| SARIF specification (OASIS) | Schema version 2.1.0, result/rule/location model |
