---
pulse: 20
slug: audit-security-fixes
plan: claws-comply-audit
depends_on: [11, 12, 13, 14, 15, 16, 17, 18, 19]
governing_roles: [claws:ciso, claws:founder, craft:architect]
scenario_codes: [pitfall-thoth-1/P-200, pitfall-thoth-1/P-201, pitfall-thoth-1/P-202, pitfall-thoth-2/P-226, pitfall-thoth-2/P-227, pitfall-thoth-2/P-228, pitfall-thoth-1/P-214, pitfall-thoth-1/P-215, pitfall-thoth-1/P-216, pitfall-thoth-1/P-217, pitfall-thoth-1/P-218, pitfall-thoth-1/P-219, pitfall-thoth-1/P-220, pitfall-thoth-1/P-221, pitfall-thoth-1/P-222, pitfall-thoth-1/P-223, pitfall-thoth-1/P-224, pitfall-thoth-1/P-225]
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: true
---

# Pulse 20: Audit Security Fixes

## Objective

CP-2 gate pulse. Final validation of all THOTH-FINDINGS audit fixes (D-02 chaining hash, C-02 configurable PBKDF2, T-02 tamper detection). Run full compliance + audit test suite. Validate all 3 compliance frameworks (SOC2, HIPAA, EU AI Act) on fixture workspaces. Verify audit chain integrity with pitfall scenarios. Validates pitfall-thoth-1 P-214 through P-225 (security pitfalls: OBO escalation, A2A lateral movement, injection via governance files).

This is the checkpoint gate pulse for CP-2 (Compliance + Audit). It does not introduce new features — instead, it provides the final validation layer that confirms all preceding pulses (11-19) work correctly together and that the three THOTH-FINDINGS audit fixes are verified with dedicated regression tests.

D-02 (chaining hash): Verify that entries can no longer be deleted or reordered without detection. The chain hash model from Pulse 11 is validated end-to-end with tamper scenarios from the pitfall series.

C-02 (configurable PBKDF2): Verify that PBKDF2 iterations are configurable via claws.json and that the default (600k) is preserved. The ceremony.ts edit from Pulse 18 is validated with configuration override scenarios.

T-02 (tamper detection): Verify that all three tamper modes (delete, reorder, modify) are detected with correct break-point identification. The verify module from Pulse 12 is validated with the pitfall scenarios that originally exposed the gap.

The full compliance + audit test suite runs across all three frameworks on fixture workspaces, and the audit verify + export pipeline runs end-to-end to confirm the complete chain from append through verify through export.

## Deliverables

- [ ] `claws-sdk/tests/audit/tamper-detection.unit.test.ts` — L0: T-02 regression: delete entry → verify detects gap (1), reorder → verify detects break (1), modification → verify detects content mismatch (1)
- [ ] `claws-sdk/tests/compliance/full-comply.integration.test.ts` — L1: all 3 frameworks on reference workspace (1), evidence signing verification (1)
- [ ] `claws-sdk/tests/compliance/full-comply.e2e.test.ts` — L2: complete comply soc2 + hipaa + assess on fixture workspace (1), audit verify + export pipeline end-to-end (1)
- [ ] `claws-sdk/tests/audit/audit-security.accept.test.ts` — L3: SDK acceptance — full audit chain + compliance pipeline API from consumer perspective with tamper detection regression
- [ ] `claws-cli/tests/audit/audit-security.accept.test.ts` — L3: CLI acceptance — `claws audit verify` and `claws comply` commands produce correct output across all frameworks
- [ ] `claws-cli/tests/compliance/full-comply.accept.test.ts` — L3: CLI acceptance — gate validation: all 3 compliance commands exit 0 on reference workspaces with signed evidence

## Acceptance Criteria

- [ ] D-02 fix verified: deleted entries detected, reordered entries detected
- [ ] C-02 fix verified: PBKDF2 iterations read from claws.json, default 600k preserved
- [ ] T-02 fix verified: all three tamper modes produce correct break-point index
- [ ] SOC2 evidence generation succeeds on reference workspace
- [ ] HIPAA evidence generation succeeds on PHI workspace fixture
- [ ] EU AI Act assessment succeeds on workspace with domain markers
- [ ] All evidence packages pass signature verification
- [ ] Audit chain verify + export pipeline produces valid output end-to-end
- [ ] Full claws-sdk test suite passes: `cd claws-sdk && npx vitest run`
- [ ] Type check passes: `cd claws-sdk && npx tsc --noEmit`
- [ ] Build passes: `npm run build`

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — security fix validation, tamper detection regression, PBKDF2 configuration verification
- `.craft/roles/claws/founder.md` — compliance framework validation, checkpoint gate criteria
- `.craft/roles/craft/architect.md` — cross-module integration validation, end-to-end pipeline verification

## Dependencies

- Pulse 11 (audit-chain-foundation) — chain append/read with chained hashes
- Pulse 12 (audit-verify-integrity) — chain verification with break-point detection
- Pulse 13 (audit-wal-recovery) — WAL crash recovery for approval timeouts
- Pulse 14 (audit-witness-export) — witness receipts and multi-format export
- Pulse 15 (compliance-soc2) — SOC2 Type II evidence builder
- Pulse 16 (compliance-hipaa) — HIPAA Security Rule evidence builder
- Pulse 17 (compliance-eu-ai-act) — EU AI Act assessment engine
- Pulse 18 (artifact-signer) — signing infrastructure and PBKDF2 fix
- Pulse 19 (comply-scenario-findings) — scenario finding implementations

## Test Gates

- [ ] L0 unit (3 tests): T-02 regression: delete entry → verify detects gap (1), reorder → verify detects break (1), modification → verify detects content mismatch (1)
- [ ] L1 integration (2 tests): all 3 frameworks on reference workspace (1), evidence signing verification (1)
- [ ] L2 e2e (2 tests): complete comply soc2 + hipaa + assess on fixture workspace (1), audit verify + export pipeline end-to-end (1)
- [ ] L3 accept (3 tests): SDK acceptance — full audit + compliance pipeline API with tamper detection (1), CLI acceptance — `claws audit verify` and `claws comply` commands (1), CLI gate — all 3 compliance commands on reference workspaces (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
