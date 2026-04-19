---
pulse: 36
slug: loop-memory-sync
plan: claws-cap-integration
depends_on: [30, 31]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S09]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project unit --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 36: Loop Memory Sync

## Objective

Implement `GET/PATCH /api/oc/MEMORY.md` with section-level responses via the Layer 1 generic router. The "loop" concept is how the RESPONSE is formatted -- sections for M365 Loop rendering -- not a separate endpoint. `GET /api/oc/MEMORY.md` returns typed MemorySection[] where each section is an independently addressable unit (business logic in claws-sdk/src/workspace/, route served by the generic Layer 1 router from pulse 27). If Graph API is available (authenticated M365 context), bidirectional sync between Loop pages and the underlying OC file is supported; otherwise the endpoints operate in local-only mode with no external sync.

`PATCH /api/oc/MEMORY.md` writes route through the existing write-time validation layer. The memory section parser reuses the same section decomposition pattern as soul-sections.ts but handles MEMORY.md-specific structures (memory index tables, feedback entries, project entries with sub-bullets).

## Deliverables

- [ ] `claws-serve/src/routes/loop-memory.ts` — Section-level response formatter for `/api/oc/MEMORY.md`. Registers with the generic Layer 1 router (pulse 27) to provide memory-specific section decomposition. GET returns MemorySection[] with section ids, headings, content. PATCH accepts section id + new content, validates via write-time validation, writes back to MEMORY.md. Optional Graph API sync when M365 auth context is present.
- [ ] `claws-sdk/src/workspace/memory-sections.ts` — Section parser for MEMORY.md: decompose into MemorySection[] (id, heading, content, entryCount). Handles memory index tables, feedback/project/reference sub-sections. Lossless round-trip.
- [ ] `claws-sdk/tests/workspace/memory-sections.unit.test.ts` — L0: parse single-section MEMORY.md (1), parse memory index with table (1), round-trip lossless (1), feedback entries parsed as sub-sections (1), empty MEMORY.md returns empty array (1), entry count per section is correct (1)
- [ ] `claws-serve/tests/routes/loop-memory.integration.test.ts` — L1: GET returns memory sections (1), PATCH updates section content (1), PATCH without Graph API operates in local-only mode (1)
- [ ] `claws-serve/tests/routes/loop-memory.e2e.test.ts` — L2: end-to-end MEMORY.md parse + section edit + round-trip (1)
- [ ] `claws-serve/tests/routes/loop-memory.accept.test.ts` — L3: scenario acceptance test verifying S09 findings (1)

## Acceptance Criteria

- [ ] `GET /api/oc/MEMORY.md` returns typed MemorySection[] with section ids and entry counts
- [ ] `PATCH /api/oc/MEMORY.md` validates against write-time validation layer before writing
- [ ] Round-trip: parse -> reassemble reproduces original MEMORY.md byte-for-byte
- [ ] Memory index tables are preserved during parse and reassembly
- [ ] When Graph API is unavailable, endpoints operate in local-only mode without error
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — workspace file parsing, section decomposition patterns

## Dependencies

- Pulse 30 (write-time validation layer) — validation pipeline for PATCH
- Pulse 31 (PATCH /api/chunks/*) — route pattern and validation middleware

## Test Gates

- [ ] L0 unit (6 tests): parse single-section, parse memory index table, round-trip lossless, feedback entries as sub-sections, empty MEMORY.md, entry count per section
- [ ] L1 integration (3 tests): GET returns memory sections, PATCH updates content, PATCH local-only without Graph API
- [ ] L2 e2e (1 test): end-to-end MEMORY.md section edit round-trip (1)
- [ ] L3 acceptance (1 test): S09 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
