---
slug: claws-publish
preset: "claws"
plan: "2 headlines: claws publish distinguishes unsigned from invalid-signed manifests, publish is atomic with rollback on remote failure"
area: claws
status: Draft
phase: anubis
atoms: [atom:claws-publish, atom:governance-badge, atom:tier-adoption, atom:claws-compiler]
specs: [CL-05, CL-06]
---

# claws-publish — Governed Skill Publishing

## Headlines

1. **H1: `claws publish` distinguishes unsigned from invalid-signed and enforces fleet policy** — The publish command detects three manifest states: (a) no manifest (DECLARED tier, never built -- warn, allow by default), (b) valid manifest with valid signature (VERIFIED tier -- allow, full badge), (c) manifest present but signature invalid (tampered or stale -- block, require rebuild). States (a) and (c) both lack a valid signature but have different severity: (a) is a known governance gap, (c) is a supply chain integrity failure. Fleet policy in claws.json can override the default: `fleet.requireVerifiedPublish: true` blocks DECLARED-tier publishing entirely. Security-relevant warnings (unsigned manifest, signature stale) are never suppressed by `--quiet`.
   - Validation: `claws publish` on a DECLARED skill (no manifest) warns "unsigned" and allows publish by default
   - Validation: `claws publish` on a skill with tampered .claws-manifest blocks publish with "invalid signature -- rebuild required"
   - Validation: `claws publish` with `fleet.requireVerifiedPublish: true` blocks DECLARED-tier publish
   - Validation: `claws publish --quiet` still shows the unsigned manifest warning

2. **H2: Publish is atomic -- no local state mutation until remote confirms success** — The publish pipeline: (1) validate frontmatter via `claws pinch`, (2) compute badge metadata from current SKILL.md (not cached build artifact), (3) inject governance metadata into ClawHub payload, (4) call `clawhub publish`, (5) only on remote success: update local state (version bump, badge cache). If step 4 fails (network error, auth failure), no local state is mutated -- no version increment, no badge metadata written. Badge metadata is always read from current SKILL.md at publish time, not from a stale build artifact, preventing freshness races. The signing key source follows a defined resolution order: CI/CD env var > fleet-managed key > developer identity key.
   - Validation: Publish with simulated network failure at step 4 leaves local version number unchanged
   - Validation: Badge metadata reflects current SKILL.md frontmatter, not a previously cached build
   - Validation: Signing key is resolved from CI env var when present, falling back to fleet key then identity key

## Summary

The publish plan covers the `claws publish` command's governance pre-flight, manifest signing, badge computation, fleet policy enforcement, and atomicity guarantees. The key insight from skill-lifecycle scenario S05 is that "unsigned" and "invalid-signed" are fundamentally different states requiring different remediation. The plan also addresses publish atomicity (P-228): a failed remote publish must not corrupt local state. Fleet policy override (S05-F02), security warning non-suppression (S05-F03), signing key resolution (S05-F04), and badge freshness (S05-F06) complete the publish contract.

## Coverage Contract

### Specs
- [ ] CL-05 -- Maker Experience: publish unsigned vs invalid-signed distinction, fleet policy, atomicity, signing key source
- [ ] CL-06 -- ClawHub governance badge payload, skills published without claws rendering

### Concept Guides
- [ ] docs/claws/maker/publish.md (EDIT) -- add unsigned vs invalid-signed, fleet policy, atomicity, key resolution sections

### Scenario Coverage
- [ ] publish/unsigned-declared -- DECLARED tier, no manifest, warn + allow
- [ ] publish/invalid-signed -- tampered manifest, block + require rebuild
- [ ] publish/valid-verified -- VERIFIED tier, valid signature, full badge
- [ ] publish/fleet-policy-block -- fleet.requireVerifiedPublish blocks DECLARED publish
- [ ] publish/quiet-still-warns -- --quiet does not suppress security warnings
- [ ] publish/atomicity-network-failure -- remote failure rolls back local state
- [ ] publish/atomicity-success -- remote success updates local state
- [ ] publish/badge-freshness -- badge reads current SKILL.md, not stale build
- [ ] publish/signing-key-resolution -- CI env > fleet key > identity key precedence
- [ ] publish/pinch-preflight-fail -- pinch failure blocks publish entirely
- [ ] publish/no-claws-publish -- skill published via raw clawhub publish has no badge

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 16 | Manifest state detection (3), fleet policy check (3), atomicity guard (3), badge freshness (2), key resolution (3), warning suppression (2) |
| L1 integration | 6 | Full publish pipeline with mock ClawHub API, fleet policy + manifest state combinations, pinch preflight + publish |
| L2 e2e | 3 | DECLARED publish, VERIFIED publish, fleet-blocked publish on fixture workspaces |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

