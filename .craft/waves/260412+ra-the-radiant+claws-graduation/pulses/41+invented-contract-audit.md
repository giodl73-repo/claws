---
pulse: 41
slug: invented-contract-audit
plan: claws-pre-extraction-packaging
depends_on: [40]
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

# Pulse 41: Invented-Contract Audit

## Objective

Audit the spec for invented contracts from earlier R2 apply round. Verify reverted items are absent; kept items (§1.4a HostContext + ProviderLifecycle) are consistent across spec + guardrails.md + policy.md Waffles example.

## Deliverables

- [ ] Spec §1.4b error semantics section: not present anywhere in `openclaw-upstream-spec.md`
- [ ] Spec §1.4 has no multi-plugin composition normative-rules block (deny-short-circuits, modify-composes-in-order, redirectPath bound-check)
- [ ] Spec §1.2 has no `redirectPath` cross-platform contract (6 normative rules: relative-only, no `..`, prefix bound, separator normalization, case-fold, no symlinks)
- [ ] Zero references to `@openclaw/policy/staging` or `StagingFileIngestProvider` across all proposal docs
- [ ] Spec §4 summary: does NOT mention `promotion.requirePolicy: false` escape; does NOT claim zero-runtime-dep framed as `@openclaw/workspace/canonicalize` coordinated-release
- [ ] Spec §4.6: does NOT claim library-first architecture (no `readWorkingTree`/`computeDraft`/`applyCheckout`/`clearStage` named library exports in spec)
- [ ] Spec §5: no default-posture callout paragraph; properties enumerated 1-8 (not 1-9); no `Deterministic emit — no wall-clock` property
- [ ] Spec §6: only `generate is lossless` round-trip test (no `generate is deterministic across processes` test, no `snap and policy canonicalize PolicyIR identically` test)
- [ ] §1.4a HostContext + ProviderLifecycle present in spec (kept per user directive: "if the host is valuable add it everywhere")
- [ ] `guardrails.md` has Provider-lifecycle section referencing `ProviderLifecycle` + `HostContext` with same shape as spec §1.4a
- [ ] `policy.md` Waffles example (lines ~130-205) uses `async init(ctx) { ctx = hostCtx; }` pattern; uses `ctx.auditSink.append(...)` and `ctx.approvalHandleSigner(...)`; no module-level `auditChain` singleton import; no hardcoded `SNAPSHOT` string beyond the example header
- [ ] Cross-document §1.4a reference audit: every citation in guardrails.md, policy.md, snap.md lands on existing section 1.4a in spec (gateway-eng M4 closure)

## Acceptance Criteria

- `grep -n '§1\.4b' docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md` — zero matches
- `grep -nE 'promotion\.requirePolicy|readWorkingTree|computeDraft|applyCheckout|clearStage' docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md` — zero matches
- `grep -nE 'StagingFileIngestProvider|@openclaw/policy/staging' docs/claws/proposals/openclaw-upstream/` — zero matches
- `grep -n 'ProviderLifecycle\|HostContext' docs/claws/proposals/openclaw-upstream/guardrails.md` — at least 3 matches (interface def + host obligations + Provider lifecycle section)
- `grep -nE 'const auditChain |import.*auditChain' docs/claws/proposals/openclaw-upstream/policy.md` — zero matches (Waffles example uses ctx.auditSink, not module-level singleton)

## Governing Roles

- `craft:architect` — owns kept-vs-reverted contract audit
- `craft:conformance` — verifies mechanical grep-based assertions

## Dependencies

Depends on P40 (cross-reference sweep) so the subpath naming is settled before the audit runs.

## Test Gates

Acceptance grep assertions are the gates.
