---
pulse: 4
slug: crypto-internalize
plan: claws-sdk-graduation
depends_on: []
governing_roles: [craft:security, claws:platform-eng]
scenario_codes: [crypto/S01, crypto/S04]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 04: Crypto Internalize

## Objective

Rewrite all cryptographic operations using Node.js `crypto` directly, eliminating the dependency on compiler-sdk and agent-sdk crypto modules. ~250 lines total. The free tier needs four cryptographic primitives: AES-256-GCM (symmetric encryption for local vault), HMAC-SHA256 (message authentication for content integrity), SHA-256 (content hashing for cache keys and audit entries), and Ed25519 keypair (signing for audit chain and tamper detection).

This is the security foundation for the free tier. Ed25519 signing is in the free tier per R1 review finding C6 -- HMAC-only audit is cryptographically insufficient. RFC3161 timestamps and fleet-wide key management remain paid-tier features.

## Deliverables

- [ ] `claws-sdk/src/compiler/crypto/aes.ts` -- AES-256-GCM encrypt/decrypt using Node.js `crypto.createCipheriv`/`createDecipheriv`. Random IV generation, authentication tag validation. For local vault encryption
- [ ] `claws-sdk/src/compiler/crypto/hmac.ts` -- HMAC-SHA256 sign/verify using Node.js `crypto.createHmac`. For content integrity verification
- [ ] `claws-sdk/src/compiler/crypto/hash.ts` -- SHA-256 hashing using Node.js `crypto.createHash`. Content-addressable hashing for cache keys and audit entries. Supports string and Buffer inputs
- [ ] `claws-sdk/src/compiler/crypto/ed25519.ts` -- Ed25519 keypair generation using `crypto.generateKeyPairSync('ed25519')`, sign using `crypto.sign`, verify using `crypto.verify`. For audit chain signing. Local key storage (PEM format)
- [ ] `claws-sdk/src/compiler/crypto/keys.ts` -- Key management: generate keypair, load from PEM file, save to PEM file, key fingerprint (SHA-256 of public key). Local-only -- fleet key distribution is paid
- [ ] `claws-sdk/src/compiler/crypto/index.ts` -- Barrel exports for all crypto primitives
- [ ] `claws-sdk/tests/compiler/crypto/aes.unit.test.ts` -- L0: encrypt→decrypt round-trip (1), wrong key fails decryption (1), tampered ciphertext fails authentication (1)
- [ ] `claws-sdk/tests/compiler/crypto/ed25519.unit.test.ts` -- L0: keypair generation produces valid pair (1), sign→verify round-trip (1), wrong key fails verification (1), signature is deterministic for same input (1)
- [ ] `claws-sdk/tests/compiler/crypto/hash.unit.test.ts` -- L0: SHA-256 matches known test vector (1)
- [ ] `claws-sdk/tests/compiler/crypto/crypto.integration.test.ts` -- L1: AES + HMAC pipeline (encrypt then HMAC the ciphertext) (1), Ed25519 sign + SHA-256 hash pipeline (1), keypair save→load from PEM round-trip (1), cross-verification: sign with key A, fail verify with key B (1)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` -- all crypto uses Node.js `crypto` directly
- [ ] AES-256-GCM uses random 12-byte IV per encryption (never reuses IV)
- [ ] Ed25519 keypair generation is deterministic when seeded (for testing) and random in production
- [ ] All crypto functions are synchronous (no async needed for Node.js crypto)
- [ ] PEM key files use standard format readable by OpenSSL
- [ ] SHA-256 output matches known test vectors (NIST examples)
- [ ] No third-party crypto dependencies -- Node.js `crypto` module only
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/security.md` -- cryptographic standards, key management, audit signing requirements
- `.craft/roles/claws/platform-eng.md` -- SDK module patterns, Node.js crypto usage conventions

## Dependencies

None -- crypto is a leaf module with no dependencies on other graduation pulses.

## Test Gates

- [ ] L0 unit (8 tests): AES round-trip (1), AES wrong key (1), AES tampered ciphertext (1), Ed25519 keypair valid (1), Ed25519 sign→verify (1), Ed25519 wrong key (1), Ed25519 deterministic (1), SHA-256 test vector (1)
- [ ] L1 integration (4 tests): AES+HMAC pipeline (1), Ed25519+SHA-256 pipeline (1), PEM round-trip (1), cross-key verification failure (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
