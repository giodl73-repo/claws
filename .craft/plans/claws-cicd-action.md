---
slug: claws-cicd-action
preset: "claws"
plan: "3 headlines: claws-action in a GitHub workflow produces SARIF annotations on PR files, --warn-only mode enables gradual rollout to 200 repos, .claws/ caching reduces CI compile time"
area: claws
status: Draft
phase: thoth
atoms: [atom:cicd-pipeline]
specs: [CL-05, CL-01]
---

# claws-cicd-action — GitHub Actions Integration

## Headlines

1. **H1: `claws-action` in a GitHub workflow produces SARIF annotations on PR files** — The `@bic/claws-action` GitHub Action runs `claws pinch --diff $BASE --format sarif` on every PR push and uploads the SARIF output to GitHub Code Scanning. Violations appear as inline annotations on PR diff files with rule ID, severity, description, and fix suggestion. The action runs a 4-stage pipeline across the CI/CD lifecycle: Stage 0 (pre-commit: `claws pinch --staged --quiet`), Stage 1 (PR check: `claws pinch --diff $BASE --format sarif`), Stage 2 (CD gate: `claws comply <fw> --sign`), Stage 3 (fleet cron: `claws pinch --fleet + claws drift`). Each stage is independently configurable via action inputs.
   - Validation: Action workflow on a PR with a G-CLASS violation produces a SARIF file with `results[0].ruleId === "G-CLASS"` and `results[0].level === "error"`
   - Validation: SARIF upload to GitHub Code Scanning shows inline annotation on the violating line in the PR diff
   - Validation: Action with `stage: 2` and `framework: soc2` runs `claws comply soc2 --sign` and produces signed evidence artifact

2. **H2: `--warn-only` mode enables gradual rollout to 200 repos without day-one failures** — The action supports a gradual adoption path via the `warn-only` and `fail-on` inputs. With `warn-only: true`, all violations are reported as warnings (exit 0) so existing PRs are not blocked. With `fail-on: critical`, only critical violations block merges while high/medium/low are reported. The 8-week adoption ramp: Week 1 (CI only, warn-only: true -- visibility), Week 2 (CI only, fail-on: critical -- start blocking), Week 4 (pre-commit + CI, fail-on: high -- local enforcement), Week 8 (full pipeline, fail-on: all -- complete governance).
   - Validation: Action with `warn-only: true` on a workspace with 3 critical violations exits with code 0 and reports 3 warnings
   - Validation: Action with `fail-on: critical` on a workspace with 1 critical + 2 high violations exits with code 1 (blocked by critical)
   - Validation: Action with `fail-on: high` on a workspace with 0 critical + 0 high + 5 medium violations exits with code 0

3. **H3: `.claws/` caching reduces CI compile time from 8s to <1s on unchanged workspaces** — The action caches `.claws/compiled/` and `.claws/cache/` directories between workflow runs using `actions/cache` with a hash key derived from workspace file content hashes. On cache hit, `claws pinch` skips recompilation (hash-based cache check) and runs analysis on the cached GovernanceIR. The cache key includes `claws.json` hash + workspace file hashes for correct invalidation on any governance-relevant change.
   - Validation: First run compiles in ~8s; second run with unchanged files completes in <1s (cache hit)
   - Validation: Changing TOOLS.md invalidates cache (different hash key), triggering full recompile
   - Validation: Changing README.md does NOT invalidate cache (not a governance-relevant file)

## Summary

This plan delivers the `@bic/claws-action` GitHub Action for CI/CD integration of the claws governance compiler. The action wraps claws CLI commands with GitHub-native features: SARIF output for code scanning annotations, `actions/cache` for `.claws/` directory caching, matrix strategy support for fleet scanning, and configurable severity gating for gradual adoption. The 4-stage pipeline covers the full CI/CD lifecycle from pre-commit to fleet cron. SARIF is the universal CI format (6 surveyed tools support it per CL-05). The action is published to GitHub Marketplace.

## Coverage Contract

### Specs
- [ ] CL-05 -- CI/CD pipeline: 4 stages, SARIF output, 7 CI-specific flags, gradual adoption path
- [ ] CL-01 -- CLI flags consumed by action: --format sarif, --diff, --fail-on, --warn-only, --ci, --sign

### Concept Guides
- [ ] docs/claws/cicd/github-action.md -- NEW: action setup, inputs, outputs, workflow examples
- [ ] docs/claws/cicd/gradual-adoption.md -- NEW: 8-week adoption ramp with workflow templates

