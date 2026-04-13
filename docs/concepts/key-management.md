# Key Management

Key generation, rotation, and KMS integration for governance artifact signing and encryption.

## Overview

Governance artifacts (CGR chains, sealed snapshots, compliance evidence) are signed and optionally encrypted. Key management handles the full key lifecycle: generation, storage, rotation, and revocation. Keys can be stored locally or delegated to an external KMS (Key Management Service).

## Key Types

| Key | Algorithm | Purpose |
|-----|-----------|---------|
| Signing key | Ed25519 | CGR chain seals, snapshot signatures |
| Encryption key | AES-256-GCM | Secrets vault, credential storage |
| KDF key | Argon2id | Deriving encryption keys from passwords |

## Key Storage

```
.claws/keys/
  signing.pub          # Public signing key (committed)
  signing.key          # Private signing key (gitignored, or in KMS)
  vault.key            # Vault encryption key (gitignored, or in KMS)
```

Private keys are never committed to version control. They are either stored locally (with filesystem permissions) or managed by an external KMS.

## Rotation

Key rotation replaces the active key with a new one while preserving the ability to verify artifacts signed with the old key:

1. Generate new key pair
2. Sign a rotation record with the old key (proves continuity)
3. Activate new key for future operations
4. Archive old public key for verification

## KMS Integration

For enterprise deployments, key management delegates to Azure Key Vault, AWS KMS, or HashiCorp Vault:

```yaml
# claws.json
keys:
  provider: azure-key-vault
  vault: "https://myorg.vault.azure.net"
  signing_key: "claws-signing-prod"
  encryption_key: "claws-encryption-prod"
```

## Related

- [Audit Chain](audit-chain.md) -- signed CGR chain
- [Snapshot Integrity](snapshot-integrity.md) -- signed snapshot seals
- `design/claws/ATOMS.md` -- C16 `atom:key-management`
