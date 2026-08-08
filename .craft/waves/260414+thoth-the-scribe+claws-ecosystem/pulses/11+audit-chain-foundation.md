---
pulse: 11
slug: audit-chain-foundation
plan: claws-comply-audit
depends_on: []
governing_roles: [craft:architect, claws:ciso]
scenario_codes: [compliance-evidence/S01]
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

# Pulse 11: Audit Chain Foundation

## Objective

Audit chain read/append/verify with chaining hash. Fixes THOTH-FINDINGS D-02 (no chaining hash — entries independently signed, can be deleted/reordered). Add previousHash field to AuditChainEntry. Compute HMAC-SHA256(auditKey, previousHash + canonicalContent) for each entry. Wraps agent-sdk suite/audit/hash-chain.ts. Content canonicalization via RFC 8785 (JCS) ensures deterministic serialization before hashing. All chain entries are serialized to canonical JSON before HMAC computation, preventing false tamper-detection from non-deterministic JSON serialization.

The current audit implementation stores entries independently — each entry is signed in isolation, which means entries can be deleted or reordered without detection. This pulse introduces a chained hash model where each entry's hash is computed as HMAC-SHA256(auditKey, previousHash + canonicalContent), creating a tamper-evident chain. The first entry has a null previousHash. All subsequent entries reference the hash of their predecessor, forming an append-only integrity chain.

The implementation wraps agent-sdk's suite/audit/hash-chain.ts to reuse the existing hash computation primitives while adding the chaining logic in claws-sdk's audit module. Types are defined cleanly to support downstream pulses (verify, WAL, witness, export).

## Deliverables

- [ ] `claws-sdk/src/audit/types.ts` — AuditEntry, ChainEntry (with previousHash), ChainVerifyResult, ExportFormat types
- [ ] `claws-sdk/src/audit/chain.ts` — chain read/append with HMAC-SHA256 keyed hashes: HMAC-SHA256(auditKey, previousHash + canonicalContent), wraps agent-sdk
- [ ] Content canonicalization using RFC 8785 canonical JSON for chain entries
- [ ] `claws-sdk/src/audit/index.ts` — barrel exports
- [ ] `claws-sdk/tests/audit/chain.unit.test.ts` — L0: append creates entry with previousHash (1), HMAC-SHA256 chained hash computed correctly (1), first entry has null previousHash (1), chain order preserved (1)
- [ ] `claws-sdk/tests/audit/chain.integration.test.ts` — L1: append 100 entries then verify all HMAC-SHA256 chaining hashes (1), tampered entry detected mid-chain (1)

## Acceptance Criteria

- [ ] AuditChainEntry includes previousHash field (string | null)
- [ ] First entry in chain has previousHash === null
- [ ] Each subsequent entry's hash === HMAC-SHA256(auditKey, previousHash + canonicalContent)
- [ ] Chain uses HMAC-SHA256 with workspace audit key, not bare SHA-256
- [ ] Chain entries use RFC 8785 canonical JSON serialization
- [ ] Chain read returns entries in append order
- [ ] Barrel exports resolve: `import { AuditEntry, ChainEntry } from '../audit'` works
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, SDK wrapping patterns, barrel export conventions
- `.craft/roles/claws/ciso.md` — audit chain integrity, hash chaining requirements, tamper-evidence design

## Dependencies

None — this is the first pulse in CP-2.

## Test Gates

- [ ] L0 unit (4 tests): append creates entry with previousHash (1), HMAC-SHA256 chained hash computed correctly (1), first entry has null previousHash (1), chain order preserved (1)
- [ ] L1 integration (2 tests): append 100 entries then verify all HMAC-SHA256 chaining hashes (1), tampered entry detected mid-chain (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
