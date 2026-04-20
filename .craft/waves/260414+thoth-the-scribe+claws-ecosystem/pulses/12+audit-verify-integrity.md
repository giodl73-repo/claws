---
pulse: 12
slug: audit-verify-integrity
plan: claws-comply-audit
depends_on: [11]
governing_roles: [craft:architect, claws:ciso]
scenario_codes: [compliance-evidence/S02]
stage: implementation
test_tiers:
  L0_unit: 4
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

# Pulse 12: Audit Verify Integrity

## Objective

Chain integrity verification with break-point detection. Fixes THOTH-FINDINGS T-02 (no tamper detection test). Recompute all hashes, validate chaining continuity, report exact break point. Delete detection (gap in chain), reorder detection (hash mismatch), modification detection (content hash mismatch).

Building on the chained hash foundation from Pulse 11, this pulse implements full chain verification. The verifier walks the chain from first to last entry, recomputing SHA-256(previousHash + content) at each step and comparing against the stored hash. Three tamper modes are detected: deletion (a gap where an entry's previousHash references a non-existent predecessor), reordering (entries whose previousHash doesn't match the actual preceding entry's hash), and modification (content hash mismatch where the stored hash doesn't match the recomputed hash). The verifier reports the exact break-point index so downstream consumers know precisely where integrity was lost.

## Deliverables

- [ ] `claws-sdk/src/audit/verify.ts` — chain integrity verification: recompute hashes, validate continuity, detect delete/reorder/modify, report break point
- [ ] `claws-sdk/tests/audit/verify.unit.test.ts` — L0: integrity pass on untampered chain (1), detect deleted entry gap (1), detect reordered entries (1), detect modified entry content (1)
- [ ] `claws-sdk/tests/audit/verify.integration.test.ts` — L1: verify on 1000-entry chain fixture (1), break-point location matches tampered index (1)

## Acceptance Criteria

- [ ] Verifier returns pass for untampered chains
- [ ] Deleted entry detected: gap in previousHash references
- [ ] Reordered entries detected: previousHash mismatch with actual predecessor
- [ ] Modified content detected: recomputed hash !== stored hash
- [ ] Break-point index accurately identifies the first tampered entry
- [ ] ChainVerifyResult includes breakPoint, tamperType, and details fields
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — verification patterns, error reporting conventions
- `.craft/roles/claws/ciso.md` — tamper detection requirements, chain integrity validation, break-point reporting

## Dependencies

- Pulse 11 (audit-chain-foundation) — provides ChainEntry type and chain append/read primitives

## Test Gates

- [ ] L0 unit (4 tests): integrity pass on untampered chain (1), detect deleted entry gap (1), detect reordered entries (1), detect modified entry content (1)
- [ ] L1 integration (2 tests): verify on 1000-entry chain fixture (1), break-point location matches tampered index (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
