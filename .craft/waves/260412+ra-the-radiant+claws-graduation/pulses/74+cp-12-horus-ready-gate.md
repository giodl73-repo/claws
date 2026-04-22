---
pulse: 74
slug: cp-12-horus-ready-gate
plan: claws-pre-extraction-packaging
depends_on: [57, 58, 59]
governing_roles: [craft:architect, craft:conformance, craft:director, claws:gateway-eng]
scenario_codes: []
stage: review
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --coverage"
    - "cd claws-serve && npx vitest run --coverage"
    - "cd claws-cli && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 12
checkpoint_gate: true
wave_gate: true
---

# Pulse 74: CP-12 CLI + E2E + Horus-Ready Final Gate (Ra Close)

## Objective

**Final Ra gate + Horus handoff gate** (`wave_gate: true` per architect M3 closure). Mirror cp-12.md Exit Criteria verbatim. Horus-readiness checklist. After this pulse, Ra closes and Horus can run filter-repo against a source tree that lifts cleanly into bic/claws.

## Deliverables

- [x] `claws-sdk/packages/` has 4 coherent packages (workspace + guardrails + policy + snap)
- [x] Zero `@craftworks/*` runtime imports across `claws-sdk/packages/` + `claws-sdk/src/` + `claws-serve/src/` (CI guard active; verified green — 0 `from '@craftworks/'` matches in all three trees)
- [x] Zero `@openclaw/*` occurrences in internal trees (all `@bic/openclaw-*`) — remaining @openclaw refs are emit-template string literals + test assertions on emitted output (legitimate per P57 scope-prefix design) or doc-comments
- [x] Legacy diagnostic-prefix rename to `OC-POLICY-E<nnn>` complete across code + tests + registry (P59 mechanical rename) — verified: grep of legacy prefix returns zero across repo
- [x] All 20 CLI verbs (9 policy + 11 snap) green E2E against fixture workspace (P58) — verified: 21 tests pass (9 policy + 12 snap)
- [x] Decision-path E2E (review / modify / deny) all pass (P58) — verified: 3 tests pass
- [x] Emitter scope-prefix flag works — byte-identical policy-ir.json + audit-manifest.json across scopes (P57) — verified: 15 scope-prefix tests pass
- [ ] Every pre-extraction-packaging deliverable is ✓ (no deferrals — every finding resolved in-pulse per user directive) — **blocked on P59** (coverage backfill gaps tracked in DEFERRED.md with named owners; P59 closes these)
- [x] `claws-serve` bic/claws-internal routes still functional (regression check green) — `cd claws-serve && npx tsc --noEmit` exits 0
- [ ] Panel review on final state: zero unresolved Majors — **pending** (task #5 CP-12 panel review; runs after P59 lands)
- [x] **Filter-repo lift manifest** produced (steward M7 closure) — `claws-sdk/FILTER-REPO-MANIFEST.md` enumerates:
  - **refs preservation**: which Ra commits filter-repo keeps; which are squashed; which are dropped
  - **commit-rewrite rules**: author/committer mapping; message-prefix normalization
  - **path-spec list**: exact paths Horus filter-repo carries into `bic/claws/` (claws-sdk/packages/**, claws-sdk/DISPOSITION.md-sourced subtrees, claws-serve-internal routes, claws-lsp) + paths dropped
  - `.craft/waves/` disposition: Ra wave directory stays in craftworks; does NOT lift into bic/claws (filter-repo excludes)
  - docs paths: which `docs/claws/` lifts vs stays craftworks-side
- [x] DISPOSITION.md complete for all non-consolidated subtrees (verified from P75) — 40 dispositions, zero deferrals, zero TBDs
- [x] claws-lsp rename complete per 6-point cascade (verified from P76) — package.json name = `@bic/openclaw-lsp`
- [ ] Ready for `/craft-push ra cp-12` — **blocked on P59 + panel review**
- [ ] Wave ready for `/craft-run close` after push — **Ra closes here; Horus begins** — **blocked on P59 + panel review**

## Acceptance Criteria

- All cp-12.md Exit Criteria mirror verbatim
- wave_gate: true + checkpoint_gate: true in frontmatter
- Filter-repo lift manifest exists and enumerates all 4 Horus-input items
- No deferrals anywhere; panel dry-run shows zero Majors

## Governing Roles

- `craft:architect` — final 4-package shape coherence
- `craft:conformance` — pre-extraction deliverable checklist mechanically complete (no deferrals)
- `craft:director` — Ra close-out signaling + Horus handoff readiness
- `claws:gateway-eng` — 20-verb E2E + decision-path coverage signed off

## Dependencies

P57 + P58 + P59 (depends_on in frontmatter; chain back to P56 CP-11 gate).

## Test Gates

All packages green on vitest + tsc --noEmit. Filter-repo lift manifest present and enumerated. Zero @craftworks / zero @openclaw / zero OC-POLICY-E in internal trees. 20-verb E2E + 3-decision-path tests green. No deferrals. Panel dry-run zero Majors.
