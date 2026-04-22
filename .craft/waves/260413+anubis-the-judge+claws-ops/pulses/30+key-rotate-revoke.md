---
pulse: 30
slug: key-rotate-revoke
plan: claws-key-management
depends_on: [28]
governing_roles: [claws:ciso, claws:compliance]
scenario_codes: [obo-elicitation/S07, identity-bridge/S02, compliance-evidence/S04]
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

# Pulse 30: Key Rotate & Revoke

## Objective

Extend the key management system with rotation and revocation operations. Rotation generates a new key version, re-signs pending artifacts with the new key, and archives the old key. Revocation marks a key as revoked in the registry, appends a REVOKE event to the audit chain, and blocks further signing attempts with that key.

Rotation schedules enforce policy-driven deadlines: 90-day signing keys, 30-day session keys, 180-day root keys. An alert threshold fires at 7 days before expiry to give operators time to act.

## Deliverables

- [ ] `claws-sdk/src/keys/rotate.ts` — Generate new key version, acquire file lock on `.claws/keys/` during rotation, re-sign only `.claws/compiled/` artifacts (not user files) with new key, archive old key. Partial re-sign failure rolls back (restore old key, keep old signatures)
- [ ] `claws-sdk/src/keys/revoke.ts` — Mark key revoked in registry, append REVOKE event to audit chain, block further signing
- [ ] `claws-sdk/src/keys/schedule.ts` — Rotation schedule management (90-day signing, 30-day session, 180-day root), deadline computation, alert threshold (7 days before)
- [ ] `claws-cli/src/commands/keys.ts` — Add `claws keys rotate [keyId]`, `claws keys revoke [keyId]` subcommands

**Note:** Verify directory paths (e.g., `claws-sdk/src/keys/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] `claws keys rotate [keyId]` generates a new key version and archives the old one
- [ ] Rotation acquires file lock on `.claws/keys/` during rotation
- [ ] Rotation re-signs only `.claws/compiled/` artifacts (not user files) with the new key
- [ ] Partial re-sign failure rolls back (restore old key, keep old signatures)
- [ ] `claws keys revoke [keyId]` marks the key as revoked in the registry
- [ ] Revoked keys cannot be used for signing (signing attempts throw)
- [ ] REVOKE event is appended to the audit chain
- [ ] Rotation schedule computes correct deadlines for each key type (90/30/180 days)
- [ ] Alert threshold fires when a key is within 7 days of rotation deadline
- [ ] `claws keys list` reflects rotation version and revocation status

## Test Gates

- L0 (6 tests): rotation creates new key version, re-sign updates artifact signatures, old key archived with previous version, revocation blocks signing attempts, schedule deadline computation for each key type, alert threshold triggers at 7-day boundary
- L1 (2 tests): rotate + verify new signatures are valid (end-to-end), revoke + verify signing is blocked (end-to-end)
- L2 (1 test): Full rotation lifecycle: generate key → sign artifact → rotate → verify new signatures on `.claws/compiled/` artifacts → `claws keys list` → verify rotation version incremented and old key archived
- L3 (1 test): Key lifecycle acceptance: generate → sign → rotate → verify re-signed artifacts → revoke → verify signing blocked → verify audit chain has REVOKE event → verify rotation schedule alerts at 7-day threshold → verify partial re-sign failure rolls back cleanly
