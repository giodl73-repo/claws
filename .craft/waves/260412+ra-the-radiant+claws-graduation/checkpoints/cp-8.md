---
checkpoint: 8
name: "Spec Polish — final proposal cleanup before scenarios"
pulse_range: [40, 41, 42]
depends_on_cp: 7
review_panel: [craft:architect, craft:conformance]
tag: ra-cp-8
---

# CP-8: Spec Polish

## Summary

The R1+R2 panel reviews surfaced a lot of findings; most have been resolved by
the 4-package collapse (11 packages → `guardrails` + `workspace` + `policy` +
`snap`). What remains is targeted polish: internal cross-references that still
read against the old shape, a handful of prose cleanups, and the deck
verification pass.

Two pulses + gate. Small CP on purpose — the collapse did most of the work.

## Context / Rationale

After the 4-package consolidation:

- 11 standalone package `.md` files deleted; `guardrails.md` + `workspace.md`
  written as the consolidated sources.
- Brief, spec §0/§1/§2, deck all updated.
- Horus plans (pre-extraction + bic-operations) inventory aligned to 4
  packages.
- Most R2 "mechanical cleanup" items are moot because the files they flagged
  no longer exist.

Remaining polish items tracked in R2-consolidated.md that still apply in the
4-package shape: subpath references in prose, stale ASCII diagrams, any
remaining invented-contract residue (ProviderLifecycle, `/staging` subpath,
bounded reason string, etc. — these were flagged by the panel as potentially
over-engineered and should be kept only if they're genuinely load-bearing for
Peter's read).

## Dispatch Plan

### Batch 1 (parallel)

| Agent | Pulse | Slug                     | Depends on | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ----- | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| alpha | 40    | proposal-cross-ref-sweep | —          | Final grep + fix pass across all proposal files (`brief`, `spec`, `deck`, `guardrails`, `workspace`, `policy`, `snap`, `policy-commands`, `snap-commands`, `cli-carveout`, `diagnostic-id-registry`). Targets: (a) any remaining `audit-chain` / `approval-events` / `budget-meter` / `identity-bridge` / `siem-emitter` / `secret-scanner` / `workspace-path` / `workspace-ast` / `guardrail-spec` / `canonicalize` bare references that should be `guardrails/<sub>` or `workspace/<sub>`; (b) stale counts ("11 packages", "8 runtime libs"); (c) any other internal cross-reference drift. Low-risk mechanical work.                                                                                                                                                       |
| bravo | 41    | invented-contract-audit  | —          | Audit the spec for invented contracts that ballooned the surface area unnecessarily: §1.4a `ProviderLifecycle` + `HostContext`, §1.4b `provider_error:` reason-string rule, §1.4 multi-plugin composition normative rules, `@openclaw/policy/staging` subpath references, `promotion.requirePolicy: false` config knob, gateway-owned TTL `resumptionToken` protocol, per-session `sequenceNumber` scoping. For each: (a) is it actually needed for Peter's first-read, or is it "Peter will shape this" territory? (b) if keep, ensure it's consistently described across spec + package docs; (c) if cut, revert to the original simpler shape and move the concern to a §10 "Open items" row. User-approved list of which stay / which revert lands before pulse execution. |

### Batch 2 — Gate

| Agent   | Pulse | Slug             | Depends on | Notes                                                                                                                                                                                                                                                                      |
| ------- | ----- | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| charlie | 42    | cp-8-polish-gate | 40, 41     | CP-8 gate (`checkpoint_gate: true`). Cross-file consistency verified: package map / count / subpath names match across brief / spec / deck / Horus plans. Deck regenerated. Invented-contract audit closed (kept items consistent everywhere, cut items reverted cleanly). |

## Review Panel

- `craft:architect` — consistency of the 4-package shape across the spec-set
- `craft:conformance` — no stale cross-references remain

## Coverage Bar

N/A (doc-only).

## Exit Criteria

- [ ] Grep for old bare package names (`audit-chain`, `approval-events`, etc. without `/<sub>` prefix) returns zero in proposal prose
- [ ] Grep for "11 packages" / "12 packages" / "8 runtime libs" returns zero (or only in historical-explanatory notes)
- [ ] Invented-contract audit closed — each §1.4a / §1.4b / §1.4 / `/staging` / `promotion.requirePolicy` / gateway-TTL / per-session-sequence item is either (a) kept with consistent language across all files, or (b) reverted cleanly
- [ ] Deck regenerated (pdf + pptx) after any edits
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-8`
