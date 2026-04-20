---
pulse: 4
slug: governance-ir-serialization
plan: claws-governance-ir
depends_on: [3]
governing_roles: [craft:dragon, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/ir/serialization.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 04: GovernanceIR Serialization + Audit Signing

## Objective

Implement JSON serialization and deserialization for GovernanceIR with sorted-key determinism for stable hashing. Implement round-trip fidelity test proving `parse(serialize(ir)) === ir` (deep equality). Add HMAC-SHA256 signing for audit chain entries so every audit event is integrity-protected from day one. Implement raw-byte SHA-256 hashing for lossless verification with BOM-strip and LF-normalization pipeline.

## Deliverables

- [ ] `claws-sdk/src/ir/governance-ir.ts` — MODIFY: add `serialize(ir)` and `deserialize(json)` functions with sorted-key determinism
- [ ] `claws-sdk/src/ir/governance-ir.ts` — MODIFY: add dual hash scheme (normalized IR hash + raw lossless verification hash)
- [ ] `claws-sdk/src/ir/governance-ir.ts` — MODIFY: BOM-strip then LF-normalize then hash pipeline
- [ ] `claws-sdk/src/compliance/artifact-signer.ts` — NEW: HMAC-SHA256 signing for audit chain entries, sign/verify functions
- [ ] `claws-sdk/tests/ir/serialization.unit.test.ts` — 6 L0 tests:
  - Round-trip: `deserialize(serialize(ir))` deep-equals original
  - Sorted-key determinism: same IR always produces identical JSON bytes
  - Empty arrays serialize as `[]` (canonical format)
  - Hash stability: CRLF vs LF input produces same hash after normalization
  - Hash stability: BOM-stripped vs raw produces same hash
  - HMAC-SHA256 sign then verify succeeds for audit event
- [ ] `claws-sdk/tests/ir/serialization.integration.test.ts` — 2 L1 tests:
  - Multi-field GovernanceIR with intents, manifest, analysis round-trips
  - Audit chain with 3 signed entries verifies in sequence

## Acceptance Criteria

- [ ] `deserialize(serialize(ir))` === `ir` for all GovernanceIR shapes (deep equality)
- [ ] Serialization uses deterministic sorted keys — same IR always produces identical JSON string
- [ ] Empty arrays serialize as `[]`, not `null` or omitted
- [ ] CRLF and LF inputs produce identical hash after normalization
- [ ] BOM-prefixed and clean inputs produce identical hash after stripping
- [ ] HMAC-SHA256 sign/verify round-trip succeeds
- [ ] Tampered audit events fail HMAC verification
- [ ] All 6 L0 + 2 L1 tests pass
- [ ] `cd claws-sdk && npx tsc --noEmit` passes

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/dragon.md` — serialization correctness, hash determinism, round-trip fidelity invariants
- `.craft/roles/claws/gateway-eng.md` — audit chain integrity, compliance evidence format, HMAC requirements

## Dependencies

Pulse 03 must be complete — GovernanceIR types must exist before serialization can be implemented.

## Review Amendments (R1)

### C04: HMAC Key Provisioning
- [ ] Auto-generate `.claws/keys/hmac.key` on first compile if not exists (32-byte random, crypto.randomBytes)
- [ ] Add `.claws/keys/` to auto-generated .gitignore rule
- [ ] Set file permission 0600 on key file (Unix) or ACL-restricted (Windows)
- [ ] Key rotation: `claws keys rotate` generates new key, re-signs last N audit entries with new key
- [ ] First-run MUST never fail due to missing key — silent auto-provisioning

### Dragon: Audit Chain Schema
- [ ] AuditChainEntry includes `keyId` field (allows key rotation without breaking chain)
- [ ] AuditChainEntry includes `algorithm` field (e.g., "hmac-sha256") for algorithm agility
- [ ] Append-only chain: `.claws/audit/chain.jsonl` with sequential integrity
- [ ] CLAWS_BYPASS=1 MUST write audit entry with eventType "BYPASS_ACTIVATED" before any tool call proceeds
