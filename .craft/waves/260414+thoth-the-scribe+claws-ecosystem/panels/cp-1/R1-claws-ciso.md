# R1 — claws:ciso Review — CP-1 Security Hardening + Protect

**Reviewer**: claws:ciso (CISO security lens)
**Review type**: impl (implementation review)
**Date**: 2026-04-14
**Scope**: Vault crypto, key hygiene, trust model integrity, race conditions, secrets management, LLM trust boundaries

---

## Summary

CP-1 introduces foundational security infrastructure: secrets vault (AES-256-GCM + Argon2id), OIDC/SAML identity SSO, key rotation with file locking, key storage tiers, LLM extraction with adversarial guard, trust compatibility enforcement, and publish pipeline key resolution. The implementation is generally strong — crypto algorithm choices are sound, the adversarial guard is well-designed, and the trust model enforces monotonic tightening correctly. However, several findings require attention before this code governs enterprise agent fleets.

---

## Findings

### M-01: PKCE verification uses non-constant-time string comparison

**File**: `claws-sdk/src/protect/identity.ts:148`
**Severity**: M (Major)

```typescript
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const expected = createHash("sha256").update(codeVerifier).digest("base64url");
  return expected === codeChallenge; // <-- timing oracle
}
```

The `===` operator on strings leaks timing information proportional to the length of the matching prefix. An attacker who can measure response times could theoretically recover the code challenge byte-by-byte. This is the same class of vulnerability that `timingSafeEqual` (already imported and used in `rotate.ts`) prevents.

**Fix**: Use `timingSafeEqual` with fixed-length Buffer comparison:

```typescript
const expectedBuf = Buffer.from(expected, "utf-8");
const actualBuf = Buffer.from(codeChallenge, "utf-8");
if (expectedBuf.length !== actualBuf.length) return false;
return timingSafeEqual(expectedBuf, actualBuf);
```

---

### M-02: JWT claims validation missing `iat` (issued-at) and `nbf` (not-before) checks

**File**: `claws-sdk/src/protect/identity.ts:210-229`
**Severity**: M (Major)

`validateJwtClaims` checks `exp` with clock skew tolerance but does not validate:

- `iat` (issued-at) — a token from the distant future should be rejected
- `nbf` (not-before) — token used before its validity window should be rejected

An attacker who obtains a token with `nbf` set far in the future (pre-positioning) or `iat` from the past (replay) will pass validation. Enterprise OIDC deployments routinely set `nbf`.

**Fix**: Add `nbf` and `iat` validation with the same `CLOCK_SKEW_TOLERANCE`:

```typescript
if (claims.nbf !== undefined && claims.nbf > now + CLOCK_SKEW_TOLERANCE) {
  throw new Error("JWT is not yet valid (nbf)");
}
if (claims.iat !== undefined && claims.iat > now + CLOCK_SKEW_TOLERANCE) {
  throw new Error("JWT issued-at is in the future");
}
```

---

### M-03: `verifyKeyMaterial` leaks key length on mismatch via early return

**File**: `claws-sdk/src/keys/rotate.ts:216`
**Severity**: M (Major)

```typescript
export function verifyKeyMaterial(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false; // <-- timing leak
  return timingSafeEqual(bufA, bufB);
}
```

The early return on length mismatch is measurably faster than the `timingSafeEqual` path. While `timingSafeEqual` requires equal-length buffers, the length check itself becomes a timing oracle that reveals whether the attacker's guess has the correct length. For key material comparison this is a meaningful information leak.

**Fix**: Pad both buffers to the same length (max of the two) before comparison, or HMAC both values with a random nonce and compare the HMACs:

```typescript
const maxLen = Math.max(bufA.length, bufB.length);
const paddedA = Buffer.alloc(maxLen);
const paddedB = Buffer.alloc(maxLen);
bufA.copy(paddedA);
bufB.copy(paddedB);
return bufA.length === bufB.length && timingSafeEqual(paddedA, paddedB);
```

---

### M-04: Registry client does not enforce HTTPS for credential-bearing requests

**File**: `claws-sdk/src/publish/registry-client.ts:230-244`
**Severity**: M (Major)

`publishToRegistry` and `queryRegistry` send Bearer tokens to `credentials.endpoint` without verifying the URL scheme is HTTPS. The Anthropic provider warns on HTTP (line 102-108 of `anthropic-provider.ts`) but the registry client does not. A misconfigured or MITM-downgraded endpoint would leak the registry API token in plaintext.

**Fix**: Validate the endpoint URL before any fetch:

```typescript
if (!credentials.endpoint.startsWith("https://")) {
  throw new Error("Registry endpoint must use HTTPS — refusing to send credentials over HTTP");
}
```

---

### M-05: Vault file written without restricted permissions

**File**: `claws-sdk/src/protect/secrets.ts:348-351`
**Severity**: M (Major)

