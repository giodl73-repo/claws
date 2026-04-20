# R1: craft:testing Review — CP-1 Security Hardening + Protect

**Reviewer**: craft:testing
**Review type**: impl (implementation review)
**Scope**: 55 test files across claws-sdk and claws-cli, plus vitest.config.ts dual-coverage gate
**Date**: 2026-04-14

---

## Summary

CP-1 delivers an exceptionally thorough test suite for the security hardening and protect surface. 55 test files span L0 (unit) through L3 (acceptance), covering budget, vault/secrets, identity SSO, key lifecycle, fleet operations, adversarial injection, trust model integrity, watch, and doctor subsystems. The dual-coverage gate in vitest.config.ts is correctly configured with per-file 95/90/95/95 thresholds for unit tests.

**Overall assessment**: Strong. The test suite is production-grade with meaningful assertions, proper fixture isolation, and realistic adversarial scenarios. A small number of findings below.

---

## Findings

### M-01: `accept` project in vitest.config.ts only includes `tests/accept/**/*.accept.test.ts` but accept tests exist outside that path

**Severity**: M (Major)
**File**: `claws-sdk/vitest.config.ts:127`
**Detail**: The `accept` project is scoped to `tests/accept/**/*.accept.test.ts`, but 7 accept-tier tests live under `tests/protect/` (e.g., `identity.accept.test.ts`, `protect-gate.accept.test.ts`, `protect-regression.accept.test.ts`, `security-hardening-keys.accept.test.ts`, `security-hardening-trust.accept.test.ts`). Running `npx vitest run --project accept` will miss these files. They will still run under the `default` project, but the tier-based project isolation is broken for accept tests.
**Fix**: Either move the accept tests to `tests/accept/protect/` or broaden the accept project include to `tests/**/*.accept.test.ts`.

---

### M-02: Integration and e2e projects overlap — e2e tests run twice

**Severity**: M (Major)
**File**: `claws-sdk/vitest.config.ts:105-110`
**Detail**: The `integration` project includes both `tests/**/*.integration.test.ts` and `tests/**/*.e2e.test.ts`. The `e2e` project also includes `tests/**/*.e2e.test.ts`. When running all projects together, every `.e2e.test.ts` file executes twice — once under `integration` and once under `e2e`. This wastes CI time and can cause confusing coverage reports.
**Fix**: Remove `tests/**/*.e2e.test.ts` from the `integration` project's `include` array. The integration project should only include `tests/**/*.integration.test.ts`.

---

### W-01: Duplicate `makeJwt` and `rsaKeyToJwk` helpers across identity test files

**Severity**: W (Warning)
**Files**: `tests/protect/identity.unit.test.ts:29-89`, `tests/protect/identity.integration.test.ts:29-74`
**Detail**: Both the unit and integration identity tests define nearly identical `makeJwt()`, `rsaKeyToJwk()`, and DER parsing helper functions. These are complex crypto helper functions (~60 lines each) that would benefit from a shared test utility to prevent divergence.
**Fix**: Extract to a shared `tests/helpers/jwt-test-utils.ts` or `tests/fixtures/identity-helpers.ts`.

---

### W-02: Self-signed certificate construction helpers are fragile and non-trivial

**Severity**: W (Warning)
**File**: `tests/protect/identity.unit.test.ts:93-215`
**Detail**: The unit test contains ~120 lines of manual DER/ASN.1 certificate construction (`buildSelfSignedCert`, `buildCaIssuedCert`, `buildX509Name`, `buildValidity`, `buildDerSequence`, `buildTestDerLength`). While these work, they are fragile, hard to maintain, and test implementation details of the test helper rather than the SUT. A pre-generated fixture certificate pair would be more maintainable and equally valid for testing `validateSamlCertChain`.
**Fix**: Consider using pre-generated PEM fixtures checked into `tests/fixtures/certs/` instead of runtime DER construction. This makes tests faster and the helper code is itself an untested liability.

---

### W-03: `secrets.unit.test.ts` encrypt/decrypt test reimplements cipher logic rather than testing the SUT

