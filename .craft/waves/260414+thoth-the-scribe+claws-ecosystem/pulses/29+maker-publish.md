---
pulse: 29
slug: maker-publish
plan: claws-maker-commands
depends_on: [27, 28]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [skill-lifecycle/S05]
stage: implementation
test_tiers:
  L0_unit: 7
  L1_integration: 5
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 29: Maker Publish

## Objective

Implement the governed publish pipeline that ensures skills meet governance requirements before they reach ClawHub. The publish command is the gateway between local skill development and the public registry.

**Publish Pipeline**:

1. **Pinch pre-flight check** — runs pinch validation on the skill. Skills that fail pinch (governance content doesn't compress within profile budget while maintaining fidelity) are blocked from publishing.
2. **Tier evaluation** — determines the skill's governance tier: DECLARED (self-reported frontmatter only), TYPED (frontmatter + decorators), or VERIFIED (full build with passing checks).
3. **Manifest signing** — generates `.claws-manifest.json` with build provenance: policy hash, risk level, OBO status, tier, compilation timestamp, and cryptographic signature.
4. **ClawHub API call** — submits the skill package with governance metadata injected into the publish payload.
5. **Atomic rollback** — if the remote publish fails (network error, ClawHub rejection), all local state changes are rolled back. No partial publish state (P-228).

**Integration Coverage Hardening** (THOTH-INTEGRATION-COVERAGE): publish area at 49% is critically below the 90% target. This pulse adds 3 additional L1 integration tests covering the full publish lifecycle, fleet policy enforcement, and rollback on registry failure to close the gap to 90%+.

**Scenario-driven requirements**:

- Unsigned vs invalid-signed distinction (S05-F01) — "no signature" (DECLARED) is different from "broken signature" (tampered). Different badge rendering and trust implications.
- Security warnings not suppressible (S05-F03) — governance security warnings cannot be silenced by `--quiet` or `--silent` flags. They always render.
- Per-version badge storage (S05-F09) — each published version has its own badge snapshot. v1.0.0 and v1.1.0 can have different governance tiers.

## Deliverables

- [ ] `claws-sdk/src/maker/publish.ts` — governed publish: pinch pre-flight, tier evaluation, manifest sign, ClawHub API call, atomic rollback on failure
- [ ] `claws-sdk/src/maker/manifest.ts` — .claws-manifest.json generation: build provenance, policy hash, risk/OBO/tier fields, signature
- [ ] `claws-sdk/tests/maker/publish.unit.test.ts` — L0: pinch pass allows publish (1), pinch fail blocks publish (1), tier determination DECLARED/TYPED/VERIFIED (1), atomic rollback on remote failure (1), security warnings not suppressible by --quiet (1)
- [ ] `claws-sdk/tests/maker/manifest.unit.test.ts` — L0: provenance fields correct (1), signature generation correct (1)
- [ ] `claws-sdk/tests/maker/publish.integration.test.ts` — L1: full publish pipeline with mocked ClawHub (1), publish TYPED skill with governance badge (1), full publish lifecycle: compile → sign → upload to mock registry → verify manifest (1), publish with fleet policy enforcement: DECLARED blocked, VERIFIED allowed (1), publish rollback: mock registry returns 500 → local staging cleaned up (1)
- [ ] `claws-sdk/tests/fixtures/mock-registry/` — mock registry fixture for publish integration tests
- [ ] `claws-sdk/tests/maker/publish.e2e.test.ts` — L2: scaffold, annotate, publish lifecycle (1)
- [ ] `claws-sdk/tests/maker/publish.accept.test.ts` — L3: SDK acceptance — consumer publishes a TYPED skill through full pipeline, verifies manifest signing, tier evaluation, and atomic rollback on simulated registry failure
- [ ] `claws-cli/tests/maker/publish.accept.test.ts` — L3: CLI acceptance — `claws maker publish` on TYPED skill produces signed manifest with correct provenance; security warnings render despite --quiet flag
- [ ] `claws-sdk/tests/fixtures/tier2-skill/` — TYPED skill with decorators for publish testing

## Acceptance Criteria

- [ ] Skills that fail pinch pre-flight are blocked from publishing
- [ ] Tier evaluation correctly determines DECLARED, TYPED, and VERIFIED
- [ ] .claws-manifest.json contains build provenance, policy hash, risk, OBO, tier, and signature
- [ ] Unsigned (DECLARED) and invalid-signed (tampered) are distinguished
- [ ] Security warnings cannot be suppressed by --quiet or --silent flags
- [ ] Remote publish failure triggers atomic rollback of local state
- [ ] Per-version badge storage: each version has independent badge snapshot
- [ ] All 7 L0 unit tests pass
- [ ] All 5 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies

- Pulse 27 (maker-scaffold) — types, templates, and barrel exports
- Pulse 28 (maker-annotate-import) — annotation engine used in publish pre-flight

## Test Gates

- [ ] L0 unit (7 tests): pinch pass allows publish, pinch fail blocks publish, tier determination DECLARED/TYPED/VERIFIED, atomic rollback on remote failure, security warnings not suppressible by --quiet, manifest provenance fields correct (1), manifest signature generation correct (1)
- [ ] L1 integration (5 tests): full publish pipeline with mocked ClawHub, publish TYPED skill with governance badge, full publish lifecycle: compile → sign → upload to mock registry → verify manifest, publish with fleet policy enforcement: DECLARED blocked VERIFIED allowed, publish rollback: mock registry returns 500 → local staging cleaned up
- [ ] L2 e2e (1 test): scaffold, annotate, publish lifecycle
- [ ] L3 accept (2 tests): SDK — publish TYPED skill with manifest signing + rollback; CLI — `claws maker publish` with provenance + security warnings
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
