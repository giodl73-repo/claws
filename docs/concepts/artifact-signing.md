# Artifact Signing

<!-- atom:artifact-signing (C101) -->

Ed25519 and HMAC-SHA256 signing infrastructure for compliance evidence packages and governance attestation.

> **Prerequisites**: [Severity Gating](severity-gating.md) (enforcement context). Next: [Secrets Vault](secrets-vault.md) (key storage).

---

## Overview

claws signs compliance evidence and governance artifacts using two modes: Ed25519 (enterprise, asymmetric) and HMAC-SHA256 (developer, symmetric). Both modes produce a `SignedEvidence` envelope containing the algorithm, base64-encoded signature, key ID, timestamp, and SHA-256 evidence hash. An RFC 3161 Timestamp Authority client provides independent proof that evidence existed at a specific time.

Signing lives in `claws-sdk/compliance/` -- the layer responsible for evidence integrity and attestation. This is distinct from `keys/` (key material lifecycle: generate, store, rotate, revoke, ceremony) and `protect/` (runtime secrets storage).

---

## Signing modes

| Mode       | Algorithm   | Use case                                         | Verification                       |
| ---------- | ----------- | ------------------------------------------------ | ---------------------------------- |
| Enterprise | Ed25519     | Multi-party verification, regulated environments | Public key only (no shared secret) |
| Developer  | HMAC-SHA256 | Single-user deployments, team-internal integrity | Shared secret required             |

---

## How it works

### Evidence hashing

All evidence fields are deep-sorted by key (recursively), serialized to deterministic JSON, and SHA-256 hashed. This ensures any modification to any field invalidates the signature. Arrays maintain their order; only object keys are sorted.

```ts
const hash = hashEvidence(evidencePackage);
// SHA-256 of JSON.stringify(deepSortKeys(evidence))
```

### Ed25519 signing (enterprise)

```ts
const keyPair = generateSigningKeyPair();
// { publicKey: PEM, privateKey: PEM, keyId: "ed25519-sign-a1b2c3d4" }

const envelope = signEd25519(evidence, keyPair.privateKey, keyPair.keyId);
const valid = verifyEd25519(envelope, evidence, keyPair.publicKey);
```

Key generation uses `crypto.generateKeyPairSync('ed25519')` with OS CSPRNG via `crypto.randomBytes()`. Private keys are stored with 0o600 permissions (owner read/write only). On Windows, chmod is best-effort since NTFS uses ACLs.

### HMAC-SHA256 signing (developer)

```ts
const envelope = signHmac256(evidence, sharedSecret, "key-001");
const valid = verifyHmac256(envelope, evidence, sharedSecret);
```

Verification uses `crypto.timingSafeEqual` to prevent timing attacks.

### Unified verification

`verifyEvidence` dispatches to the correct algorithm based on the envelope's `algorithm` field:

```ts
const valid = verifyEvidence(envelope, evidence, keyOrSecret);
```

---

## Key pair generation and storage

```ts
// Generate
const { publicKey, privateKey, keyId } = generateSigningKeyPair();

// Store private key to disk with restricted permissions
await storePrivateKey(privateKey, keyId, ".claws/keys/");
// Writes: .claws/keys/ed25519-sign-a1b2c3d4.pem (chmod 0o600)
```

Key IDs are validated against `/^[a-zA-Z0-9_-]+$/` to prevent path traversal.

---

## KeyResolver interface

The `KeyResolver` interface decouples verification from key storage. Three built-in implementations cover common scenarios:

| Resolver          | Key source                          | When to use                                    |
| ----------------- | ----------------------------------- | ---------------------------------------------- |
| `EnvKeyResolver`  | `CLAWS_VERIFY_KEY` env var (base64) | CI/CD, containers, cloud deployments           |
| `FileKeyResolver` | File path on disk (PEM or raw)      | Local development, mounted secrets             |
| `NullKeyResolver` | Always returns null                 | Backward compatibility with unsigned manifests |

`EnvKeyResolver` also checks for key-ID-specific env vars (`CLAWS_VERIFY_KEY_{keyId}`) before falling back to the base variable, supporting key rotation in environment-based deployments.

Enterprise deployments implement `KeyResolver` to integrate with Azure Key Vault, AWS KMS, HashiCorp Vault, or similar.

---

## RFC 3161 timestamp authority

For legal and regulatory requirements, the artifact signer includes an RFC 3161 TSA client:

| Step | What happens                                                               |
| ---- | -------------------------------------------------------------------------- |
| 1    | Build DER-encoded ASN.1 timestamp request with SHA-256 hash + random nonce |
| 2    | POST to TSA URL over HTTPS (TLS required, configurable allowlist)          |
| 3    | Validate response: check PKIStatus, nonce match, messageImprint hash match |
| 4    | Return `TimestampToken` with TSA URL, hashed message, and response         |

TSA URLs must use HTTPS and optionally be in a configured allowlist from `claws.json`. Request timeout defaults to 10 seconds.

---

## Audit chain entry signing

The same module provides HMAC signing for the audit chain. Each chain entry is signed by length-prefixing fields in deterministic order and computing an HMAC. Supported algorithms: SHA-256, SHA-384, SHA-512.

```ts
const signedEntry = signAuditEntry(entry, key, "key-001", "sha256");
const valid = verifyAuditEntry(signedEntry, key);
```

Length-prefixed encoding (`${byteLength}:${value}`) prevents delimiter confusion attacks.

---

## Key types

| Type                                                     | Module                                 |
| -------------------------------------------------------- | -------------------------------------- |
| `SignedEvidence`                                         | `claws-sdk/compliance/artifact-signer` |
| `SigningMode`                                            | `claws-sdk/compliance/artifact-signer` |
| `Ed25519KeyPair`                                         | `claws-sdk/compliance/artifact-signer` |
| `TimestampToken`                                         | `claws-sdk/compliance/artifact-signer` |
| `AuditChainEntry`                                        | `claws-sdk/compliance/artifact-signer` |
| `KeyResolver`                                            | `claws-sdk/compliance/key-resolver`    |
| `EnvKeyResolver` / `FileKeyResolver` / `NullKeyResolver` | `claws-sdk/compliance/key-resolver`    |

---

## Related concepts

- [Audit Chain](audit-chain.md) -- hash-chained log that uses audit entry signing
- [Aether Integration](aether-integration.md) -- blob verification uses artifact signing
- [Key Management](key-management.md) -- key lifecycle (generation, rotation, revocation)
- [Secrets Vault](secrets-vault.md) -- encrypted storage for signing keys and HMAC secrets
- [Compliance: SOC2](compliance-soc2.md) -- evidence packages that get signed
