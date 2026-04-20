---
pulse: 10
slug: init-orchestrator
plan: claws-init-uninstall
depends_on: [6]
governing_roles: [claws:platform-eng, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 10: Init Orchestrator

## Objective

Build the full `claws init` orchestrator that transforms an empty or existing workspace into a claws-governed environment. The orchestrator detects the workspace platform from marker files (package.json, pyproject.toml, Cargo.toml, etc.), creates a claws.json configuration with the detected platform and T2 default trust tier, and scaffolds the .claws/ sidecar directory with all 13 required subdirectories.

The init command must be idempotent (running twice produces the same result), auto-append .claws/keys/ and .claws/secrets/ to .gitignore, and use well-defined exit codes: 0 for success, 2 for already-initialized workspaces. All business logic lives in claws-sdk/src/init/ per the SDK-owns-logic rule; claws-cli/src/commands/init.ts is refactored to be a thin CLI adapter that calls the SDK.

## Deliverables

- [ ] `claws-sdk/src/init/index.ts` — public API barrel export for init module
- [ ] `claws-sdk/src/init/orchestrator.ts` — init orchestration: platform detect → config create → sidecar scaffold → gitignore update
- [ ] `claws-sdk/src/init/platform-detect.ts` — detect workspace platform from marker files (node, python, rust, go, dotnet, java, unknown)
- [ ] `claws-sdk/src/init/config-create.ts` — generate claws.json with detected platform, T2 trust tier, compiler version
- [ ] `claws-sdk/src/init/sidecar-scaffold.ts` — create .claws/ with 13 subdirectories (compiled, policies, keys, secrets, cache, audit, snapshots, migrations, plugins, templates, reports, logs, temp). Sidecar directories MUST reference CLAWS_SIDECAR_LAYOUT constant from sidecar.ts — do not invent a new directory list
- [ ] `claws-sdk/src/init/gitignore-update.ts` — append .claws/keys/ and .claws/secrets/ to .gitignore (skip if already present)
- [ ] `claws-cli/src/commands/init.ts` — refactored to thin CLI adapter calling SDK orchestrator. Remove all business logic from existing claws-cli/src/commands/init.ts — move to claws-sdk/src/init/, CLI becomes thin wrapper
- [ ] `claws-sdk/tests/init/orchestrator.unit.test.ts` — L0: 6 unit tests
- [ ] `claws-sdk/tests/init/orchestrator.integration.test.ts` — L1: 2 integration tests

## Acceptance Criteria

- [ ] `claws init` on a Node.js workspace detects platform as "node" and creates claws.json with `"platform": "node"`
- [ ] .claws/ sidecar contains exactly 13 subdirectories after init
- [ ] .gitignore contains .claws/keys/ and .claws/secrets/ entries after init
- [ ] Running `claws init` twice exits with code 2 and makes no changes
- [ ] All business logic is in claws-sdk, not claws-cli
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — platform detection, sidecar layout, cross-platform concerns
- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, monorepo structure

## Dependencies

- Pulse 6: base-cli config and platform-detect foundations

## Test Gates

- [ ] L0 unit: 6 tests — platform detect (3 marker types), config creation with defaults, sidecar scaffold (13 dirs), gitignore append (skip if present), idempotency (exit code 2), exit code 0 on fresh workspace
- [ ] L1 integration: 2 tests — init on reference workspace produces valid state, init on empty directory scaffolds complete environment
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
