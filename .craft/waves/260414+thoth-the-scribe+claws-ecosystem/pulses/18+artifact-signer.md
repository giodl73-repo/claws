---
pulse: 18
slug: artifact-signer
plan: claws-comply-audit
depends_on: [15]
governing_roles: [claws:ciso, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 18: Artifact Signer

## Objective

Ed25519 + HMAC-SHA256 signing infrastructure for compliance evidence packages. RFC 3161 Timestamp Authority client. Configurable PBKDF2 iterations (fixes THOTH-FINDINGS C-02 hardcoded 600k). Signature verification. Evidence hash scope and algorithm documentation. Ed25519 key generation MUST use crypto.generateKeyPairSync('ed25519') with OS CSPRNG via crypto.randomBytes(). Private keys stored in the secrets vault (Pulse 04) when available, with chmod 0o600 file fallback.

This pulse builds the cryptographic signing infrastructure that all compliance evidence packages depend on. Two signing modes are supported: Ed25519 asymmetric signatures for enterprise deployments (where key pairs can be managed via PKI), and HMAC-SHA256 symmetric signatures for developer/single-user deployments (where a shared secret is simpler). The RFC 3161 Timestamp Authority client provides trusted third-party timestamps by submitting a hash to a TSA and receiving a signed timestamp token, proving the evidence existed at a specific time.

The THOTH-FINDINGS C-02 fix makes PBKDF2 iteration count configurable via claws.json rather than hardcoded at 600,000. The default remains 600k for backward compatibility, but enterprise deployments can increase iterations for higher security or decrease for performance on resource-constrained systems. The ceremony.ts edit adds the configuration lookup and validation.

## Deliverables

- [ ] `claws-sdk/src/compliance/artifact-signer.ts` — sign(), verify(), timestamp() using compiler-sdk integrity/. Ed25519 for enterprise, HMAC-SHA256 for developer. RFC 3161 TSA HTTP client.
- [ ] `claws-sdk/src/compliance/ceremony.ts` (EDIT) — C-02 fix: configurable PBKDF2 iterations via claws.json (default 600k, configurable)
- [ ] Ed25519 private key storage in secrets vault or 0o600 file fallback
- [ ] RFC 3161 TSA client requires TLS with certificate validation. TSA URL from configurable allowlist in claws.json.
- [ ] `claws-sdk/tests/compliance/artifact-signer.unit.test.ts` — L0: Ed25519 sign/verify roundtrip (1), HMAC sign/verify roundtrip (1), RFC 3161 timestamp format (1), configurable PBKDF2 iterations (1), Ed25519 key generation uses crypto.generateKeyPairSync (1)
- [ ] `claws-sdk/tests/compliance/artifact-signer.integration.test.ts` — L1: sign SOC2 evidence + verify signature (1), sign with Ed25519 + counter-sign with RFC 3161 (1)

## Acceptance Criteria

- [ ] sign() produces Ed25519 signature for enterprise mode
- [ ] sign() produces HMAC-SHA256 signature for developer mode
- [ ] verify() validates signatures for both modes
- [ ] timestamp() sends hash to RFC 3161 TSA and returns signed token
- [ ] PBKDF2 iterations configurable via claws.json `security.pbkdf2Iterations`
- [ ] Default PBKDF2 iterations remain 600,000 for backward compatibility
- [ ] Iteration count validated: minimum 100,000, maximum 10,000,000
- [ ] Evidence hash scope documented: which fields are included in the hash
- [ ] Ed25519 keys generated via crypto.generateKeyPairSync('ed25519')
- [ ] Private keys stored in vault or 0o600 file
- [ ] RFC 3161 TSA connections require TLS with cert validation
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/ciso.md` — cryptographic signing requirements, PBKDF2 security, RFC 3161 TSA integration
- `.craft/roles/craft/architect.md` — SDK integration patterns, compiler-sdk integrity wrapping, configuration design

## Dependencies

- Pulse 15 (compliance-soc2) — provides compliance types including AsymmetricSignature

## Test Gates

- [ ] L0 unit (5 tests): Ed25519 sign/verify roundtrip (1), HMAC sign/verify roundtrip (1), RFC 3161 timestamp format (1), configurable PBKDF2 iterations (1), Ed25519 key generation uses crypto.generateKeyPairSync (1)
- [ ] L1 integration (2 tests): sign SOC2 evidence + verify signature (1), sign with Ed25519 + counter-sign with RFC 3161 (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
