---
pulse: 30
slug: badge-generation
plan: claws-badge
depends_on: [29]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [skill-lifecycle/S03]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 30: Badge Generation

## Objective
Implement badge metadata generation with tier-aware qualifiers and inconsistency detection. Badges are the user-facing governance signal — they communicate a skill's governance posture at a glance.

**Tier-Aware Qualifiers**:
- **DECLARED** badges display a "self-reported" qualifier — the skill author has declared governance metadata but it hasn't been verified by compilation. Users should understand this is attestation, not verification.
- **TYPED** badges display the tier without qualifier — decorators are present and type-checked but not fully compiled.
- **VERIFIED** badges display a "verified" seal — the skill has been fully compiled with all governance checks passing.

**Supply Chain Badge**: Independent of the governance tier. Indicates whether the published artifact is signed (build provenance verified) or unsigned (no cryptographic attestation of build origin). A DECLARED skill can be signed (the manifest is signed, even though governance is self-reported), and a VERIFIED skill could theoretically be unsigned (verified locally but published without signing).

**Inconsistency Detection**: Flags contradictions in governance metadata:
- **Risk-OBO contradiction** — R1 (minimal risk) skill claiming OBO transact capability is flagged. Low-risk skills shouldn't need to act on behalf of users for financial transactions.
- **Data-tier mismatch** — CONFIDENTIAL data label with DECLARED tier is flagged. Sensitive data should require at least TYPED governance.

**Pre-badge rendering**: Skills that haven't been through the badge pipeline render with no badge (not an error badge). Absence of badge is distinct from failed badge.

**Namespace boundary**: Badge generation lives in claws-sdk (the `claws` namespace). Badge rendering for ClawHub display is a separate concern in the `clawhub` namespace.

## Deliverables
- [ ] `claws-sdk/src/maker/badge.ts` — badge metadata generation: tier, qualifier, risk, OBO, data labels, supply chain fields
- [ ] `claws-sdk/src/maker/badge-consistency.ts` — inconsistency detection: risk-OBO contradiction, data-tier mismatch flagging
- [ ] `claws-sdk/src/maker/badge-types.ts` — BadgeMetadata, BadgeQualifier, BadgeStaleness, BadgePolicy types
- [ ] `claws-sdk/tests/maker/badge.unit.test.ts` — L0: DECLARED renders "self-reported" (1), VERIFIED renders "verified" (1), supply chain independent of tier (1), R1+transact OBO flagged (1), pre-badge skill renders no badge (1), claws/clawhub namespace boundary (1)
- [ ] `claws-sdk/tests/maker/badge-consistency.integration.test.ts` — L1: risk-OBO contradiction detected (1), data-tier mismatch detected (1)

## Acceptance Criteria
- [ ] DECLARED badge displays "self-reported" qualifier
- [ ] VERIFIED badge displays "verified" seal
- [ ] Supply chain badge (signed/unsigned) is independent of governance tier
- [ ] R1 + OBO transact combination is flagged as inconsistency
- [ ] CONFIDENTIAL data + DECLARED tier is flagged as mismatch
- [ ] Pre-badge skills render with no badge, not error badge
- [ ] Badge generation stays in claws-sdk namespace; rendering is clawhub concern
- [ ] All 6 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies
- Pulse 29 (maker-publish) — manifest and tier evaluation used by badge generation

## Test Gates
- [ ] L0 unit (6 tests): DECLARED renders "self-reported", VERIFIED renders "verified", supply chain independent of tier, R1+transact OBO flagged, pre-badge skill renders no badge, claws/clawhub namespace boundary
- [ ] L1 integration (2 tests): risk-OBO contradiction detected, data-tier mismatch detected
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