### SDK Logic (claws-sdk)
- `claws-sdk/src/maker/publish.ts` (EDIT) -- add manifest state detection (unsigned/invalid/valid), fleet policy check, atomicity guard
- `claws-sdk/src/maker/manifest-state.ts` (NEW) -- detect manifest state: absent, valid-signed, invalid-signed, stale-signed
- `claws-sdk/src/maker/fleet-policy.ts` (NEW) -- read fleet publish policy from claws.json, enforce requireVerifiedPublish
- `claws-sdk/src/maker/publish-atomicity.ts` (NEW) -- atomic publish transaction: stage, commit on remote success, rollback on failure
- `claws-sdk/src/maker/key-resolution.ts` (NEW) -- signing key resolution: CI env var > fleet key > identity key

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- publish unsigned vs invalid-signed, fleet policy, atomicity, key resolution documented
- [ ] CL-06 amendment -- ClawHub rendering for skills published without claws (Open Question 5)

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/maker/publish.ts -- manifest state dispatch, fleet policy gate, atomic publish pipeline
- [ ] claws-sdk/src/maker/manifest-state.ts -- absent/valid/invalid/stale manifest detection
- [ ] claws-sdk/src/maker/fleet-policy.ts -- fleet publish policy enforcement
- [ ] claws-sdk/src/maker/publish-atomicity.ts -- transaction guard: no local mutation until remote success
- [ ] claws-sdk/src/maker/key-resolution.ts -- signing key resolution chain
- [ ] claws-sdk/tests/maker/manifest-state.unit.test.ts -- absent, valid, invalid, stale manifest detection
- [ ] claws-sdk/tests/maker/fleet-policy.unit.test.ts -- requireVerifiedPublish on/off, tier combinations
- [ ] claws-sdk/tests/maker/publish-atomicity.unit.test.ts -- success commit, failure rollback, partial failure
- [ ] claws-sdk/tests/maker/key-resolution.unit.test.ts -- CI env, fleet key, identity key, missing all three
- [ ] claws-sdk/tests/maker/publish-unsigned.integration.test.ts -- full DECLARED publish pipeline
- [ ] claws-sdk/tests/maker/publish-verified.integration.test.ts -- full VERIFIED publish pipeline
- [ ] claws-sdk/tests/maker/publish-blocked.integration.test.ts -- fleet policy blocks DECLARED
- [ ] claws-sdk/tests/fixtures/declared-skill-no-manifest/ (NEW) -- DECLARED skill without .claws-manifest
- [ ] claws-sdk/tests/fixtures/tampered-manifest-skill/ (NEW) -- skill with invalid .claws-manifest signature
- [ ] claws-sdk/tests/fixtures/verified-skill/ (NEW) -- VERIFIED skill with valid .claws-manifest

### CLI Wiring
- None in this plan (publish is SDK only -- CLI `claws publish` comes in claws-cli plan)

### Scenario-Driven Additions

**From skill-lifecycle S05 (publish-unsigned-manifest):**
- [ ] Unsigned vs invalid-signed distinction: no manifest (warn, allow) vs tampered manifest (block, require rebuild) (S05-F01)
- [ ] Fleet-level publish tier requirement: `fleet.requireVerifiedPublish` blocks DECLARED publishing (S05-F02)
- [ ] Security warnings not suppressible by --quiet: unsigned/stale manifest warnings always shown (S05-F03)
- [ ] Manifest signing key source: CI env var > fleet key > identity key resolution order (S05-F04)
- [ ] Publish atomicity with rollback on remote failure: no local state mutation until remote confirms (S05-F05, P-228)
- [ ] Badge freshness at publish time: read current SKILL.md frontmatter, not cached build artifact (S05-F06)
- [ ] ClawHub rendering for skills published without claws: no badge, not error badge (S05-F08, CL-06 OQ5)
- [ ] Per-version badge storage: version-specific badge queries on ClawHub (S05-F09)

## Praetor Integration

- **craft package pipeline**: Delegates to craft package build + publish.
- **Artifact slicer**: Badge metadata injected via slicer metadata hook.
- **Incremental**: Content-hash skip from craft package infrastructure.

## Out of Scope

- Manifest generation and signing infrastructure (that's claws-comply-audit + claws-key-management plans)
- @bic/claws-skill-kit package (that's claws-skill-kit plan)
- Scaffold and template generation (that's claws-scaffold + claws-maker-commands plans)
- ClawHub server-side badge rendering (external system -- this plan generates the payload only)
- Fleet-wide skill inventory scanning (that's claws-fleet-ops plan)
- CI/CD GitHub Action integration (that's claws-cicd-action plan)

## Notes

- The three manifest states map to distinct badge outcomes: absent -> "unsigned", valid -> full badge, invalid -> "verification failed"
- P-228 is the driving pitfall: non-atomic publish leaves local state inconsistent when remote fails
- Fleet policy is read from claws.json `fleet` section, same config surface as other fleet settings in claws-fleet-ops
- Badge metadata namespace must not conflict with clawhub's own metadata fields (S03-F08, CL-06 constraint)
- The atomicity guard uses a two-phase approach: stage locally, commit only after remote 200 response
- Depends on claws-maker-commands (publish.ts base), claws-comply-audit (signing infrastructure), claws-key-management (key resolution)
