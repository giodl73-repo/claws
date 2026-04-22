---
pulse: 46
slug: upstream-audit-chain
plan: claws-upstream-contrib
depends_on: []
governing_roles: [craft:architect, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd packages/audit-chain && npx vitest run"
  typecheck:
    - "cd packages/audit-chain && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 46: @openclaw/audit-chain Standalone Package

## Objective
**Execution context**: This pulse executes within the `craftworks/openclaw-governance` standalone monorepo (https://github.com/gim-home/openclaw-governance), NOT the claws repo. The test_scope paths (packages/...) are relative to that repo root. During wave execution, the openclaw-governance repo must be cloned and set up before these pulses can run.

@openclaw/audit-chain standalone package (~20KB). Hash-chained JSONL audit trails with HMAC-SHA256 integrity verification, write-ahead log (WAL) for crash recovery, and export to SARIF/CEF/JSON/syslog formats.

This is a clean-room implementation with OC-native APIs, powered by agent-sdk audit patterns. Zero `@craftworks/*` or `@claws/*` imports -- the package must be fully standalone and publishable to npm under the `@openclaw` scope with an MIT license.

## Deliverables
- [ ] `packages/audit-chain/package.json` — MIT license, zero peer deps, @openclaw/audit-chain
- [ ] `packages/audit-chain/src/chain.ts` — hash-chained JSONL: append, verify, prune, query
- [ ] `packages/audit-chain/src/wal.ts` — write-ahead log for crash recovery
- [ ] `packages/audit-chain/src/export.ts` — export to SARIF, CEF, JSON, syslog
- [ ] `packages/audit-chain/src/verify.ts` — chain integrity verification (HMAC-SHA256)
- [ ] `packages/audit-chain/src/types.ts` — AuditEvent, ChainEntry, VerifyResult types
- [ ] `packages/audit-chain/README.md` — Key provisioning guidance: HMAC keys MUST be stored outside the chain directory and rotated periodically. Document key generation via crypto.randomBytes(32).
- [ ] `packages/audit-chain/tests/chain.unit.test.ts` — L0: append creates entry (1), verify passes on clean chain (1), verify detects tamper (1), prune removes old entries (1)
- [ ] `packages/audit-chain/tests/wal.unit.test.ts` — L0: WAL persists state (1), crash recovery works (1)
- [ ] `packages/audit-chain/tests/export.unit.test.ts` — L0: CEF format (1), syslog format (1)
- [ ] `packages/audit-chain/tests/audit-chain.integration.test.ts` — L1: append + verify round-trip (1), WAL recovery after crash sim (1), multi-format export pipeline (1)
- [ ] `packages/audit-chain/tests/audit-chain.e2e.test.ts` — L2: standalone install + usage scenario (1)
- [ ] L3 acceptance: standalone npm install test (documented)

## Acceptance Criteria
- [ ] Package has zero `@craftworks/*` and zero `@claws/*` imports
- [ ] HMAC-SHA256 chain verification detects any tampered entry
- [ ] WAL enables crash recovery without data loss
- [ ] Export produces valid SARIF 2.1.0, CEF, JSON, and syslog formats
- [ ] Append + verify round-trip works end-to-end
- [ ] Package compiles standalone with `npx tsc --noEmit`
- [ ] README documents HMAC key provisioning, storage, and rotation requirements

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/founder.md` — OpenClaw upstream contribution standards

## Dependencies
None — this is the foundation package for upstream contributions.

## Test Gates
- [ ] L0 unit (8 tests): append creates entry, verify passes on clean chain, verify detects tamper, prune removes old entries, WAL persists state, crash recovery works, CEF format, syslog format
- [ ] L1 integration (3 tests): append + verify round-trip, WAL recovery after crash sim, multi-format export pipeline
- [ ] L2 e2e (1 test): standalone install + usage scenario
- [ ] L3 acceptance (1 test, documented): standalone npm install test
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
