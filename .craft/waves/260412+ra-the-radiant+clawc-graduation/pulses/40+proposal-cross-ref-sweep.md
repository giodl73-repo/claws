---
pulse: 40
slug: proposal-cross-ref-sweep
plan: claws-pre-extraction-packaging
depends_on: []
governing_roles: [craft:architect, craft:conformance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    []
  typecheck:
    []
checkpoint: 8
---

# Pulse 40: Proposal Cross-Reference Sweep

## Objective

Doc-only sweep across `docs/claws/proposals/openclaw-upstream/` to close remaining cross-reference drift from the 4-package collapse. Uses the upstream `@openclaw/*` scope throughout (these are Peter-facing proposal docs; `@bic/openclaw-*` naming belongs in Ra source trees, not proposal).

## Deliverables

- [ ] Grep `docs/claws/proposals/openclaw-upstream/` for bare old package names (`audit-chain`, `approval-events`, `budget-meter`, `identity-bridge`, `siem-emitter`, `secret-scanner`, `workspace-path`, `workspace-ast`, `guardrail-spec`, `canonicalize`) used without subpath prefix — returns zero (all use `@openclaw/guardrails/<sub>` or `@openclaw/workspace/<sub>` form)
- [ ] Stale package-count references eliminated: zero occurrences of `"11 packages"`, `"12 packages"`, `"8 runtime libs"`, `"eight standalone"` in brief, spec, deck, or package .md files
- [ ] Spec §1.4 ↔ §1.4a cross-reference sweep: spec now has §1.4 (Composition) + §1.4a (Provider lifecycle); any document citing §1.4a must match. 4 documents (brief, guardrails.md, policy.md, snap.md) + gateway-eng M4 flagged mismatches — all reconciled
- [ ] Cross-references between spec walkthrough and package .md files resolve (no dangling §X.Y to removed sections)
- [ ] `guardrails.md`, `workspace.md`, `policy.md`, `snap.md` agree with spec walkthrough on package surface (every interface / subpath / export named in the spec is present in corresponding package .md)
- [ ] Deck slide references align with final 4-package shape (each Piece title cites correct package; Pieces 1/2/3/4 are separate sections)

## Acceptance Criteria

- `grep -rE '@openclaw/(audit-chain|approval-events|budget-meter|identity-bridge|siem-emitter|secret-scanner|workspace-path|workspace-ast|guardrail-spec|canonicalize)["\\s\\.]' docs/claws/proposals/openclaw-upstream/` — zero matches
- `grep -cE '(11|12) packages|8 runtime libs|eight standalone' docs/claws/proposals/openclaw-upstream/*.md` — zero matches (except in historical-explanatory notes explicitly marked as retrospective)
- `grep -n 'spec §1\.4a\|§1\.4a' docs/claws/proposals/openclaw-upstream/` all point at existing sections

## Governing Roles

- `craft:architect` — owns package-map + subpath-reference consistency
- `craft:conformance` — verifies mechanical grep-checks pass

## Dependencies

No prior pulse dependencies (doc-only work). Builds directly on the 2026-04-18 4-package collapse and invented-contract reversion commits.

## Test Gates

No unit/integration/e2e tests (doc-only). Acceptance criteria above are the gates.
