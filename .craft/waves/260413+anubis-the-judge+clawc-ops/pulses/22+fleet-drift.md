---
pulse: 22
slug: fleet-drift
plan: claws-fleet-ops
depends_on: [20]
governing_roles: [claws:platform-eng, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 22: Fleet Drift Detection

## Objective

Implement fleet-level governance drift detection. Each workspace's governance state is hashed (SHA-256 of claws.json + policies/ + governance-ir.json) and compared against a fleet baseline. Deviations are classified by severity: CRITICAL for trust tier downgrades, HIGH for policy removals, LOW for minor configuration changes. An exception registry allows approved deviations to be recorded so they don't fire as false positives.

Drift detection is the continuous compliance mechanism — it tells fleet operators which workspaces have diverged from the approved baseline and how urgently each deviation needs attention.

## Deliverables

- [ ] `claws-sdk/src/fleet/drift.ts` — Compute governance hash per workspace: hash files in lexicographic sort order, normalize line endings to LF before hashing, SHA-256 of concatenated hashes of claws.json + policies/ files + governance-ir.json; compare against baseline hash; return DriftResult with workspace path, expected hash, actual hash, drift detected boolean. Document that drift baselines are generated per-platform
- [ ] `claws-sdk/src/fleet/baseline.ts` — Establish fleet baseline: compute governance hash for a reference workspace, store as fleet baseline in fleet manifest (`.claws/fleet-manifest.json`); load and compare baseline
- [ ] `claws-sdk/src/fleet/severity.ts` — Classify drift severity: CRITICAL (trust tier lowered, e.g., T3→T1), HIGH (policy removed or deny constraint deleted), LOW (minor config change like metadata update); severity determined by semantic analysis of what changed, not just hash difference
- [ ] `claws-sdk/src/fleet/exception.ts` — Exception registry: approved deviations stored in `.claws/fleet-exceptions.json`; each exception has workspace pattern, reason, approver, expiry date; matching exceptions suppress drift alerts
- [ ] `claws-cli/src/commands/drift.ts` — CLI command: `claws drift [--fleet dir] [--baseline name] [--json]`
- [ ] `claws-sdk/tests/fleet/drift.unit.test.ts` — L0 unit tests (6 tests)
- [ ] `claws-sdk/tests/fleet/drift.integration.test.ts` — L1 integration tests (2 tests)
- [ ] `claws-sdk/tests/fleet/drift.e2e.test.ts` — L2 e2e: scan 3 fixture workspaces → establish baseline from governed → modify one workspace (lower trust tier) → drift detect → verify CRITICAL severity on modified workspace, clean on others

## Acceptance Criteria

- [ ] `claws drift` computes governance hash for each workspace and compares against baseline
- [ ] CRITICAL severity assigned when trust tier is lowered
- [ ] HIGH severity assigned when a policy file is removed
- [ ] LOW severity assigned for minor config changes
- [ ] Exception registry suppresses alerts for approved deviations
- [ ] `--json` outputs structured DriftResult array
- [ ] Baseline can be established from any governed workspace
- [ ] Workspaces without baseline comparison are flagged as "no baseline"
- [ ] Same workspace produces same drift hash on Windows and Linux (lexicographic sort + LF normalization)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — fleet architecture, workspace hashing conventions
- `.craft/roles/claws/ciso.md` — drift severity model, compliance requirements, exception governance

## Dependencies

Pulse 20 (fleet-scan) — requires workspace discovery and classification infrastructure.

## Test Gates

- [ ] L0 unit (6 tests): governance hash computation is deterministic, baseline comparison detects drift, CRITICAL severity for trust tier downgrade, HIGH severity for policy removal, LOW severity for minor config change, exception matching suppresses known deviations
- [ ] L1 integration (2 tests): drift detection across 3 fixture workspaces with one drifted workspace detected correctly, exception registry suppresses alert for approved deviation
- [ ] L2 e2e (1 test): scan 3 fixtures → establish baseline → modify one workspace (lower trust tier) → drift detect → verify CRITICAL on modified, clean on others
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
