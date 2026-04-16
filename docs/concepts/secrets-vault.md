# Secrets Vault

<!-- atom:secrets-vault (C107) -->

AES-256-GCM encrypted key-value store with Argon2id key derivation for protecting sensitive governance material.

> **Prerequisites**: [Artifact Signing](artifact-signing.md) (what keys the vault stores).

---

## Overview

The secrets vault stores signing keys, API tokens, and other sensitive material as encrypted key-value pairs in `.claws/secrets/vault.enc`. Each entry is independently encrypted with its own IV and auth tag, so individual secrets can be decrypted without loading the entire vault. Key derivation uses Argon2id when the native module is available, with automatic scrypt fallback.

The vault lives in `claws-sdk/protect/` -- the runtime secrets storage layer. This is distinct from `compliance/` (evidence integrity: signing, verification, audit chain) and `keys/` (key material lifecycle: ceremony, generation, rotation). See [Defense in Depth](defense-in-depth.md) for the full layered security model.

---

## Vault storage format

```
.claws/secrets/
  vault.enc    — JSON with version, KDF identifier, and encrypted entries
  vault.salt   — 32-byte random salt for key derivation
```

The vault file format:

```json
{
  "version": 1,
  "kdf": "argon2id",
  "entries": {
    "signing-key": {
      "iv": "<base64 12-byte IV>",
      "tag": "<base64 16-byte auth tag>",
      "ciphertext": "<base64 encrypted value>"
    }
  }
}
```

File permissions are set to 0o600 (owner read/write only). On Windows this is best-effort since NTFS uses ACLs.

---

## Key derivation

The vault derives a 256-bit encryption key from the user's passphrase and salt:

| KDF | Parameters | When used |
|-----|-----------|-----------|
| **Argon2id** | Memory: 256 MiB, Time: 4, Parallelism: 4 (OWASP recommended) | When `argon2` native module is installed |
| **scrypt** (fallback) | N: 131072, r: 8, p: 1 | When Argon2id is unavailable |

Argon2id has enforced parameter floors to prevent weak configurations:
- Memory: minimum 65,536 KiB (64 MiB)
- Time: minimum 3 iterations
- Parallelism: minimum 1

The KDF used is recorded in the vault file (`"kdf": "argon2id"` or `"kdf": "scrypt"`) so the correct algorithm is used for decryption.

---

## Passphrase requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 12 characters |
| Minimum entropy | 40 bits |

Entropy estimation uses the minimum of charset-class estimation and unique-character estimation. This prevents `aaaaaaaaaaaa` from scoring high despite having only one unique character.

---

## Per-entry encryption

Each vault entry is encrypted independently using AES-256-GCM:

| Component | Size | Purpose |
|-----------|------|---------|
| IV | 12 bytes | Initialization vector (random per entry) |
| Auth tag | 16 bytes | Integrity verification |
| Ciphertext | variable | Encrypted value |

Independent encryption means a wrong passphrase produces a descriptive error on the specific entry rather than corrupting the entire vault.

---

## API

```ts
import { init, set, get, list, del, defaultVaultConfig } from '@bic/claws-sdk/protect/secrets';

const config = defaultVaultConfig('/workspace');

// Initialize a new vault
const { kdf } = await init(config, 'my-secure-passphrase');
// kdf: 'argon2id' or 'scrypt'

// Store a secret
await set(config, 'signing-key', 'ed25519-private-key-pem...', 'my-secure-passphrase');

// Retrieve a secret
const key = await get(config, 'signing-key', 'my-secure-passphrase');

// List stored keys (no values exposed)
const keys = await list(config);
// ['signing-key']

// Delete a secret (requires passphrase for verification)
await del(config, 'signing-key', 'my-secure-passphrase');
```

---

## Advanced: Key ceremony integration

> The following section covers enterprise key management. For single-developer or small-team use, the API above is sufficient -- skip to [Related concepts](#related-concepts).

The `ceremony.ts` module provides M-of-N Shamir's Secret Sharing for root key management:

| Operation | What happens |
|-----------|-------------|
| `initCeremony(workspace, { totalShares: 5, threshold: 3 })` | Generate 32-byte root key, split into 5 shares (3 required to reconstruct), register in key registry |
| `shamirSplit(keyHex, n, t)` | Split a key into N shares with threshold T using GF(256) Shamir SSS |
| `shamirReconstruct(shares, expectedHash)` | Reconstruct from M+ shares via Lagrange interpolation, verify against SHA-256 hash |
| `recordParticipant(identity, shareIndex)` | Track who received which share with timestamp |

The raw key material is never returned to the caller or written to disk. Only the SHA-256 verification hash is persisted; the unsplit key exists only in memory during the ceremony.

**Single-developer mode**: `deriveSingleDevKey` uses PBKDF2-SHA256 with configurable iterations (default 600,000, OWASP 2023 minimum) to derive a key from a passphrase. Iteration count is configurable via `claws.json` with bounds: minimum 100,000, maximum 10,000,000.

---

## Key types

| Type | Module |
|------|--------|
| `VaultConfig` | `claws-sdk/protect/types` |
| `Argon2Params` | `claws-sdk/protect/secrets` |
| `CeremonyShare` | `claws-sdk/keys/ceremony` |
| `CeremonyInitResult` | `claws-sdk/keys/ceremony` |
| `ShareParticipant` | `claws-sdk/keys/ceremony` |
| `SingleDevKeyResult` | `claws-sdk/keys/ceremony` |

---

## Related concepts

- [Key Management](key-management.md) -- key lifecycle (generation, rotation, revocation)
- [Artifact Signing](artifact-signing.md) -- signing keys stored in the vault
- [Audit Chain](audit-chain.md) -- HMAC keys for chain signing
- [Defense in Depth](defense-in-depth.md) -- vault as part of the layered security model
