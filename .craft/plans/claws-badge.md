---
slug: claws-badge
preset: "claws"
plan: "2 headlines: ClawHub badges distinguish self-reported DECLARED from compiler-verified VERIFIED, badges are per-version with staleness detection"
area: claws
status: Implemented
phase: thoth
atoms: [atom:governance-badge, atom:tier-adoption, atom:claws-publish]
specs: [CL-05, CL-06]
---

# claws-badge — ClawHub Governance Badges

## Headlines

1. **H1: ClawHub badges visually distinguish self-reported DECLARED from compiler-verified VERIFIED, with self-reported qualifier** — DECLARED-tier badges carry a "self-reported" qualifier on all governance fields (risk, OBO, data sensitivity). At DECLARED tier, `obo: none` means "the developer claims no OBO" -- unverified. At VERIFIED tier, `obo: none` means "claws confirmed no OBO through analysis of the handler code via @bic/claws-test's 12 governance checks." The badge renders this distinction: DECLARED badges show "R3 (self-reported)" while VERIFIED badges show "R3 (verified)". Supply chain badge (signed/unsigned) is independent of governance tier -- a DECLARED skill published via `claws publish` is unsigned but governed, while a VERIFIED skill published via raw `clawhub publish` is signed but ungoverned on ClawHub. Inconsistent metadata (e.g., R1 risk + transact OBO) is flagged on the badge, not silently displayed.
   - Validation: DECLARED badge renders "R3 (self-reported)" not just "R3"
   - Validation: VERIFIED badge renders "R3 (verified)" with verification seal
   - Validation: Supply chain badge shows "unsigned" even for a DECLARED skill with full governance frontmatter
   - Validation: Badge with R1 risk + obo: transact shows inconsistency warning

2. **H2: Badges are stored per-version and detect staleness from handler modification** — Each published version receives its own badge metadata snapshot. A consumer installing v1.0.0 sees the DECLARED badge from that version, not the VERIFIED badge from v1.1.0. Staleness detection triggers when the handler.ts is modified after the last VERIFIED build: the manifest signature becomes invalid, and `claws pinch` downgrades the displayed tier to TYPED until a new `claws build --skill` re-verifies. Badge re-validation policy: badges are immutable per-version (no retroactive changes), but ClawHub can annotate stale versions when newer versions exist. Enterprise install policies require higher tiers (TYPED or VERIFIED) for CONFIDENTIAL/RESTRICTED data sensitivity, since only compiler analysis validates data flow labels.
   - Validation: v1.0.0 badge query returns DECLARED, v1.1.0 badge query returns VERIFIED for same skill
   - Validation: Handler modification after VERIFIED build triggers tier downgrade to TYPED on next pinch
   - Validation: Enterprise policy blocks install of DECLARED skill with data: RESTRICTED
   - Validation: Pre-badge skills (published before badges existed) render with no badge, not error badge

## Summary

The badge plan covers ClawHub governance badge generation, storage, staleness detection, and enterprise policy enforcement. The core insight from skill-lifecycle scenario S03 is that DECLARED-tier badges carry unverified claims (P-226) and must be visually distinguished from VERIFIED badges. Per-version storage (S05-F09) prevents badge confusion across versions. Staleness detection (P-227) prevents stale VERIFIED badges after handler modifications. Enterprise tier requirements (S03-F05) enforce minimum tiers based on data sensitivity. This plan produces badge metadata -- ClawHub server-side rendering is out of scope.

## Coverage Contract

### Specs
- [ ] CL-05 -- ClawHub Governance Badges: visual distinction, self-reported qualifier, staleness detection, tier downgrade
- [ ] CL-06 -- Platform Ecosystem: per-version badge storage, metadata namespace, pre-badge backward compatibility

### Concept Guides
- [ ] docs/claws/badges/governance-badges.md (NEW) -- badge tiers, self-reported vs verified, staleness, per-version storage
- [ ] docs/claws/maker/three-tier-adoption.md (EDIT) -- add badge implications per tier, enterprise enforcement

### Scenario Coverage
- [ ] badge/declared-self-reported -- DECLARED badge includes "self-reported" qualifier
- [ ] badge/verified-compiler-checked -- VERIFIED badge includes "verified" seal
- [ ] badge/supply-chain-independent -- unsigned supply chain with full governance frontmatter
- [ ] badge/inconsistent-metadata -- R1 risk with transact OBO flagged
- [ ] badge/per-version-storage -- v1.0.0 and v1.1.0 have independent badges
- [ ] badge/staleness-handler-modified -- handler edit invalidates VERIFIED, displays TYPED
- [ ] badge/staleness-frontmatter-only -- frontmatter edit preserves DECLARED tier
- [ ] badge/enterprise-data-restriction -- CONFIDENTIAL data requires TYPED+ tier
- [ ] badge/pre-badge-skill -- skill published before badges shows no badge
- [ ] badge/re-verification -- new `claws build --skill` restores VERIFIED after handler edit

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 14 | Badge tier rendering (3), self-reported qualifier (2), supply chain independence (2), inconsistency detection (2), staleness detection (3), enterprise policy (2) |
| L1 integration | 5 | Badge generation + publish pipeline, staleness + pinch, per-version badge query, enterprise policy + tier |
| L2 e2e | 2 | Full badge lifecycle: DECLARED -> TYPED -> VERIFIED across versions, enterprise policy enforcement |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

