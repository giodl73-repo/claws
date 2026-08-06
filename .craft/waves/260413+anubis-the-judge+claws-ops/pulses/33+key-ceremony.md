---
pulse: 33
slug: key-ceremony
plan: claws-key-management
depends_on: [30]
governing_roles: [claws:ciso, craft:architect]
scenario_codes:
  [compliance-evidence/S04, governance-rules/S12, fleet-operations/S04, fleet-operations/S05]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 33: Key Ceremony

## Objective

Implement M-of-N Shamir's Secret Sharing for root key management. The ceremony protocol splits a root key into N shares with a reconstruction threshold of M, tracks participant identity and timestamps for each share distribution, and records all ceremony events to the audit chain. This provides enterprise-grade root key protection while supporting single-developer mode via passphrase-derived key bypass.

The ceremony workflow has two phases: initialization (split root key into shares, distribute to participants) and reconstruction (collect M shares from participants, reconstruct root key, verify integrity). Threshold enforcement ensures that fewer than M shares always fails reconstruction.

## Deliverables

- [ ] `claws-sdk/src/keys/ceremony.ts` — M-of-N Shamir's Secret Sharing: implement GF(256) Shamir Secret Sharing from scratch (~150 lines, no external dependency for root key splitting). Validate against Hashicorp Vault test vectors. Split root key into N shares with threshold M, reconstruct from M shares, participant tracking (identity + timestamp per share distribution), threshold enforcement (fail if <M shares)
- [ ] `claws-sdk/src/keys/ceremony-audit.ts` — Record CEREMONY_INITIATED, SHARE_DISTRIBUTED, KEY_RECONSTRUCTED events to audit chain
- [ ] `claws-cli/src/commands/keys.ts` — Add `claws keys ceremony init --shares N --threshold M`, `claws keys ceremony reconstruct`
- [ ] Single-developer mode: skip ceremony, use passphrase-derived key when --single-dev flag is set

**Note:** Verify directory paths (e.g., `claws-sdk/src/keys/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] `claws keys ceremony init --shares 5 --threshold 3` splits root key into 5 shares
- [ ] Reconstruction with 3-of-5 shares recovers the original root key
- [ ] Reconstruction with 2-of-5 shares fails with clear threshold error
- [ ] Each share distribution records participant identity and timestamp
- [ ] CEREMONY_INITIATED event is recorded when ceremony begins
- [ ] SHARE_DISTRIBUTED event is recorded for each share handoff
- [ ] KEY_RECONSTRUCTED event is recorded on successful reconstruction
- [ ] Single-developer mode bypasses ceremony with passphrase-derived key
- [ ] Shares are not stored together (each share written to separate output)

## Test Gates

- L0 (6 tests): Shamir split produces N shares, reconstruct with M shares recovers key, M-1 shares fails reconstruction, participant tracking records identity + timestamp, audit events recorded for each ceremony phase, single-dev mode produces valid key
- L1 (2 tests): full ceremony round-trip (init with N=5 M=3 then distribute 5 shares then reconstruct with 3 then verify key matches original), ceremony with participant tracking verifies all identities recorded
- L2 (2 tests): ceremony init → sign artifact → rotate key → re-sign → verify full signature chain, ceremony with threshold boundary: init 5/3 → reconstruct with exactly 3 shares succeeds → reconstruct with 2 shares fails → verify audit chain records all ceremony events (CEREMONY_INITIATED, SHARE_DISTRIBUTED×5, KEY_RECONSTRUCTED)
- L3 (1 test): Ceremony acceptance: full M-of-N lifecycle (init 5/3, distribute shares with participant tracking, reconstruct with 3 shares, verify key matches original) + single-dev bypass (passphrase-derived key) + audit chain integrity (all events recorded with timestamps) + share isolation (no two shares written to same output)
