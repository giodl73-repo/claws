---
pulse: 42
slug: cp-8-polish-gate
plan: claws-pre-extraction-packaging
depends_on: [40, 41]
governing_roles: [craft:architect, craft:conformance]
scenario_codes: []
stage: review
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run: []
  typecheck: []
checkpoint: 8
checkpoint_gate: true
---

# Pulse 42: CP-8 Spec Polish Gate

## Objective

CP-8 gate. Mirror cp-8.md Exit Criteria verbatim (conformance M1). Verify every exit criterion met; deck regenerated with policy-dark theme (pptx only); no Major findings on a dry-run panel review; ready for CP-9 dispatch.

## Deliverables

- [ ] Grep for old bare package names (`audit-chain`, `approval-events`, etc. without `/<sub>` prefix) returns zero in proposal prose
- [ ] Grep for `"11 packages"` / `"12 packages"` / `"8 runtime libs"` returns zero (or only in historical-explanatory notes)
- [ ] Invented-contract audit closed (each §1.4a / §1.4b / §1.4 / `/staging` / `promotion.requirePolicy` / gateway-TTL / per-session-sequence item either (a) kept with consistent language across all files per user directive for HostContext, or (b) reverted cleanly)
- [ ] Deck `openclaw-upstream-deck.pptx` regenerated with `policy-dark` theme; `openclaw-upstream-deck.pdf` absent (pdf deprecated)
- [ ] §1.4 ↔ §1.4a cross-ref consistent across spec + guardrails.md + policy.md + snap.md
- [ ] No outstanding Major findings on dry-run `/craft-review --type docs --files docs/claws/proposals/openclaw-upstream/`
- [ ] Ready for `/craft-push ra cp-8`

## Acceptance Criteria

- All cp-8.md Exit Criteria mirror (verbatim match)
- Deck pptx exists; pdf absent
- Zero outstanding Majors on panel dry-run

## Governing Roles

- `craft:architect` — final sign-off on 4-package shape coherence in docs
- `craft:conformance` — mechanical grep-gate verification

## Dependencies

P40 + P41 must be committed before this gate runs.

## Test Gates

All cp-8.md Exit Criteria. Gate is doc-only (no unit/integration tests).
