# R2 Consolidated: v2 Proposal Package

**Round**: 2
**Date**: 2026-04-29
**Files reviewed**: snap-pre-rfc.md, policy-pre-rfc.md, guardrails-adapter.md, realigned-story.md
**Roles**: claws:platform-eng, claws:gateway-eng, claws:ciso, claws:claws-repo-steward, claws:claws-release-eng

---

## Verdict matrix

| Role | R1 | R2 | Movement |
|---|---|---|---|
| platform-eng | APPROVE-WITH-WARNINGS | APPROVE-WITH-WARNINGS | flat (R1 blockers cleared; new minor) |
| gateway-eng | APPROVE-WITH-WARNINGS | APPROVE-WITH-WARNINGS | flat (concerns shifted contract → deployment) |
| ciso | REVISE | APPROVE-WITH-WARNINGS | **upgrade** |
| repo-steward | REQUEST-CHANGES | APPROVE-WITH-WARNINGS | **upgrade** |
| release-eng | REQUEST-CHANGES | APPROVE-WITH-WARNINGS | **upgrade** |

**Net**: 3 verdict upgrades, 0 downgrades. The proposal package is now structurally sound and operationally honest.

## R1 critical Major resolution

All 10 R1 critical Majors landed RESOLVED or PARTIALLY-RESOLVED (acceptable). Zero UNRESOLVED at R1-Major level.

| R1 Major | Status | Lead resolution |
|---|---|---|
| M-HAPI-COLLISION | RESOLVED | realigned-story §"Hapi wave coordination" + `.craft/plans/hapi-amendment-to-contract-first.md` |
| M-OCPATH-TYPE-MISUSE | RESOLVED | `WorkspaceId` + `SnapshotInternalPath` brand types; `POLICY_IR_PATH: SnapshotInternalPath` |
| M-CTX-SNAPSHOTID-TOCTOU | RESOLVED | policy-pre-rfc Ask §4 (upstream contract extension) |
| M-CANONICALIZATION-IMPLICIT | RESOLVED | RFC 8785 JCS in both contracts |
| M-SIGNING-CHAIN-FICTIONAL | RESOLVED | gateway-as-signer model documented; Store/Generator have no signing API |
| M-FAIL-CLOSED-UNSPECIFIED | RESOLVED | failure-semantics tables in both contracts + adapter |
| M-AUDIT-EMISSION-BYPASSABLE | RESOLVED | gateway-emitted audit (not decorator) |
| M-TRIM-ARITHMETIC-AMBIGUITY | RESOLVED | 6,200 LoC firm; arithmetic shown (7,889 - 1,689 = 6,200) |
| M-UPSTREAM-CADENCE-FANTASY | RESOLVED | "Calendar honesty" section; 6-10 weeks per PR |
| M-WIRE-PARITY-MISSING | RESOLVED | `SnapshotErrorCode` enum + Conformance section |

## New R2 findings — pre-RFC-time blockers (7 fixes, all small)

These should land before #clawtributors share. Each is a 1-2 sentence amendment, not structural surgery.

| ID | Severity | Doc | Fix needed |
|---|---|---|---|
| **R2-M11** (platform-eng) | Major (cosmetic/factual) | realigned-story | Trim arithmetic prose says "~700-1,500 LoC overlap" but computation uses 1,689. Reconcile (1-line edit). |
| **R2-F21** (ciso) | HIGH (proposal-time) | realigned-story §"Gateway-as-signer model" | Per-tenant signing key model is implied by Eduardo's filing model but never stated. Add one sentence: "Each gateway tenant has its own signing key managed via the tenant's KeyVault; cross-tenant snapshot signature verification fails by design." |
| **R2-G-N1** (gateway-eng) | Warning | realigned-story | KeyVault sign call is on the snapshot capture hot path. Add a paragraph on amortization (e.g., async signing with synchronous attestation, or batched signing). |
| **R2-G-N2** (gateway-eng) | Warning | realigned-story | Hash-chained gateway audit on every Store op + every decision is write-amplification. Add a paragraph on per-session chains + async emission. |
| **R2-NEW-1** (release-eng) | Major | realigned-story §calendar | Hapi-amendment plan adds 1-3 day pre-day-0 sequencing not reflected in chain math. Update calendar to show `pre-day-0 (1-3d)`. |
| **R2-NEW-2** (release-eng) | Major | realigned-story §"Why audit is not in v2 scope" | Audit-stays-downstream rationale is unfalsifiable as written. Add concrete v3 trigger gates (e.g., "v3 considered when ≥2 non-claws consumers ship audit-emitting gateways" or "when SIEM integration tests prove HMAC/Ed25519 contract"). |
| **R2-NEW-3** (release-eng) | Major | realigned-story §sequencing | Trim plan deferral creates doc race under deadline. State: "Trim plan drafted in parallel during upstream review window (chain-day-7 to chain-day-21)". |

