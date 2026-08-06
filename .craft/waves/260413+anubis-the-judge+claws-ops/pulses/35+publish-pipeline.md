---
pulse: 35
slug: publish-pipeline
plan: claws-publish
depends_on: [30, 32, 34]
governing_roles: [claws:founder, claws:ciso, craft:architect]
scenario_codes:
  [
    governance-rules/S12,
    fleet-operations/S04,
    fleet-operations/S05,
    fleet-operations/S10,
    compliance-evidence/S04,
    compliance-evidence/S06,
    identity-bridge/S02,
    loss-aware-emission/S03,
  ]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: true
---

# Pulse 35: Publish Pipeline

## Objective

Implement the full publish pipeline for `claws publish`, the final gate in the skill lifecycle. The pipeline detects manifest state (absent, valid-signed, invalid-signed, stale-signed), enforces fleet policy (blocking DECLARED-tier skills when fleet.requireVerifiedPublish is set), executes two-phase atomic transactions (stage locally, commit on remote 200, rollback on failure), resolves signing keys through a priority chain, and reads fresh badge data at publish time.

This is the CP-4 checkpoint gate pulse. All prior CP-4 work (keys, scaffold, annotate) feeds into this pipeline. A skill that passes through publish has been scaffolded, annotated, built, signed, and verified.

## Deliverables

- [ ] `claws-sdk/src/publish/manifest-state.ts` — Detect 4 manifest states: absent (no manifest), valid-signed (signature matches content), invalid-signed (tampered, signature mismatch), stale-signed (content changed since signing)
- [ ] `claws-sdk/src/publish/fleet-policy.ts` — Read fleet.requireVerifiedPublish, block DECLARED-tier skills if policy is true. Support `fleet.allowDeclaredDryRun: true` — DECLARED-tier authors get validation feedback and badge preview without publishing unverified skills to the registry (default: true, don't break the adoption funnel)
- [ ] `claws-sdk/src/publish/atomicity.ts` — Two-phase transaction: stage locally, commit on remote 200, rollback on failure
- [ ] `claws-sdk/src/publish/key-resolution.ts` — Signing key resolution chain: CI env var > fleet key > identity key
- [ ] `claws-sdk/src/publish/badge.ts` — Read current SKILL.md frontmatter at publish time (not cached), per-version badge storage
- [ ] `claws-cli/src/commands/publish.ts` — `claws publish [--registry url] [--dry-run]`

**Note:** Verify directory paths (e.g., `claws-sdk/src/publish/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] Manifest state detection correctly identifies all 4 states (absent, valid-signed, invalid-signed, stale-signed)
- [ ] Fleet policy blocks DECLARED-tier publish when requireVerifiedPublish is enabled
- [ ] Fleet policy allows VERIFIED-tier publish regardless of policy setting
- [ ] Two-phase commit: local staging succeeds, remote commit on 200 response
- [ ] Two-phase rollback: local staging cleaned up on remote failure
- [ ] Key resolution prefers CI env var over fleet key, fleet key over identity key
- [ ] Badge data is read fresh from SKILL.md at publish time (no stale cache)
- [ ] `--dry-run` reports what would be published without side effects
- [ ] `--registry url` overrides the default registry endpoint

## Test Gates

- L0 (8 tests): absent manifest detected, valid-signed manifest detected, invalid-signed manifest detected (tampered), stale-signed manifest detected (outdated), fleet policy blocks DECLARED tier, atomicity success path (stage + commit), atomicity rollback path (stage + remote fail + cleanup), key resolution chain priority (CI > fleet > identity), badge freshness (reads current frontmatter)
- L1 (3 tests): publish DECLARED-tier unsigned skill succeeds (no fleet policy), publish VERIFIED-tier signed skill succeeds with signature verification, fleet policy blocks DECLARED-tier when requireVerifiedPublish=true
- L2 (2 tests): scaffold VERIFIED skill → build → publish → verify manifest is signed and badge is written, fleet policy enforcement: publish DECLARED-tier skill with requireVerifiedPublish=true → verify blocked → publish VERIFIED-tier skill → verify allowed → verify key resolution chain (CI > fleet > identity) selects correct key
- L3 (1 test): full lifecycle: scaffold then annotate then build then publish then verify on simulated registry (manifest signed, badge correct, fleet policy honored)