`writeVault` calls `writeFile` without setting file permissions. The vault contains AES-256-GCM encrypted data, but on POSIX systems it defaults to umask (often 0o644 — world-readable). `FileStorage` in `storage.ts` correctly applies `chmod(0o600)` after writes; the vault should do the same.

Similarly, `readOrCreateSalt` (line 356-366) writes the salt file without restricted permissions. The salt is not secret per se, but restricting access prevents an attacker from pre-computing rainbow tables if they only have read access to the salt.

**Fix**: Add `chmod(0o600)` after writing vault and salt files (with try/catch for Windows, matching the pattern in `storage.ts`).

---

### W-01: `checkSelfSigned` returns `false` on parse failure — fails open

**File**: `claws-sdk/src/protect/identity.ts:403-407`
**Severity**: W (Warning)

```typescript
  } catch {
    // If parsing fails, assume not self-signed (err on the side of permissive)
    return false;
  }
```

A malformed certificate that fails ASN.1 parsing will pass the self-signed check. The comment says "err on the side of permissive" but for enterprise deployments the CISO position is fail-closed: if we cannot determine whether a certificate is self-signed, reject it. A malformed certificate is itself a security concern.

**Fix**: Return `true` (assume self-signed / reject) on parse failure, or throw so `validateSamlCertChain` can produce a descriptive error.

---

### W-02: Stale lock reclaim has TOCTOU race

**File**: `claws-sdk/src/keys/rotate.ts:91-97`
**Severity**: W (Warning)

When reclaiming a stale lock, the code does `unlink(lockPath)` followed by `open(lockPath, 'wx')`. Between unlink and open, another process could create the lock file. The second `open('wx')` would then fail with EEXIST and the error is not caught — it falls through to the generic "lock file exists" throw, which is acceptable but imprecise.

More critically, if two processes both detect a stale lock simultaneously, both will `unlink` + `open('wx')`. One succeeds, one fails, but the one that fails may have already deleted a valid lock owned by the other process. This is a narrow but real race window.

**Fix**: Instead of unlink-then-create, use `rename` to atomically claim the stale lock by renaming it to a temp file, then create the new lock. If the rename fails (someone else already claimed), back off.

---

### W-03: `EnvStorage` persists key material as plaintext in `.env` file

**File**: `claws-sdk/src/keys/storage.ts:186-204`
**Severity**: W (Warning)

While the code correctly warns via `warnPlaintextKeyStorage` and applies `chmod(0o600)`, the `.env` file at `.claws/keys/.env` contains raw key material in `KEY_NAME=value` format. This file:

1. May be inadvertently committed to git (no `.gitignore` entry verified)
2. Survives process termination with key material on disk
3. Is not scrubbed/zeroed on key deletion — `removeFromEnvFile` rewrites the file but does not overwrite the old content with zeros first

The `FileStorage.delete()` method correctly overwrites with random bytes before unlinking, but `EnvStorage.delete()` does not apply equivalent scrubbing.

**Fix**: Add a `.gitignore` entry for `.claws/keys/.env`. Consider overwriting the file with random bytes before rewriting during deletion.

---

### W-04: Anthropic provider caches API key as string in `clientApiKey`

**File**: `claws-sdk/src/compile/llm/anthropic-provider.ts:95`
**Severity**: W (Warning)

The API key is read from `process.env` and cached in `this.clientApiKey` as a string for comparison. This means the key persists in heap memory for the lifetime of the provider object and cannot be zeroed (JS strings are immutable). The `useSigningKey` pattern in `key-resolution.ts` correctly uses a Buffer that is zeroed after use — the same pattern should apply to API keys.

While this is the standard pattern for the Anthropic SDK (which also holds the key), minimizing additional copies of sensitive material reduces exposure in heap dumps.

**Fix**: Compare keys using a hash rather than storing the raw key:

```typescript
private clientApiKeyHash: string | undefined;
// In getClient():
const keyHash = createHash('sha256').update(apiKey).digest('hex');
if (this.client && this.clientApiKeyHash === keyHash) { return this.client; }
this.clientApiKeyHash = keyHash;
```

---

### W-05: Adversarial guard not applied to generic prompt path

**File**: `claws-sdk/src/compile/llm/prompts.ts:17-27`
**Severity**: W (Warning)

`buildSystemPrompt` (the generic fallback for files other than SOUL.md, TOOLS.md, AGENTS.md, SKILL.md) does NOT call `withAdversarialGuard`. The file-specific prompts in `prompts/soul-extract.ts`, `prompts/tools-extract.ts`, etc. all apply the adversarial guard, but USER.md, MEMORY.md, HEARTBEAT.md, WORKFLOW.md and other files go through the generic path and have NO adversarial resistance.

This means an attacker can embed prompt injection in USER.md or MEMORY.md and the LLM extraction will follow the injected instructions. USER.md is especially dangerous because it contains user-authored content.