**Estimate to apply all 7**: ~30-45 min, single-doc surgery on `realigned-story.md` (6 of 7) + brief touch on prose elsewhere.

## R2 findings — implementation-time / future-wave (NOT pre-RFC blockers)

13 findings deferred appropriately to:

- **Trim wave**: HC-WARN R2-1 (workspaces array + RB-repo-boundary + allowlist + sync-manifest), R2-2 (10-LoC headline drift), 6 release-eng warnings (cherry-pick obligation, per-PR test budgets, Option-B runbook, concurrent feature-freeze, doc destination, third-rename coordination)
- **claws implementation**: ciso F11 (audit durability), F12 (banned-tracing + key rotation), F17 (SIEM integration), F20 (freshness window), F22 (error message sanitization), F23 (JCS edge-case fixtures)
- **Multi-tenant test surface**: ciso F18 (R5-lowering enterprise warning), F19 (non-policy-read fail-closed scoping)
- **Documentation polish**: HC-NOTE R2-3 (hapi plan cross-link), R2-4 (`openclaw-adapter.ts` filename convention), R2-5 (incubator-slot semantics)

These are correctly forward-pointed and don't block channel share.

## Consensus findings (flagged by ≥2 roles)

- **Per-tenant signing keys** — ciso F21 (proposal-time) + gateway-eng G-N1 (deployment) + repo-steward note. Eduardo's filing model assumes per-tenant; the proposal needs to make this explicit so Peter doesn't assume single-key.
- **Audit emission write amplification** — gateway-eng G-N2 + ciso F11 (durability). The gateway-emitted audit decision is right, but the implementation has cost questions worth pre-empting.

## Recommended path forward

**Phase A** (~30-45 min): Apply 7 pre-RFC-time fixes via single doc-surgery agent on `realigned-story.md` + minor prose elsewhere.

**Phase B** (no review needed): The 7 fixes are small + mechanical; an R3 review would be over-instrumentation. After Phase A, the docs are ready to share.

**Phase C** (separate work, gated on user): Address hapi-amendment plan (already drafted) + trim plan (not yet drafted).

## What R2 explicitly approves

- Architecture: contract-first model with `SnapshotStore` + `PolicyGenerator` + adapter is the correct shape for OpenClaw upstream
- Type system: `OcPath` / `WorkspaceId` / `SnapshotInternalPath` split is internally consistent and respects upstream model
- Signing model: gateway-as-signer is coherent (with per-tenant key clarification needed)
- Audit model: gateway-emitted is unbypassable at the proposal layer
- Trim arithmetic: 6,200 LoC firm, derivation visible, audit-stays-downstream rationale defensible
- Calendar: 6-10 weeks per PR, ~6 month wave duration is realistic
- Cross-doc consistency: load-bearing types, paths, and figures align across all 4 docs

## What R2 explicitly does NOT approve

- Phase A 7 fixes are non-negotiable before #clawtributors share
- Hapi amendment execution requires R2 sign-off (this) + user input on the 4 plan questions before the working tree gets touched
- Trim plan must exist before any v2 PR-1 lands upstream (release-eng B6 carry-forward as warning)

---

**Summary**: The architecture is sound, the operational machinery is now drafted at the right scope, and the remaining gaps are bounded next-step deliverables on a known calendar — not proposal defects. Apply the 7 small fixes, then the package is ready to share.
