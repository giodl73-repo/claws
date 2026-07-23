# Blob Integrity -- Signature Verification on Rehydration

**Version**: 1.0.0
**Status**: Specification
**Pulse**: 52 (guardrail-composition)

---

## Overview

When a host rehydrates a claws compilation artifact (e.g.,
`host-approval-policies.json`), it must verify that the artifact
has not been tampered with since compilation. This document
specifies the signature verification protocol.

---

## Threat Model

**Attack vector**: An adversary modifies the artifact between
compilation and host consumption. For example:

- De-escalating R5 tools to R2 to bypass approval gates
- Removing fleet override audit entries
- Injecting fake approval policies for new tools

**Defense**: HMAC-SHA256 signature embedded in the artifact,
verified on rehydration.

---

## Signature Protocol

### Signing (at compile time)

```
1. Serialize artifact to canonical JSON (sorted keys, no whitespace)
2. Compute HMAC-SHA256(canonical_json, signing_key)
3. Embed signature in artifact metadata:
   {
     "integrity": {
       "algorithm": "HMAC-SHA256",
       "signature": "<hex-encoded HMAC>",
       "signedAt": "<ISO 8601 timestamp>",
       "compilerVersion": "<semver>"
     }
   }
```

### Verification (at rehydration time)

```
1. Extract integrity block from artifact
2. Remove integrity block from artifact
3. Serialize remaining artifact to canonical JSON
4. Compute HMAC-SHA256(canonical_json, verification_key)
5. Compare computed signature with embedded signature
6. If mismatch: REJECT artifact, log tamper alert
7. If match: proceed with artifact consumption
```

### Key Management

- **Symmetric (HMAC-SHA256)**: Same key for signing and verification.
  Suitable when compiler and host share a trust boundary.
- **Asymmetric (Ed25519)**: Compiler signs with private key, host
  verifies with public key. Required when compiler and host are
  separate trust boundaries (recommended for fleet deployments).

---

## Failure Modes

| Scenario                  | Behavior                               |
| ------------------------- | -------------------------------------- |
| Missing integrity block   | Reject artifact (fail-closed)          |
| Unknown algorithm         | Reject artifact (fail-closed)          |
| Signature mismatch        | Reject artifact, emit tamper alert     |
| Expired signature (> 24h) | Warn, but accept (stale, not tampered) |
| Valid signature           | Accept artifact                        |

---

## Canonical JSON

Canonical JSON ensures deterministic serialization:

1. Object keys sorted lexicographically (Unicode code points)
2. No whitespace between tokens
3. No trailing commas
4. UTF-8 encoding
5. Numbers in shortest representation

This prevents signature invalidation from cosmetic JSON formatting
differences (e.g., indentation, key ordering).

---

## Integration with Fleet

Fleet-managed deployments use a shared signing key distributed via
fleet policy. The key rotation protocol:

1. Fleet publishes new signing key with 24h overlap window
2. During overlap, hosts accept signatures from both old and new keys
3. After overlap, old key is revoked
4. Artifacts signed with revoked key are rejected

---

## Future: Content-Addressable Artifacts

A future version may use content-addressed storage (CAS) where the
artifact path includes its hash:

```
.claws/compiled/host-approval-policies.sha256-a3f2c1.json
```

This eliminates the need for embedded signatures -- the path IS the
integrity guarantee. Deferred to a future wave.
