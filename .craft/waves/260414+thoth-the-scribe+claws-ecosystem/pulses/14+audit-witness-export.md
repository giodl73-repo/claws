---
pulse: 14
slug: audit-witness-export
plan: claws-comply-audit
depends_on: [11, 12]
governing_roles: [craft:architect, claws:ciso]
scenario_codes: [compliance-evidence/S03, compliance-evidence/S04]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 3
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

# Pulse 14: Audit Witness Export

## Objective

Witness receipt handling (Merkle proof of inclusion) and multi-format export (CEF, JSON, syslog). Witness receipts stored at `.claws/audit/receipts/`. Export formatters reuse agent-sdk suite/audit/export.ts.

Witness receipts provide cryptographic proof that a specific audit entry existed in the chain at a given point in time. Each receipt contains a Merkle proof (sibling hashes from leaf to root) that can be independently verified without access to the full chain. Receipts are indexed by entry hash for O(1) lookup.

The export module provides three output formats: CEF (Common Event Format) for SIEM integration, JSON for programmatic consumption, and syslog (RFC 5424) for traditional log aggregation. All formats apply consistent PII redaction before output. The streaming export mode handles chains with >10K entries without loading the full chain into memory, using a generator-based approach that processes entries in batches.

## Deliverables

- [ ] `claws-sdk/src/audit/witness.ts` — witness receipt storage, Merkle proof validation, receipt indexing
- [ ] `claws-sdk/src/audit/export.ts` — CEF/JSON/syslog formatters wrapping agent-sdk, consistent PII redaction across formats, streaming export for >10K entries
- [ ] `claws-sdk/tests/audit/witness.unit.test.ts` — L0: receipt storage (1), Merkle proof validation (1)
- [ ] `claws-sdk/tests/audit/export.unit.test.ts` — L0: CEF format correct (1), syslog format correct (1)
- [ ] `claws-sdk/tests/audit/witness.integration.test.ts` — L1: receipt store + validate round-trip (1)
- [ ] `claws-sdk/tests/audit/export.integration.test.ts` — L1: multi-format export pipeline (1), streaming export for large chain (1)

## Acceptance Criteria

- [ ] Witness receipts stored at `.claws/audit/receipts/{entryHash}.json`
- [ ] Merkle proof validates that entry hash is included in chain root
- [ ] Receipt lookup by entry hash is O(1) via index
- [ ] CEF output follows ArcSight Common Event Format specification
- [ ] Syslog output follows RFC 5424 structured data format
- [ ] JSON export produces valid, parseable JSON array
- [ ] PII redaction applied consistently across all three formats
- [ ] Streaming export handles >10K entries without full chain in memory
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — export format design, streaming patterns, agent-sdk wrapping
- `.craft/roles/claws/ciso.md` — witness receipt integrity, Merkle proof requirements, PII redaction

## Dependencies

- Pulse 11 (audit-chain-foundation) — provides ChainEntry types and chain read primitives
- Pulse 12 (audit-verify-integrity) — provides chain verification used in Merkle proof construction

## Test Gates

- [ ] L0 unit (4 tests): receipt storage (1), Merkle proof validation (1), CEF format correct (1), syslog format correct (1)
- [ ] L1 integration (3 tests): receipt store + validate round-trip (1), multi-format export pipeline (1), streaming export for large chain (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
