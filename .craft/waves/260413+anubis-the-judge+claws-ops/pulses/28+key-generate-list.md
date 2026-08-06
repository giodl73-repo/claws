---
pulse: 28
slug: key-generate-list
plan: claws-key-management
depends_on: []
governing_roles: [claws:ciso, craft:architect]
scenario_codes:
  [
    governance-rules/S12,
    compliance-evidence/S04,
    compliance-evidence/S06,
    obo-elicitation/S01,
    obo-elicitation/S07,
  ]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 28: Key Generate & List

## Objective

Implement the foundational key management primitives for claws: Ed25519 keypair generation, HMAC-SHA256 key generation, tiered storage abstraction, and key metadata registry. These primitives underpin all downstream signing, verification, and ceremony operations.

The storage tier abstraction supports three backends — FileStorage (.claws/keys/), EnvStorage (environment variables), and KMSStorage (interface-only stub for enterprise integration). The registry tracks key metadata including algorithm, creation time, rotation status, and storage tier.

## Deliverables

- [ ] `claws-sdk/src/keys/types.ts` — KeyEntry, KeyAlgorithm ('ed25519' | 'hmac-sha256'), StorageTier ('file' | 'env' | 'kms'), RotationSchedule types
- [ ] `claws-sdk/src/keys/generate.ts` — Ed25519 keypair generation (Node.js crypto), HMAC-SHA256 key generation
- [ ] `claws-sdk/src/keys/storage.ts` — Storage tier abstraction: FileStorage (.claws/keys/), EnvStorage (env vars), KMSStorage (interface only)
- [ ] `claws-sdk/src/keys/registry.ts` — Key metadata storage (algorithm, created, rotated, revoked, storage tier, rotation schedule)
- [ ] `claws-sdk/src/keys/list.ts` — Display keys with creation date, algorithm, tier, rotation status, next rotation
- [ ] `claws-cli/src/commands/keys.ts` — `claws keys generate [--algorithm ed25519|hmac] [--storage file|env]`, `claws keys list`

**Note:** Verify directory paths (e.g., `claws-sdk/src/keys/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] `claws keys generate` creates a valid Ed25519 keypair by default
- [ ] `claws keys generate --algorithm hmac` creates an HMAC-SHA256 key
- [ ] Generated keys are persisted to the selected storage tier
- [ ] `claws keys list` displays all keys with metadata columns (id, algorithm, created, tier, rotation status)
- [ ] FileStorage writes to `.claws/keys/` with restricted file permissions
- [ ] EnvStorage reads/writes key material from environment variables
- [ ] KMSStorage interface is defined but throws "not implemented" on invocation
- [ ] Registry correctly tracks key metadata across generate/list operations

## Test Gates

- L0 (6 tests): Ed25519 generation produces valid keypair, HMAC generation produces correct key length, FileStorage round-trip (write/read), EnvStorage round-trip (write/read), registry metadata persists correctly, list output formats all columns
- L1 (2 tests): generate + list round-trip (generate key then verify it appears in list), storage tier selection (generate with --storage env uses EnvStorage)
- L2 (1 test): CLI round-trip: `claws keys generate --algorithm ed25519` → `claws keys generate --algorithm hmac` → `claws keys list` → verify both keys appear with correct algorithm, tier, and creation metadata
- L3 (1 test): Key management acceptance: generate Ed25519 + HMAC keys across file and env storage tiers, list all keys, verify registry metadata consistency, verify FileStorage permissions, verify EnvStorage round-trip, verify KMSStorage throws not-implemented