### Scenario Coverage
- [ ] cicd/pr-sarif-annotation -- PR check produces SARIF with inline annotations
- [ ] cicd/pre-commit-staged -- Stage 0 pre-commit checks staged files only
- [ ] cicd/cd-gate-comply -- Stage 2 CD gate runs comply with signing
- [ ] cicd/fleet-cron-scan -- Stage 3 fleet scan via matrix strategy
- [ ] cicd/warn-only-mode -- warn-only: true reports warnings, exits 0
- [ ] cicd/fail-on-severity -- fail-on: high blocks on high+, passes medium
- [ ] cicd/cache-hit -- unchanged workspace uses cached .claws/, completes <1s
- [ ] cicd/cache-miss -- changed TOOLS.md invalidates cache, triggers recompile
- [ ] cicd/gradual-week1 -- Week 1 config: CI only, warn-only
- [ ] cicd/gradual-week8 -- Week 8 config: full pipeline, fail-on: all

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 10 | SARIF generation (3), severity gating logic (3), cache key computation (2), action input parsing (2) |
| L1 integration | 5 | SARIF upload validation (1), cache invalidation (2), stage pipeline wiring (2) |
| L2 e2e | 3 | Full action run per stage (0, 1, 2) on fixture workspace with mock GitHub API |
| L3 acceptance | 2 | Live GitHub Actions workflow run on test repo with real SARIF upload |

## Scope

- `claws-action/action.yml` (NEW) -- GitHub Action metadata: inputs, outputs, branding
- `claws-action/scripts/run.sh` (NEW) -- Composite action entry: parse inputs, run claws command, upload SARIF
- `claws-action/scripts/sarif-upload.sh` (NEW) -- SARIF upload to GitHub Code Scanning via gh CLI
- `claws-action/scripts/cache-key.sh` (NEW) -- Cache key computation from workspace file hashes
- `claws-action/.github/workflows/test.yml` (NEW) -- Self-test workflow for the action itself
- `claws-action/examples/basic.yml` (NEW) -- Minimal workflow example: PR check with SARIF
- `claws-action/examples/gradual.yml` (NEW) -- Gradual adoption workflow with warn-only ramp
- `claws-action/examples/fleet.yml` (NEW) -- Fleet scan workflow with matrix strategy

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- CI/CD action inputs/outputs finalized, SARIF schema documented

### Action Source (claws-action)
- [ ] claws-action/action.yml -- inputs (stage, format, fail-on, warn-only, framework, cache), outputs (sarif-file, violation-count, exit-code)
- [ ] claws-action/scripts/run.sh -- composite action entry: input parsing → claws CLI invocation → SARIF upload → exit code
- [ ] claws-action/scripts/sarif-upload.sh -- SARIF upload to GitHub Code Scanning via gh CLI
- [ ] claws-action/scripts/cache-key.sh -- hash key from claws.json + SOUL.md + TOOLS.md + AGENTS.md + MEMORY.md + IDENTITY.md + USER.md + HEARTBEAT.md + skills/ + lobster.yaml
- [ ] claws-action/examples/basic.yml -- PR check workflow template
- [ ] claws-action/examples/gradual.yml -- 8-week gradual adoption template
- [ ] claws-action/examples/fleet.yml -- fleet scan with matrix

### Tests
- [ ] claws-action/tests/action.bats -- composite action integration tests (input parsing, claws invocation, SARIF upload, exit codes)
- [ ] claws-action/tests/cache-key.bats -- cache key computation, file inclusion/exclusion

### Infrastructure Reuse
- [ ] Reuse `claws-base-cli/src/output/format-sarif.ts` -- SARIF 2.1.0 schema and serialization
- [ ] Reuse `claws-cli/src/core/cache.ts` -- hash-based cache check logic (adapted for CI context)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- GitLab CI / Azure DevOps / Bitbucket Pipelines adapters (CL-05 open question #2, deferred)
- GitHub App integration (webhook-based vs action-based -- different distribution model)
- Self-hosted runner configuration (documented in examples, not implemented)
- Fleet management dashboard (fleet commands exist, dashboard is enterprise UI scope)
- Signing key management in CI (claws comply --sign uses CLAWS_SIGN_KEY env var, key provisioning is ops)
- Action marketplace publishing automation (manual for v1)

## Notes

- The action is a composite action that shells out to the claws CLI — no TypeScript src/ directory needed. This means the user must have claws installed (via npm or binary). A setup step (`npm install -g @bic/claws-cli`) is included in the examples. All severity gating, stage selection, and SARIF generation logic lives in the claws CLI itself; the action is a thin shell wrapper.
- SARIF 2.1.0 is the universal CI format -- ESLint, Semgrep, Snyk, Trivy, Checkov, and Ruff all support it (CL-05 constraint).
- The `--diff $BASE` flag enables incremental scanning: only files changed since the PR base are analyzed. This dramatically reduces CI time for large workspaces.
- Cache key computation uses SHA-256 hashes of the 9 governance-relevant files (plus claws.json). Non-governance files (README.md, package.json) do NOT affect the cache key.
- The action is published as `@bic/claws-action` on GitHub Marketplace. Location in monorepo: `claws-action/` directory (or separate repo -- decision deferred to implementation).
- Depends on claws-cli-foundation (CLI must exist), claws-base-cli (SARIF formatter must exist).
- **Stages 0-1 (pre-commit hook + PR check) can ship in Anubis wave** using Phase 1 CLI + Phase 2 SARIF. Stages 2-3 (CD gate + fleet cron) ship in Ra wave. The 8-week gradual adoption ramp should begin during Anubis so engineering teams are already running governance checks in CI by the time compliance features (Ra) ship. Phasing: Anubis (stages 0-1), Ra (stages 2-3).
