---
pulse: 35
slug: loop-soul-sync
plan: claws-cap-integration
depends_on: [30, 31]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S09, S10, S19]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 35: Loop Soul Sync

## Objective

Implement GET /api/loop/soul and PATCH /api/loop/soul endpoints that expose SOUL.md as Loop-syncable sections (business logic in claws-sdk/src/workspace/, route is thin HTTP adapter). Each section of SOUL.md becomes an independently addressable unit that M365 Loop can render and edit. The section parser in claws-sdk decomposes SOUL.md into typed sections with governance context: deny rule count per section, compiler-injected marking detection via GovernanceIR, and lock source attribution (r5, fleet, governance, none). PATCH writes route through the existing write-time validation layer before modifying the underlying OC file.

This is a HEAVY pulse. The soul-sections parser must handle arbitrary SOUL.md structures (nested headings, free-form content between sections, YAML frontmatter) while preserving lossless round-trip fidelity. Governance context enrichment queries GovernanceIR for deny rules that apply to each section, attaching rule counts and lock indicators so the Loop UI can render read-only vs. editable regions correctly.

## Deliverables

- [ ] `claws-sdk/src/workspace/soul-sections.ts` — Section parser: decompose SOUL.md into typed SoulSection[] with id, heading, content, governanceContext (denyRuleCount, compilerInjected, lockSource). Uses GovernanceIR to detect deny rules per section. Lossless: reassembled sections reproduce original file byte-for-byte.
- [ ] `claws-serve/src/routes/loop-soul.ts` — GET /api/loop/soul: returns SoulSection[] with governance context. PATCH /api/loop/soul: accepts section id + new content, validates via write-time validation layer, writes back to SOUL.md, triggers incremental recompile.
- [ ] `claws-sdk/tests/workspace/soul-sections.unit.test.ts` — L0: parse single-section SOUL.md (1), parse multi-section with nested headings (1), round-trip lossless (1), governance context attaches deny rule counts (1), compiler-injected marking detected (1), empty SOUL.md returns empty array (1), frontmatter preserved in round-trip (1), section ids are stable across parses (1)
- [ ] `claws-serve/tests/routes/loop-soul.unit.test.ts` — L0 covered by sdk tests above
- [ ] `claws-serve/tests/routes/loop-soul.integration.test.ts` — L1: GET returns sections with governance context (1), PATCH updates section content (1), PATCH rejected for locked section (1), PATCH triggers recompile (1)
- [ ] `claws-serve/tests/routes/loop-soul.e2e.test.ts` — L2: full PATCH -> validate -> write -> compile -> GET round-trip (1)
- [ ] L3 acceptance: S09 (Loop sync renders SOUL.md sections correctly) (1), S10 (governance locks prevent Loop edits to protected sections) (1)

## Acceptance Criteria

- [ ] GET /api/loop/soul returns typed SoulSection[] with governance context per section
- [ ] Each section includes denyRuleCount, compilerInjected boolean, and lockSource
- [ ] PATCH /api/loop/soul validates against write-time validation layer before writing
- [ ] Locked sections (r5, fleet, governance) reject PATCH with appropriate PatchError
- [ ] Round-trip: parse -> reassemble reproduces original SOUL.md byte-for-byte
- [ ] Incremental recompile triggered after successful PATCH
- [ ] S09 acceptance: Loop sync renders SOUL.md sections correctly
- [ ] S10 acceptance: governance locks prevent Loop edits to protected sections
- [ ] All 8 L0 unit tests pass
- [ ] All 4 L1 integration tests pass
- [ ] All 1 L2 e2e test passes

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — workspace file parsing patterns, GovernanceIR integration

## Dependencies

- Pulse 30 (write-time validation layer) — validation pipeline for PATCH
- Pulse 31 (PATCH /api/chunks/*) — route pattern and validation middleware

## Test Gates

- [ ] L0 unit (8 tests): parse single-section, parse multi-section nested headings, round-trip lossless, governance context deny rule counts, compiler-injected marking, empty SOUL.md, frontmatter preserved, stable section ids
- [ ] L1 integration (4 tests): GET returns sections with governance, PATCH updates content, PATCH rejected for locked section, PATCH triggers recompile
- [ ] L2 e2e (1 test): full PATCH -> validate -> write -> compile -> GET round-trip
- [ ] L3 acceptance (2 tests): S09 Loop sync renders sections, S10 governance locks prevent edits
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
