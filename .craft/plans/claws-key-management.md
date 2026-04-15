---
slug: claws-key-management
preset: "claws"
plan: "2 headlines: claws keys generate creates Ed25519/HMAC signing keys with managed lifecycle, M-of-N ceremony for enterprise key quorum"
area: claws
status: Closed
phase: anubis
atoms: [atom:key-management]
specs: [CL-02]
---

# claws-key-management -- Key Lifecycle Management

## Headlines

1. **H1: `claws keys generate <key-id>` creates Ed25519/HMAC signing keys with storage tier selection** -- The keys command group manages the full lifecycle of cryptographic keys used for audit chain signing, compliance artifact signing, and manifest signing. `claws keys generate <key-id>` creates a new key with configurable algorithm (Ed25519 or HMAC-SHA256), storage tier (file in `.claws/keys/`, environment variable, or KMS reference), and rotation schedule (90-day default for signing keys, 30-day for session keys, 180-day for root keys). `claws keys list` shows all managed keys with creation date, algorithm, storage tier, rotation status, and next rotation date. `claws keys rotate <key-id>` generates a new version of the key, re-signs pending artifacts, and archives the old key. `claws keys revoke <key-id> --reason <text>` marks a key as revoked in the key registry, appends a REVOKE event to the audit chain, and blocks further use.
   - Validation: `claws keys generate audit-signing --algorithm ed25519 --storage file` creates `.claws/keys/audit-signing.key` with rotation schedule metadata
   - Validation: `claws keys list` shows the key with `nextRotation` date 90 days from creation
   - Validation: `claws keys rotate audit-signing` generates a new version, old key archived to `.claws/keys/archive/`
   - Validation: `claws keys revoke audit-signing --reason "compromise"` marks key revoked, REVOKE event in audit chain

2. **H2: M-of-N enterprise ceremony requires quorum for root key operations** -- Enterprise key ceremony (`claws keys ceremony init --shares N --threshold M`) splits a root signing key into N shares using Shamir's Secret Sharing, where M shares are required to reconstruct the key. Ceremony operations (root key generation, root key rotation, fleet-wide policy signing) require M-of-N quorum. Each ceremony participant provides their share interactively. The ceremony audit trail records participant identities (from `claws identity`) and timestamps. Ceremony is optional -- single-developer mode uses passphrase-derived keys from `claws secrets` (claws-protect plan).
   - Validation: `claws keys ceremony init --shares 5 --threshold 3` produces 5 key shares
   - Validation: Reconstructing with 2 shares (below threshold) fails: "Insufficient shares: need 3, have 2"
   - Validation: Reconstructing with 3 shares succeeds and produces the root signing key
   - Validation: Ceremony audit trail records participant identities and timestamps

## Summary

This plan implements the key lifecycle commands (generate, rotate, revoke, ceremony) that CL-02 CB-03 defines but no other plan implements. SOC2 CC6.8 requires encryption key management evidence, and the compliance engine (claws-comply-audit) signs artifacts with keys that need a managed lifecycle. Auditors will ask: "when was this key generated, when is it scheduled for rotation, who has access?" This plan provides those answers. Key storage tiers (file, env var, KMS) support the range from solo developer to enterprise fleet. Rotation schedules (90/30/180 day) follow industry standards. M-of-N ceremony is the enterprise trust root.

## Coverage Contract

### Specs
- [ ] CL-02 -- Key management (CB-03): key generation, rotation schedules (90/30/180 days), revocation, compromise recovery, M-of-N ceremony

### Concept Guides
- [ ] docs/claws/protect/key-management.md -- NEW: key lifecycle, storage tiers, rotation schedules, ceremony protocol

### Scenario Coverage
- [ ] keys/generate-ed25519-file -- generate Ed25519 key with file storage
- [ ] keys/generate-hmac-env -- generate HMAC key with env var storage
- [ ] keys/generate-kms -- generate KMS-referenced key
- [ ] keys/list-with-rotation -- list shows rotation schedule and next date
- [ ] keys/rotate-key -- rotate key, archive old, re-sign pending
- [ ] keys/revoke-with-reason -- revoke key, audit event recorded
- [ ] keys/revoke-blocks-use -- revoked key cannot sign new artifacts
- [ ] keys/ceremony-init -- split root key into N shares
- [ ] keys/ceremony-reconstruct-success -- M shares reconstruct key
- [ ] keys/ceremony-reconstruct-insufficient -- M-1 shares fail
- [ ] keys/ceremony-audit-trail -- ceremony events record participant identities
- [ ] keys/rotation-schedule-alert -- warn when key is within 7 days of rotation deadline

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 16 | Key generation (3), rotation logic (3), revocation (2), schedule computation (3), Shamir split/reconstruct (3), storage tiers (2) |
| L1 integration | 6 | Full key lifecycle (generate/rotate/revoke), ceremony split/reconstruct, storage tier round-trip, audit recording |
| L2 e2e | 3 | `keys generate` + `keys rotate` + `keys revoke` on fixture workspace, ceremony init + reconstruct |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

