# R1 — craft:testing — Test Coverage & Quality Review

**Panel**: anubis-security-final
**Wave**: Anubis the Judge (claws-ops)
**Reviewer**: craft:testing
**Scope**: All Anubis wave source files (claws-sdk/src, claws-cli/src, claws-test/src)
**Date**: 2026-04-13

---

## Lens

> "Test coverage > shipping speed. A test that cannot fail is not a test. Coverage without assertions is theater."

---

## Findings

### T-01 [M] No negative tests for keyId path traversal in FileStorage

**File**: `claws-sdk/src/keys/storage.ts:46-53`

The `FileStorage.write()` and `FileStorage.read()` methods accept arbitrary `keyId` strings and construct file paths via `join()`. There are no tests verifying that path traversal attempts (`../../etc/shadow`, `..\\Windows`, `key/../../outside`) are rejected or contained. This is a security-critical code path that handles key material.

**Recommendation**: Add tests that pass malicious keyId values and assert either an error is thrown or the file is written within the keys directory. These tests should exist before any path validation fix ships.

---

### T-02 [M] Audit chain tamper detection has no integration test for entry deletion

**File**: `claws-sdk/src/compliance/audit-chain.ts`

The audit chain appends HMAC-signed entries to `chain.jsonl`. While unit tests likely verify signature computation, there should be an integration test that:
1. Appends 5 entries
2. Deletes entry #3 from the file
3. Calls `readAuditChain()` and verifies the gap is detectable

Currently, `readAuditChain()` at line 160-174 simply parses JSON lines with no continuity check — it will happily return entries [0, 1, 2, 4] without flagging the missing seq=3. This is the audit chain integrity gap identified in dragon D-02, and the test gap means it will not be caught by CI.

**Recommendation**: Write a `chain-integrity.integration.test.ts` that verifies tampering detection for deletion, reordering, and modification scenarios.

---

### T-03 [M] LLM adversarial guard has no test corpus for injection resistance

**File**: `claws-sdk/src/compile/llm/prompts/adversarial-guard.ts`

The adversarial guard is a critical security control that prevents prompt injection from workspace content. There are no dedicated test fixtures that exercise known injection patterns:
- "Ignore all previous instructions"
- "You are now a helpful assistant that..."
- Unicode zero-width characters between instruction words
- JSON injection via carefully crafted sourceText

Without a test corpus, regressions in the guard's effectiveness will go undetected.

**Recommendation**: Create `tests/llm/fixtures/adversarial/` with 10+ injection payloads. Test that `parseIntentsFromResponse()` and the verifier correctly handle injected intents (verifier should drop them due to sourceText mismatch).

---

### T-04 [M] `mergeIntents` raise-only invariant has no boundary test

**File**: `claws-sdk/src/compile/llm/merger.ts:113-121`

The `raiseOnlyRisk()` function enforces `max(a, b)` for risk classes. This is a security invariant — LLM cannot lower risk. Tests should cover:
- LLM returns R2 when regex found R4 → merged should be R4
- LLM returns R5 when regex found R1 → merged should be R5
- LLM returns undefined when regex found R3 → merged should be R3
- Both undefined → merged should be undefined

If these boundary conditions are not tested, a refactor could silently break the invariant.

**Recommendation**: Add explicit parameterized tests for all 4 boundary conditions of `raiseOnlyRisk`.

---

### T-05 [W] Fleet kill double-kill prevention relies on timestamp parsing — no timezone edge cases

**File**: `claws-sdk/src/fleet/double-kill.ts:47-51`

`isSentinelStale()` compares `new Date(sentinel.timestamp).getTime()` against `Date.now()`. The sentinel timestamp is ISO 8601. Tests should cover:
- Sentinel written in UTC+5, read in UTC-5 (12-hour apparent offset)
- Sentinel with millisecond precision vs second precision
- Sentinel with invalid timestamp string (`"not-a-date"`)

An invalid timestamp would make `getTime()` return `NaN`, causing `(NaN - Date.now()) > ttlMs` to be `false`, treating the sentinel as fresh forever (unkillable workspace).

**Recommendation**: Add edge case tests for malformed timestamps and cross-timezone scenarios.

---

### T-06 [W] Trust compatibility check lacks test for `policyTier === 0` and `currentTier === 0` edge