**Severity**: W (Warning)
**File**: `tests/protect/secrets.unit.test.ts:34-63`
**Detail**: The "encrypt/decrypt roundtrip" test derives a key and then manually calls `createCipheriv`/`createDecipheriv` from node:crypto. This proves node:crypto works, not that the vault's own encrypt/decrypt functions work. The test should call the vault's `set`/`get` or internal encrypt/decrypt APIs to verify the actual implementation.
**Fix**: Test the vault's own encryption functions rather than reimplementing AES-256-GCM from scratch. If this is intentionally testing `deriveKey()` only, rename the test to clarify scope and add a note.

---

### W-04: Budget integration test does not test the `daily` period path

**Severity**: W (Warning)
**File**: `tests/protect/budget.integration.test.ts`
**Detail**: Both integration test cases call `budget(tempDir, { period: 'monthly' })`. The `daily` period code path has no integration-level test. Only the unit-level `evaluateEnforcement` tests exercise daily limits.
**Fix**: Add a test case that calls `budget()` with `{ period: 'daily' }` to verify the daily aggregation path reads today-only entries from the audit chain.

---

### W-05: Several integration tests use `require()` instead of ESM `import`

**Severity**: W (Warning)
**Files**: `tests/protect/identity.unit.test.ts:45,98,100,205`, `tests/protect/identity.integration.test.ts:44`
**Detail**: Multiple test files use `require('node:crypto')` or `const { execSync } = require('node:child_process')` instead of ESM static imports, despite the rest of the codebase using ESM consistently. The `execSync` import in `identity.unit.test.ts:98` is unused (dead code).
**Fix**: Replace `require()` calls with top-level ESM imports. Remove the unused `execSync` require.

---

### N-01: Excellent tier coverage across protect surface

**Severity**: N (Note)
**Detail**: Budget, secrets, and identity each have L0 + L1 + L2 + L3 tests, giving full tier coverage. Budget-fleet similarly has L0 + L1 + L2. Key lifecycle has L0 + L1 + L1(ceremony) + L2(accept+e2e). This is exemplary test architecture.

---

### N-02: Adversarial injection test corpus (T-03) is production-grade

**Severity**: N (Note)
**File**: `tests/compile/llm/adversarial-injection.unit.test.ts`
**Detail**: 6 adversarial vectors (instruction injection, JSON payload injection, exfiltration, roleplay, unicode obfuscation) with precise assertions on verifier outcomes (exact, relocated, mismatch). The test also verifies legitimate intents survive adversarial file content. This is among the best security test files in the checkpoint.

---

### N-03: Key zeroing test correctly validates error-path cleanup

**Severity**: N (Note)
**File**: `tests/publish/key-zeroing.unit.test.ts`
**Detail**: The key-zeroing test validates that the Buffer is filled with zeros both on happy-path completion AND when the callback throws. This is the correct pattern for testing defensive memory cleanup. The captured-buffer-reference technique is well-applied.

---

### N-04: Watch + Doctor acceptance test is comprehensive but has high timeout risk

**Severity**: N (Note)
**File**: `tests/accept/e2e/watch-doctor-commands.accept.test.ts`
**Detail**: 12 scenarios (W-1 through W-5, D-6 through D-12) with 30s timeouts each. This is thorough but represents a ~6-minute worst-case test file. The structured `PhaseResult` tracking is a nice pattern for structured test reporting. Consider whether any scenarios can share workspace setup to reduce wall-clock time.

---

### N-05: Dual-coverage gate is correctly configured

**Severity**: N (Note)
**File**: `claws-sdk/vitest.config.ts:62-74`
**Detail**: The dual-coverage gate with per-file 95/90/95/95 thresholds and the exclusion list for pure-type files is well-configured. The comment explaining unit vs integration thresholds is helpful. The coverage `include`/`exclude` lists are precise — `protect/types.ts` is correctly NOT excluded because it has runtime functions.

---

## Verdict

**2 Major** findings require attention before merge (M-01 vitest project scoping, M-02 e2e double-execution). **5 Warnings** suggest maintainability improvements. The test suite is otherwise strong, thorough, and well-structured.

| Metric | Value |
|--------|-------|
| Test files reviewed | 55 |
| L0 (unit) tests | 14 files |
| L1 (integration) tests | 19 files |
| L2 (e2e) tests | 8 files |
| L3 (accept) tests | 14 files |
| Major findings | 2 |
| Warnings | 5 |
| Notes | 5 |
