---
pulse: 7
slug: security-hardening-keys
plan: claws-protect
depends_on: [4]
governing_roles: [claws:ciso, claws:platform-eng]
scenario_codes: [obo-elicitation/S03, obo-elicitation/S04]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 5
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 07: Security Hardening — Key Material Protection

## Objective

Address four THOTH-FINDINGS related to key material security:

**S-02 (plaintext .env keys):** Key material stored in `.env` files has no file permission restrictions. On shared systems, other users can read the file. Fix: apply `chmod(0o600)` to `.env` files on write and warn when plaintext key storage is detected.

**S-04 (signing key in JS heap):** The signing key is loaded into a standard JavaScript string, which is immutable and persists in the V8 heap until garbage collected — potentially visible in heap dumps. Fix: use `Buffer` for all signing key material and explicitly zero the buffer (`buffer.fill(0)`) after use.

**S-06 (HMAC key co-located with audit chain):** If the HMAC key is stored in the same directory as the audit chain file, an attacker who gains read access to the directory can both read the chain and forge entries. Fix: add a doctor check that warns when the HMAC key and audit chain are co-located.

**D-05 (key rotation rollback leaves orphaned archive):** When key rotation fails after the old key has been archived but before the new key is activated, the archived key material is left on disk without cleanup. Fix: clean up archived key material when rotation fails, restoring the previous state.

**Integration Coverage Hardening:** Addresses keys area integration coverage gap (68% → 90%+ target) identified in the THOTH-INTEGRATION-COVERAGE analysis.

## Deliverables

- [ ] `claws-sdk/src/protect/storage.ts` (EDIT) — apply `chmod(0o600)` on `.env` file write via `fs.chmod` or `fs.writeFile` mode option. Add warning log when plaintext key storage is detected (key material in non-encrypted file).
- [ ] `claws-sdk/src/publish/key-resolution.ts` (EDIT) — use `Buffer.from()` for signing key material instead of string. Add `try/finally` block that calls `keyBuffer.fill(0)` after signing operations complete.
- [ ] `claws-sdk/src/audit/audit-chain.ts` (EDIT) — add doctor check function `checkKeyColocation(chainPath, keyPath): DiagnosticResult` that warns if both paths resolve to the same directory.
- [ ] `claws-sdk/src/keys/rotate.ts` (EDIT) — wrap rotation in try/catch: on failure after archive, delete the archived copy and restore the original key file. Log the rollback action. All key comparison operations use `crypto.timingSafeEqual` to prevent timing side-channel leaks.
- [ ] `claws-sdk/tests/protect/storage-permissions.unit.test.ts` — L0: .env file written with 0o600 permissions verified via `fs.stat` (1 test), plaintext key storage triggers warning log (1 test), key comparison uses timingSafeEqual (verified by mock) (1 test)
- [ ] `claws-sdk/tests/publish/key-zeroing.unit.test.ts` — L0: key material Buffer is filled with zeros after signing operation completes (1 test)
- [ ] `claws-sdk/tests/keys/rotation-rollback.unit.test.ts` — L0: failed rotation cleans up archived key and restores original (1 test), successful rotation preserves archive and activates new key (1 test)
- [ ] `claws-sdk/tests/protect/key-security.integration.test.ts` — L1: full key lifecycle with permission checks — generate, store, verify permissions, use, zero (1 test), rotation rollback scenario — archive, fail, verify cleanup and restoration (1 test)
- [ ] `claws-sdk/tests/keys/key-lifecycle.integration.test.ts` — L1: full key lifecycle: generate → list → rotate → revoke (THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/keys/key-ceremony.integration.test.ts` — L1: key ceremony M-of-N threshold validation (THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/keys/rotation-rollback.integration.test.ts` — L1: key rotation rollback on failure with archive cleanup (THOTH-INTEGRATION-COVERAGE)
- [ ] `claws-sdk/tests/protect/security-hardening-keys.e2e.test.ts` — L2: full key material lifecycle — generate key, verify 0o600 permissions, use for signing with Buffer, verify zeroing, rotate with rollback on failure, confirm cleanup
- [ ] `claws-sdk/tests/protect/security-hardening-keys.accept.test.ts` — L3: SDK acceptance — consumer exercises key generation, storage, rotation, and doctor colocation check through public APIs and validates security invariants hold

## Acceptance Criteria

- [ ] `.env` files created by the storage module have 0o600 permissions (owner read/write only)
- [ ] Warning logged when plaintext key material is written to non-encrypted storage
- [ ] Signing key material is held in Buffer, not string, during signing operations
- [ ] Buffer is zeroed (filled with 0x00) after signing completes (verified by reading buffer contents)
- [ ] Doctor check warns when HMAC key and audit chain are in the same directory
- [ ] Rotation failure after archive cleans up the archived key material
- [ ] Rotation failure restores the original key to its pre-rotation state
- [ ] Successful rotation preserves the archive for recovery purposes
- [ ] Key verification uses crypto.timingSafeEqual, not === or Buffer.compare
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — key material security, file permission requirements, heap safety
- `.craft/roles/claws/platform-eng.md` — Node.js Buffer patterns, file permission APIs, rotation state machine

## Dependencies

- Pulse 04 (secrets-vault): vault storage patterns inform key material handling

## Test Gates

- [ ] L0 unit (6 tests): .env 0o600 permissions (1), plaintext key storage warns (1), key Buffer zeroed after use (1), failed rotation cleans up archive (1), successful rotation preserves archive (1), key comparison uses timingSafeEqual (verified by mock) (1)
- [ ] L1 integration (5 tests): full key lifecycle with permission checks (1), rotation rollback scenario (1), full key lifecycle: generate → list → rotate → revoke (1), key ceremony M-of-N threshold validation (1), key rotation rollback on failure with archive cleanup (1)
- [ ] L2 e2e (1 test): full key material lifecycle with permissions, signing, zeroing, and rotation rollback
- [ ] L3 accept (1 test): SDK acceptance — key generation, storage, rotation, and doctor check through public APIs
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
