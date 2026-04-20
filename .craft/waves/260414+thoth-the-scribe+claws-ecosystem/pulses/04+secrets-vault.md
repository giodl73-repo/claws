---
pulse: 4
slug: secrets-vault
plan: claws-protect
depends_on: [1]
governing_roles: [craft:architect, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 04: Secrets Vault

## Objective

Implement AES-256-GCM encrypted vault with Argon2id key derivation (scrypt fallback for environments without Argon2id support). The vault is stored at `.claws/secrets/vault.enc` with the key derivation salt at `.claws/secrets/vault.salt`. The vault supports five operations: init (create vault with passphrase), set (encrypt and store a key-value pair), get (decrypt and retrieve a value), list (show all stored keys without values), and delete (remove a key-value pair).

Key derivation uses Argon2id with OWASP-recommended defaults (m=262144, t=4, p=4) for passphrase-to-key conversion. Parameters are configurable in claws.json under `vault.argon2id` with minimum floors: m>=65536, t>=3, p>=1. If Argon2id is unavailable (Node.js without the argon2 native module), falls back to scrypt with N=2^17, r=8, p=1. Passphrases must pass a minimum entropy check: reject passphrases shorter than 12 characters or below 40 bits entropy. The vault file format stores IV + auth tag + ciphertext per entry, making each entry independently decryptable.

This module reuses patterns from compiler-sdk integrity/ for cryptographic operations but adapts them for the vault use case (per-entry encryption vs. whole-file signing).

## Deliverables

- [ ] `claws-sdk/src/protect/secrets.ts` — vault lifecycle: `init(passphrase)` creates vault with Argon2id derivation, `set(key, value, passphrase)` encrypts with AES-256-GCM, `get(key, passphrase)` decrypts, `list()` returns stored keys, `delete(key, passphrase)` removes entry. VaultConfig from types.ts governs paths and algorithm selection. Minimum passphrase entropy check: reject passphrases shorter than 12 characters or below 40 bits entropy.
- [ ] `claws-sdk/tests/protect/secrets.unit.test.ts` — L0: key derivation produces consistent output for same passphrase+salt (1 test), encrypt/decrypt roundtrip preserves value exactly (1 test), wrong passphrase throws descriptive error (1 test), vault.enc file content is not readable as plaintext (1 test), passphrase entropy check rejects weak passphrase (1 test)
- [ ] `claws-sdk/tests/protect/secrets.integration.test.ts` — L1: full vault lifecycle init/set/get/list across multiple keys (1 test), vault persistence across sessions — init in one call, set+get in another (1 test)
- [ ] `claws-sdk/tests/protect/secrets.e2e.test.ts` — L2: full vault init + set 3 values + get all 3 + list + delete 1 + verify deletion on fixture workspace
- [ ] `claws-sdk/tests/protect/secrets.accept.test.ts` — L3: SDK acceptance — consumer calls vault init/set/get/list/delete lifecycle and validates encrypted storage, roundtrip fidelity, and error handling for wrong passphrase
- [ ] `claws-cli/tests/protect/secrets.accept.test.ts` — L3: CLI acceptance — `claws protect secrets` init/set/get/list/delete subcommands produce correct output and exit codes on reference workspace

## Acceptance Criteria

- [ ] `vault.enc` is not readable as plaintext (binary ciphertext)
- [ ] Encrypt/decrypt roundtrip preserves values exactly (byte-for-byte)
- [ ] Wrong passphrase throws a descriptive error (not a generic crypto error)
- [ ] `list()` returns key names without exposing values
- [ ] `delete()` removes entry and subsequent `get()` throws key-not-found
- [ ] Scrypt fallback activates when Argon2id is unavailable
- [ ] Salt is stored separately at vault.salt and reused across operations
- [ ] Argon2id defaults to m=262144, t=4, p=4 (OWASP recommended tier)
- [ ] Passphrases shorter than 12 characters or below 40 bits entropy are rejected
- [ ] Doctor check warns when scrypt fallback is active on a vault containing signing keys
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, cryptographic module patterns
- `.craft/roles/claws/ciso.md` — encryption standards, key derivation requirements, vault security model

## Dependencies

- Pulse 01 (protect-types): VaultConfig type

## Test Gates

- [ ] L0 unit (5 tests): key derivation consistency (1), encrypt/decrypt roundtrip (1), wrong passphrase rejection (1), vault file not plaintext (1), passphrase entropy check rejects weak passphrase (1)
- [ ] L1 integration (2 tests): full vault lifecycle init/set/get/list (1), vault persistence across sessions (1)
- [ ] L2 e2e (1 test): full vault init + set + get + list + delete on fixture workspace
- [ ] L3 accept (2 tests): SDK acceptance — vault lifecycle and error handling validation (1), CLI acceptance — `claws protect secrets` subcommands output and exit codes (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