**Fix**: Apply `withAdversarialGuard` in `buildSystemPrompt`:

```typescript
export function buildSystemPrompt(source: string): string {
  const base = [/* existing prompt lines */].join("\n");
  return withAdversarialGuard(base);
}
```

---

### W-06: `useSigningKey` zeroes Buffer but `keyMaterial` string persists

**File**: `claws-sdk/src/publish/key-resolution.ts:44-56`
**Severity**: W (Warning)

`useSigningKey` correctly zeroes the Buffer after use, but `result.keyMaterial` is a JS string that remains in memory for the lifetime of the `KeyResolutionResult` object (and any GC root that holds it). The caller of `resolveSigningKey` retains the result object, meaning key material is still accessible in heap.

This is a defense-in-depth concern — the Buffer zeroing reduces exposure window but does not eliminate it.

**Fix**: Document that callers must discard the `KeyResolutionResult` reference after `useSigningKey` completes. Consider returning a handle object that clears the string reference on close.

---

### W-07: Fleet trust check allows broadcast when workspace trust tier is unreadable

**File**: `claws-sdk/src/fleet/trust-compat.ts:188-194`
**Severity**: W (Warning)

```typescript
if (currentTier === 0) {
  return {
    compatible: true,
    currentTier: 0,
    policyTier,
    reason: "Workspace has no readable trust tier — broadcast allowed",
  };
}
```

If a workspace's `claws.json` is corrupted, missing, or has an invalid trust tier, the broadcast is allowed. This fails open. An attacker who can corrupt or delete `claws.json` in a workspace can bypass all trust tier restrictions for that workspace.

**Fix**: Fail closed — if the workspace trust tier cannot be determined, block the broadcast and require explicit remediation.

---

### N-01: Scrypt fallback N parameter could be higher

**File**: `claws-sdk/src/protect/secrets.ts:63`
**Severity**: N (Note)

Scrypt N=2^17 (131072) with r=8, p=1 is reasonable but below OWASP 2024 recommendations of N=2^20 for password-derived keys protecting sensitive data. Since this is the fallback path (when Argon2id is unavailable), the security floor matters.

---

### N-02: Cache file written with 0o644 permissions

**File**: `claws-sdk/src/compile/cache.ts:210-214`
**Severity**: N (Note)

The cache hash file is written with mode 0o644 (world-readable). While the cache contains only hashes (not secrets), the composite hash reveals which files exist and their content fingerprints. An attacker could use this to detect governance configuration changes. Consider 0o600.

---

### N-03: `encodeDerLength` does not handle lengths > 0xFFFF

**File**: `claws-sdk/src/protect/identity.ts:275-283`
**Severity**: N (Note)

The DER length encoder handles 1-byte and 2-byte lengths but not 3-byte or 4-byte. While RSA public keys in JWKS responses are unlikely to exceed 65535 bytes, a malformed JWKS response could trigger unexpected behavior. The function silently truncates. Consider adding a range check.

---

### N-04: `readVault` swallows all errors including permission denied

**File**: `claws-sdk/src/protect/secrets.ts:336-343`
**Severity**: N (Note)

`readVault` returns `undefined` for all errors, including `EACCES` (permission denied). This means a permission error looks the same as "vault doesn't exist" to the caller. For a security-critical file, permission errors should surface — they may indicate the vault file permissions were tampered with.

---

### N-05: Key rotation does not audit-log the event

**File**: `claws-sdk/src/keys/rotate.ts:230-321`
**Severity**: N (Note)

`rotateKey` writes the updated registry entry and logs to `console.warn` on rollback, but does not emit a structured audit event. For SOC2 compliance, key rotation is an auditable event that must appear in the audit chain. The doctor check for key-colocation exists but rotation itself is silent from an audit perspective.

---

## Scorecard

| Category                  | Assessment                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| Crypto algorithm choices  | Strong: AES-256-GCM, Argon2id, Ed25519, S256 PKCE                             |
| Key hygiene               | Good with gaps: timing leaks (M-01, M-03), missing vault chmod (M-05)         |
| Trust model integrity     | Solid: monotonic tightening correct, but fails open on unreadable tier (W-07) |
| Race condition mitigation | Adequate: file lock with O_EXCL is correct, TOCTOU on stale reclaim (W-02)    |
| Secrets management        | Good: vault encryption solid, env storage needs scrubbing (W-03)              |
| Adversarial resistance    | Strong for file-specific prompts, missing on generic path (W-05)              |
| Audit trail               | Incomplete: rotation not audit-logged (N-05)                                  |
| HTTPS enforcement         | Partial: LLM endpoint warns, registry client silent (M-04)                    |

**Must-fix before merge**: M-01, M-02, M-04, M-05, W-05
**Should-fix**: M-03, W-01, W-07
**Can defer**: W-02, W-03, W-04, W-06, N-01 through N-05