### SDK Logic (claws-sdk)
- `claws-sdk/src/maker/badge.ts` (NEW) -- badge metadata generation: tier, qualifier, risk, OBO, data, supply chain
- `claws-sdk/src/maker/badge-staleness.ts` (NEW) -- staleness detection: compare handler hash against manifest hash, tier downgrade
- `claws-sdk/src/maker/badge-consistency.ts` (NEW) -- inconsistency detection: risk-OBO contradiction, data-tier mismatch
- `claws-sdk/src/maker/badge-policy.ts` (NEW) -- enterprise tier enforcement: minimum tier per data sensitivity level
- `claws-sdk/src/maker/badge-types.ts` (NEW) -- BadgeMetadata, BadgeQualifier, BadgeStaleness, BadgePolicy types

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- badge visual distinction, self-reported qualifier, staleness detection, tier downgrade
- [ ] CL-06 amendment -- per-version badge storage, metadata namespace boundary, pre-badge rendering

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/maker/badge.ts -- badge metadata generation with tier-aware qualifiers
- [ ] claws-sdk/src/maker/badge-staleness.ts -- handler hash comparison, signature validation, tier downgrade logic
- [ ] claws-sdk/src/maker/badge-consistency.ts -- risk-OBO contradiction, data-tier mismatch detection
- [ ] claws-sdk/src/maker/badge-policy.ts -- enterprise minimum tier per data sensitivity
- [ ] claws-sdk/src/maker/badge-types.ts -- all badge type definitions
- [ ] claws-sdk/tests/maker/badge.unit.test.ts -- tier rendering, qualifier, supply chain field
- [ ] claws-sdk/tests/maker/badge-staleness.unit.test.ts -- hash comparison, signature invalid, tier downgrade
- [ ] claws-sdk/tests/maker/badge-consistency.unit.test.ts -- risk-OBO contradictions, data-tier mismatches
- [ ] claws-sdk/tests/maker/badge-policy.unit.test.ts -- enterprise tier enforcement per data sensitivity
- [ ] claws-sdk/tests/maker/badge-lifecycle.integration.test.ts -- DECLARED -> TYPED -> VERIFIED badge transitions
- [ ] claws-sdk/tests/maker/badge-version.integration.test.ts -- per-version badge storage and query
- [ ] claws-sdk/tests/fixtures/stale-verified-skill/ (NEW) -- VERIFIED skill with modified handler.ts (stale manifest)
- [ ] claws-sdk/tests/fixtures/inconsistent-metadata-skill/ (NEW) -- skill with R1 risk + obo: transact

### CLI Wiring
- None in this plan (badge generation is SDK only -- CLI display comes in claws-cli plan)

### Scenario-Driven Additions

**From skill-lifecycle S03 (governance-badge-assignment):**
- [ ] Visual distinction between DECLARED and VERIFIED badges: "self-reported" vs "verified" qualifiers (S03-F01)
- [ ] Self-reported qualifier on DECLARED-tier OBO claims: unverified at DECLARED, compiler-confirmed at VERIFIED (S03-F02, P-226)
- [ ] Supply chain badge independent of governance tier: unsigned/signed orthogonal to DECLARED/VERIFIED (S03-F03)
- [ ] Badge staleness and re-validation policy: per-version immutable, annotate stale versions (S03-F04)
- [ ] Data sensitivity requires higher tier for enterprise trust: CONFIDENTIAL/RESTRICTED need TYPED+ (S03-F05)
- [ ] Inconsistent governance metadata display: risk-OBO contradictions flagged on badge (S03-F06)

**From skill-lifecycle S02 (three-tier-upgrade-path):**
- [ ] Signature staleness detection and tier downgrade: handler modification invalidates VERIFIED (S02-F06, P-227)
- [ ] Tier detection from workspace state, not stored metadata: pinch reads current state (S02-F05)

**From skill-lifecycle S05 (publish-unsigned-manifest):**
- [ ] Per-version badge storage: version-specific badge queries on ClawHub (S05-F09)
- [ ] Badge freshness at publish time: read current SKILL.md frontmatter (S05-F06)

## Out of Scope

- ClawHub server-side badge rendering and display (external system)
- Manifest signing infrastructure (that's claws-comply-audit + claws-key-management plans)
- Publish pipeline and fleet policy (that's claws-publish plan)
- @bic/claws-test governance checks (that's claws-test-framework plan)
- Badge color/icon accessibility design (UX work, not compiler logic)
- Fleet-wide badge aggregation and reporting (that's claws-fleet-ops plan)

## Notes

- P-226 is the driving pitfall: DECLARED-tier OBO claim unverified -- badge shows "obo: none" but handler actually calls email APIs
- P-227 is the staleness pitfall: developer modifies handler after VERIFIED build, badge still shows VERIFIED
- Badge metadata is generated by this plan, consumed by claws-publish for injection into ClawHub payload
- Inconsistency detection reuses CL-02 risk-OBO consistency rules from claws-rules plan
- Per-version storage means badges are immutable once published -- no retroactive downgrades
- Enterprise policy enforcement is the same tier-per-risk logic from claws-scaffold (S02-F03) applied at install time
- Depends on claws-maker-commands (badge integration), claws-publish (badge injection), claws-rules (consistency rules)