- `claws-sdk/src/protect/keys.ts` (NEW) -- Key lifecycle orchestrator: generate, list, rotate, revoke
- `claws-sdk/src/protect/key-storage.ts` (NEW) -- Storage tier abstraction: file (.claws/keys/), env var, KMS reference
- `claws-sdk/src/protect/key-rotation.ts` (NEW) -- Rotation schedule management: 90/30/180 day defaults, deadline computation, alert threshold
- `claws-sdk/src/protect/key-ceremony.ts` (NEW) -- Shamir's Secret Sharing: split, reconstruct, participant tracking
- `claws-sdk/src/protect/key-registry.ts` (NEW) -- Key registry: metadata storage (algorithm, created, rotated, revoked, storage tier, schedule)
- `claws-sdk/src/protect/key-types.ts` (NEW) -- KeyEntry, KeyAlgorithm, StorageTier, RotationSchedule, CeremonyConfig, CeremonyShare types

## Deliverables

### Specs & Design
- [ ] CL-02 amendment -- key lifecycle commands finalized (generate, rotate, revoke, ceremony)

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/protect/keys.ts -- generate(), list(), rotate(), revoke() orchestrator
- [ ] claws-sdk/src/protect/key-storage.ts -- FileStorage, EnvStorage, KMSStorage implementations
- [ ] claws-sdk/src/protect/key-rotation.ts -- scheduleRotation(), checkRotationDue(), computeNextRotation()
- [ ] claws-sdk/src/protect/key-ceremony.ts -- splitKey(N, M), reconstructKey(shares), verifyCeremony()
- [ ] claws-sdk/src/protect/key-registry.ts -- registerKey(), getKey(), listKeys(), updateKey()
- [ ] claws-sdk/src/protect/key-types.ts -- all key management types
- [ ] claws-sdk/tests/protect/keys.unit.test.ts -- generate, list, rotate, revoke
- [ ] claws-sdk/tests/protect/key-storage.unit.test.ts -- file/env/KMS storage round-trip
- [ ] claws-sdk/tests/protect/key-rotation.unit.test.ts -- schedule computation, deadline alerts
- [ ] claws-sdk/tests/protect/key-ceremony.unit.test.ts -- Shamir split/reconstruct, threshold enforcement
- [ ] claws-sdk/tests/protect/key-registry.unit.test.ts -- registry CRUD operations
- [ ] claws-sdk/tests/protect/keys.integration.test.ts -- full lifecycle on temp directory
- [ ] claws-sdk/tests/protect/key-ceremony.integration.test.ts -- ceremony with audit trail recording

### CLI Wiring
- None in this plan (keys commands come in claws-cli plan: `claws keys generate/list/rotate/revoke/ceremony`)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Secrets vault (that's claws-protect plan -- vault uses keys but key lifecycle is separate)
- Compliance artifact signing (that's claws-comply-audit plan -- uses keys generated here)
- Manifest signing (that's claws-maker-commands plan -- uses keys generated here)
- KMS provider implementations (AWS KMS, Azure Key Vault, HashiCorp) -- Phase 3+ enterprise, this plan defines the KMS storage tier interface
- HSM integration -- enterprise Phase 3+
- Key escrow / backup -- enterprise Phase 3+

## Notes

- Key generation REUSES compiler-sdk `integrity/` for Ed25519 keypair generation and HMAC key derivation
- Shamir's Secret Sharing requires a dedicated audited implementation (e.g., `shamir-secret-sharing` npm package or custom GF(256) implementation) -- `@noble/secp256k1` provides elliptic curve operations, NOT SSS
- Key registry is stored in `.claws/keys/registry.json` with per-key metadata
- Rotation schedules: 90 days for signing keys (CL-02 CB-03), 30 days for session keys, 180 days for root keys
- Revocation appends a REVOKE event to the audit chain with reason and revoking identity
- M-of-N ceremony is OPTIONAL -- single-developer mode skips ceremony and uses passphrase-derived keys
- Depends on claws-governance-ir (signing types defined in IR plan's artifact-signer.ts) and claws-protect (vault for secure key storage)
