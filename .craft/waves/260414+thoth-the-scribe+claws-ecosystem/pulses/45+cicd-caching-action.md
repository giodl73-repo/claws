---
pulse: 45
slug: cicd-caching-action
plan: claws-cicd-action
depends_on: [43, 44]
governing_roles: [craft:architect, claws:platform-eng, claws:ciso]
scenario_codes: [platform-detection/S05, platform-detection/S06, platform-detection/S07]
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 1
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-action && bats tests/"
  typecheck:
    - "echo 'shell scripts — no typecheck'"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 45: Caching via actions/cache

## Objective

`.claws/` directory caching via actions/cache. The cache key is computed as the SHA-256 of `claws.json` plus the 9 governance files. A cache hit skips recompilation (<1s vs ~8s cold). Non-governance files (e.g., README.md) do not affect the cache key, preventing unnecessary cache invalidation.

This pulse also delivers a fleet scan workflow with matrix strategy, enabling organizations to run claws across multiple repositories in parallel with shared caching. The self-test workflow validates the action itself in CI.

## Deliverables

NOTE: bats (Bash Automated Testing System) must be available globally. Install via `npm install -g bats` or OS package manager.

- [ ] `claws-action/scripts/cache-key.sh` — cache key computation from governance file hashes
- [ ] `claws-action/scripts/run.sh` (EDIT) — integrate actions/cache for .claws/ directories
- [ ] `claws-action/examples/fleet.yml` — fleet scan workflow with matrix strategy
- [ ] `claws-action/.github/workflows/test.yml` — self-test workflow for the action
- [ ] `claws-action/tests/cache-key.bats` — L0: cache key includes governance files (1), README change doesn't affect key (1)
- [ ] `claws-action/tests/cache-pipeline.bats` — L1: cache hit vs miss behavior (1)
- [ ] `claws-action/tests/cache-e2e.bats` — L2: full action with cache on fixture workspace (1)
- [ ] L3 acceptance (2 tests documented as manual): live GitHub Actions workflow run on test repo (1), real SARIF upload verification (1)

## Acceptance Criteria

- [ ] Cache key is SHA-256 of claws.json + 9 governance files
- [ ] Cache hit skips recompilation and completes in <1s
- [ ] Changes to README.md do not invalidate the cache
- [ ] Fleet scan workflow uses matrix strategy for multi-repo scanning
- [ ] Self-test workflow validates the action in CI
- [ ] actions/cache integration restores and saves .claws/ directories correctly

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/platform-eng.md` — CI/CD platform engineering standards

## Dependencies

- Pulse 43 (cicd-sarif-pipeline) — base action structure
- Pulse 44 (cicd-severity-gating) — severity inputs used in fleet workflows

## Test Gates

- [ ] L0 unit (2 tests): cache key includes governance files, README change doesn't affect key
- [ ] L1 integration (1 test): cache hit vs miss behavior
- [ ] L2 e2e (1 test): full action with cache on fixture workspace
- [ ] L3 acceptance (2 tests, manual): live GitHub Actions workflow run, real SARIF upload verification
- [ ] `shellcheck scripts/*.sh` exits 0
