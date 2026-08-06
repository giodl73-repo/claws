---
pulse: 31
slug: badge-staleness
plan: claws-badge
depends_on: [30]
governing_roles: [craft:architect, claws:ciso]
scenario_codes: [pitfall-thoth-2/P-226, pitfall-thoth-2/P-227]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
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

# Pulse 31: Badge Staleness

## Objective

Implement staleness detection and tier downgrade logic for governance badges. Badges are not permanent — they reflect the governance state at a specific point in time. When the underlying skill changes, badges must be re-evaluated.

**Handler Modification Detection**: After a VERIFIED build, if the skill's `handler.ts` is modified, the manifest signature becomes invalid. The staleness detector compares the current handler hash against the hash stored in `.claws-manifest.json`. A mismatch triggers an automatic pinch downgrade from VERIFIED to TYPED — the decorators are still present (so it's not DECLARED), but the verified compilation is stale.

**Frontmatter-Only Edits**: Editing only the SKILL.md frontmatter (risk level adjustments, data label updates, description changes) does NOT invalidate the DECLARED tier. Frontmatter is self-reported metadata, so changes to it are consistent with the DECLARED governance model.

**Per-Version Badge Storage**: Each published version has its own badge snapshot. v1.0.0 may be VERIFIED while v1.1.0 is TYPED (because the handler was modified after the v1.0.0 build but before v1.1.0 was re-verified). Badge queries must specify a version.

**Badge Re-Validation**: Running `claws build --skill` re-compiles the governance checks and, if all pass, restores the VERIFIED badge. This is the path from TYPED back to VERIFIED after handler modifications.

**Pitfall coverage**:

- P-226: Badge staleness detection must handle concurrent edits gracefully
- P-227: Per-version badge storage must not leak badge state across versions

## Deliverables

- [ ] `claws-sdk/src/maker/badge-staleness.ts` — handler hash comparison, signature validation, tier downgrade logic, per-version badge storage
- [ ] `claws-sdk/tests/maker/badge-staleness.unit.test.ts` — L0: handler edit invalidates VERIFIED (1), frontmatter edit preserves DECLARED (1), per-version badge independence (1), re-verification restores VERIFIED (1)
- [ ] `claws-sdk/tests/maker/badge-lifecycle.integration.test.ts` — L1: DECLARED to TYPED to VERIFIED transitions (1), per-version badge query (1)
- [ ] `claws-sdk/tests/maker/badge-staleness.e2e.test.ts` — L2: full staleness lifecycle: VERIFIED, edit handler, TYPED, rebuild, VERIFIED (1)
- [ ] `claws-sdk/tests/maker/badge-staleness.accept.test.ts` — L3: SDK acceptance — consumer modifies handler after VERIFIED build, verifies automatic downgrade to TYPED, then re-verifies to restore VERIFIED badge with per-version independence
- [ ] `claws-cli/tests/maker/badge-staleness.accept.test.ts` — L3: CLI acceptance — `claws build --skill` detects stale VERIFIED badge, reports downgrade, and re-verification restores VERIFIED with correct per-version badge query
- [ ] `claws-sdk/tests/fixtures/stale-verified-skill/` — VERIFIED skill with modified handler.ts (handler hash differs from manifest)

## Acceptance Criteria

- [ ] Handler modification after VERIFIED build triggers downgrade to TYPED
- [ ] Frontmatter-only edits preserve DECLARED tier (no downgrade)
- [ ] Per-version badge storage: v1.0.0 and v1.1.0 have independent badges
- [ ] Badge state does not leak across versions
- [ ] `claws build --skill` re-verification restores VERIFIED badge
- [ ] Concurrent edit scenarios handled gracefully (P-226)
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass
- [ ] All 2 L3 accept tests pass (SDK + CLI)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/ciso.md` — security posture, supply chain integrity, trust boundaries

## Dependencies

- Pulse 30 (badge-generation) — badge metadata types and generation logic

## Test Gates

- [ ] L0 unit (4 tests): handler edit invalidates VERIFIED, frontmatter edit preserves DECLARED, per-version badge independence, re-verification restores VERIFIED
- [ ] L1 integration (2 tests): DECLARED to TYPED to VERIFIED transitions, per-version badge query
- [ ] L2 e2e (1 test): full staleness lifecycle (VERIFIED, edit handler, TYPED, rebuild, VERIFIED)
- [ ] L3 accept (2 tests): SDK — staleness downgrade + re-verify with per-version independence; CLI — `claws build --skill` staleness report + re-verification
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
