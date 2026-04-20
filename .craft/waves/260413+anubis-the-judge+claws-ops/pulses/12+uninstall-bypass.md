---
pulse: 12
slug: uninstall-bypass
plan: claws-init-uninstall
depends_on: [10]
governing_roles: [claws:ciso, craft:architect]
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
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 12: Uninstall + Bypass

## Objective

Implement the uninstall command and bypass mode for claws. Uninstall provides a clean removal path: it backs up .claws/ to ~/.claws-backups/{workspace-hash}/{timestamp}/, removes the .claws/ directory, reverts any .gitignore additions made by init, and archives the audit chain separately so it survives uninstall. The operation is idempotent — running uninstall when .claws/ doesn't exist is a no-op.

Bypass mode allows developers to temporarily disable enforcement without removing claws. When CLAWS_BYPASS=1 is set, all enforcement returns "allowed" but every call is recorded in the audit chain. Fleet policy can prohibit bypass entirely via fleet.allowBypass, giving organizations control over whether developers can bypass governance.

## Deliverables

- [ ] `claws-sdk/src/init/uninstall.ts` — backup .claws/ to ~/.claws-backups/{workspace-hash}/{timestamp}/, remove .claws/, revert .gitignore additions, archive audit chain separately
- [ ] `claws-sdk/src/init/bypass.ts` — detect CLAWS_BYPASS=1, check fleet.allowBypass policy, record BYPASS_ACTIVATED to audit chain, return "allowed" for all enforcement
- [ ] `claws-cli/src/commands/uninstall.ts` — thin CLI adapter for uninstall command
- [ ] `claws-sdk/tests/init/uninstall.unit.test.ts` — L0: 4 unit tests for uninstall
- [ ] `claws-sdk/tests/init/bypass.unit.test.ts` — L0: 2 unit tests for bypass
- [ ] `claws-sdk/tests/init/uninstall.integration.test.ts` — L1: 2 integration tests
- [ ] `claws-sdk/tests/init/uninstall-roundtrip.e2e.test.ts` — L2: 1 e2e test

## Acceptance Criteria

- [ ] `claws uninstall` creates backup in ~/.claws-backups/ with workspace hash and timestamp
- [ ] After uninstall, .claws/ directory does not exist
- [ ] After uninstall, .gitignore no longer contains .claws/keys/ and .claws/secrets/ entries added by init
- [ ] Audit chain is archived to backup location separately and survives uninstall
- [ ] Running uninstall when .claws/ doesn't exist is a no-op (exit 0)
- [ ] CLAWS_BYPASS=1 causes all enforcement to return "allowed"
- [ ] CLAWS_BYPASS=1 records BYPASS_ACTIVATED event in audit chain
- [ ] fleet.allowBypass=false prevents bypass even when CLAWS_BYPASS=1 is set
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — security posture, audit chain integrity, bypass governance
- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, backup strategies

## Dependencies

- Pulse 10: init orchestrator (uninstall reverses what init creates)

## Test Gates

- [ ] L0 unit: 6 tests — backup creation, .gitignore restore, idempotency (no-op when absent), bypass detection from env var, fleet prohibition overrides bypass, audit recording on bypass
- [ ] L1 integration: 2 tests — uninstall round-trip produces byte-identical workspace, bypass audit chain contains BYPASS_ACTIVATED event
- [ ] L2 e2e: 1 test — init → uninstall → init produces same workspace state as fresh init
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