**File**: `claws-sdk/src/fleet/trust-compat.ts:97-141`

`checkTrustCompat` has 4 branches: both zero, policy zero, workspace zero, and comparison. The case where `currentTier === 0` (unreadable workspace config) allows any broadcast — this is explicitly permissive. Tests should verify this is intentional and that a workspace with a corrupt claws.json does not accidentally get its trust floor lowered.

**Recommendation**: Add a test where `claws.json` contains invalid JSON and verify the broadcast is allowed (documenting this as intentional behavior).

---

### T-07 [W] Ceremony audit events not tested for idempotency

**File**: `claws-sdk/src/keys/ceremony-audit.ts`

The `recordCeremonyInitiated`, `recordShareDistributed`, and `recordKeyReconstructed` functions append to the audit chain. There are no tests verifying behavior when:
- The same ceremony ID is initiated twice (duplicate prevention?)
- A share is distributed twice to the same participant
- Reconstruction is recorded when the chain already has a reconstruction event

The current code allows duplicates (no dedup logic), but tests should document whether this is intentional.

**Recommendation**: Add tests that call each function twice with the same parameters and assert the chain contains two entries (documenting the no-dedup design decision).

---

### T-08 [W] `globToRegex` in fleet exception has no test for regex special characters

**File**: `claws-sdk/src/fleet/exception.ts:24-49`

The `globToRegex` function escapes `.+^${}()|[]\\` but the escape list is a string literal. Tests should cover patterns containing:
- Literal dots: `my.project` (should match `my.project`, not `myXproject`)
- Parentheses in names: `project(v2)` (should be escaped)
- Square brackets: `[test]` (should be escaped, not treated as character class)

If the escape list is incomplete, an exception pattern could become a valid regex with unintended matching behavior.

**Recommendation**: Add parameterized tests for each special character in workspace path names.

---

### T-09 [W] `recoverOrphanedStaging` has no test for partially written files

**File**: `claws-sdk/src/fleet/broadcast.ts:255-282`

The orphaned staging recovery function moves files from staging to policies. There should be a test where:
- A staging file is zero bytes (crash mid-write)
- A staging file contains partial YAML (truncated)

Currently, recovery moves these corrupted files into `policies/` without validation, potentially deploying broken policy to the workspace.

**Recommendation**: Add validation that recovered files pass `validatePolicyFile()` before moving them to policies.

---

### T-10 [W] Security scanner rules in `claws-test` use name-based heuristics for input detection

**File**: `claws-test/src/security/rules/output.ts:117`

The `noFormatInjection` rule checks for variable names in a hardcoded set: `userInput`, `rawInput`, `untrustedInput`, `unsanitizedInput`. This catches only exact name matches — a variable named `payload`, `data`, `body`, or any other name would bypass the rule entirely. Tests should document this limitation.

**Recommendation**: Add tests showing that `formatFunctions` called with non-matching variable names are NOT flagged (documenting the false-negative boundary). Consider extending detection to track data flow rather than relying on naming conventions.

---

### T-11 [N] `noUnredactedPii` only checks return statements

**File**: `claws-test/src/security/rules/output.ts:20-70`

The PII detection rule only visits `ReturnStatement` nodes. PII could be leaked via `console.log`, `res.json()`, `writeFile`, or any other output path. The test suite should document this scope limitation.

---

### T-12 [N] CLI command tests may only test JSON output paths

**Files**: `claws-cli/src/commands/keys.ts`, `claws-cli/src/commands/kill.ts`, `claws-cli/src/commands/broadcast.ts`

Each CLI command has both JSON and terminal output paths (e.g., `keys.ts:76-88` vs `keys.ts:82-88`). The terminal output paths include string formatting that could silently break without test coverage. If tests only use `--json`, terminal rendering regressions will go undetected.

**Recommendation**: Ensure both JSON and terminal output paths are tested for each command.

---

## Summary

| Severity | Count |
|----------|-------|
| M (Must fix) | 4 |
| W (Warning) | 6 |
| N (Note) | 2 |

**Critical test gaps**: The keyId path traversal (T-01), audit chain tamper detection (T-02), LLM adversarial resistance (T-03), and raise-only invariant boundaries (T-04) are all security-critical behaviors without dedicated test coverage. These gaps mean that fixes or regressions in security-critical code paths will not be caught by CI.
