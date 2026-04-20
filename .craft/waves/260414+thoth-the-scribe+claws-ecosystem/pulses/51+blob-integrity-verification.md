---
pulse: 51
slug: blob-integrity-verification
plan: claws-aether-integration
depends_on: [18, 50]
governing_roles: [claws:ciso, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/compliance/"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 51: Blob Integrity Verification

## Objective

Verify governance artifact signatures before loading at container restart.
Prevents tampered blobs from replacing the governance plugin with a permissive
version. Reuses Pulse 18 artifact-signer infrastructure.

## Review Amendments (R1)

- **CM1**: Add `keySource: KeyResolver` param to verify function; document key distribution strategy (env var, Key Vault, file)
- **CM8**: Add `timeoutMs` param with 10s default; distinct error types for missing vs tampered
- **CISO M2**: Add `requireSignedArtifacts` fleet policy flag; when true, missing signatures = hard fail (not warning)
- **GW F-08**: Reject empty-manifest (zero artifacts) as invalid — must contain at least 1 artifact entry
- **CISO N1**: Wire verification failures to SIEM emitter (Pulse 48 integration)

## Deliverables

- [ ] `claws-sdk/src/compliance/blob-verify.ts` — `verifyGovernanceArtifacts(manifestPath, options: { keySource: KeyResolver, timeoutMs?: number, requireSigned?: boolean })`: reads `.claws-manifest.json`, checks manifest signature, verifies SHA-256 content hash of each artifact. Returns `{verified: boolean, errors: string[], warnings: string[]}`. Rejects empty manifest (zero artifacts). Timeout with `AbortController`.
- [ ] `claws-sdk/src/compliance/key-resolver.ts` — `KeyResolver` interface: `resolve(keyId: string): Promise<Buffer | null>`. Implementations: `EnvKeyResolver` (reads `CLAWS_VERIFY_KEY` env var), `FileKeyResolver` (reads key file from path), `NullKeyResolver` (always returns null — backward compat).
- [ ] `claws-sdk/src/compliance/manifest-types.ts` — GovernanceManifest type: `{artifacts: [{path, contentHash, size}], signature, signedAt, keyId, schemaVersion}`. Minimum 1 artifact required.
- [ ] `claws-sdk/src/compliance/verify-errors.ts` — Distinct error types: `ManifestMissingError`, `ManifestTamperedError`, `ArtifactHashMismatchError`, `VerificationTimeoutError`, `EmptyManifestError`
- [ ] `claws-sdk/tests/compliance/blob-verify.unit.test.ts` — 6 L0: valid passes, tampered manifest fails, tampered artifact fails, missing signature warns (or fails when requireSigned), empty manifest rejected, timeout fires
- [ ] `claws-sdk/tests/compliance/blob-verify.integration.test.ts` — 4 L1: sign→verify round-trip, tamper→detect, missing manifest backward compat, KeyResolver env/file/null
- [ ] `claws-sdk/tests/e2e/blob-integrity.e2e.test.ts` — 1 L2: compile→sign→tamper→verify→reject lifecycle
- [ ] `claws-sdk/tests/accept/runners/blob-verify-sim.ts` — Mock blob rehydration runner: downloads fixtures, checks manifest, verifies hashes
- [ ] `claws-sdk/tests/aether/blob-integrity-verification.accept.test.ts` — L3: SDK acceptance — consumer calls verifyGovernanceArtifacts with signed manifest, verifies valid passes, tampered artifact rejects, missing signature warns (or fails with requireSigned), and timeout fires on stalled verification

## Key Constraints

- Missing signature (pre-signing era) → WARNING by default, FAIL when `requireSignedArtifacts: true`
- Missing manifest entirely → WARNING, load proceeds (backward compatible)
- Tampered manifest or artifact → FAIL, block loading
- Empty manifest (zero artifacts) → FAIL (prevents bypass)
- Verification function accepts `KeyResolver` — never hardcodes key location
- Timeout prevents stalled verification from killing containers (10s default)
- Verification failures emit SIEM-compatible event (integrates with Pulse 48)
- No Aether repo changes in this pulse — verification logic only
