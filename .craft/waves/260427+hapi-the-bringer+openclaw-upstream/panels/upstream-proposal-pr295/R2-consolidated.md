# R2 panel review — consolidated

**PR**: https://microsoft.ghe.com/bic/lobster/pull/295
**Date**: 2026-04-30
**Trigger**: post-Option C verification round to confirm R1 findings were actually closed (not just papered over)

## Verdicts at a glance

| # | Persona | R1 | R2 | Delta |
|---|---|---|---|---|
| 05 | the hobbyist | APPROVE-WITH-WARNINGS | **APPROVE** | upgraded |
| 07 | the enterprise IT admin | APPROVE-WITH-WARNINGS | APPROVE-WITH-WARNINGS | held but improved |
| 08 | the compliance officer | APPROVE-WITH-WARNINGS | APPROVE-WITH-WARNINGS | held but improved |
| 10 | the skill connector author | APPROVE-WITH-WARNINGS | **APPROVE** | upgraded |
| 13 | the upstream maintainer | **REQUEST-CHANGES** | **APPROVE-WITH-WARNINGS** | upgraded — the big one |

**Net**: panel passes. The single REQUEST-CHANGES from R1 (the maintainer's HC-BLOCKs B2 + B3) is gone. Two personas moved to clean APPROVE. No new launch-blockers introduced.

## R1 concerns — status by persona

### CLOSED (Option C addressed substantively)

| R1 finding | Persona | R2 status | What closed it |
|---|---|---|---|
| Multi-tenant LKG isolation | 07 IT, 08 compliance | CLOSED | Per-tenant `LKGStore` instances; `LKG_TRACKER_PATH_INVALID` rejection at registration; per-store state files + audit streams; per-tenant policy plugin instances |
| Audit forensics on recovery | 07 IT, 08 compliance | CLOSED | `LKGObservation`-recovered carries `replacedFingerprint`, `clobberedFileHash`, `actor`, `correlationEventId`; `LKGObserveOptions` thread-through |
| Hook-merger migration cost | 05 hobbyist, 07 IT, 10 skill-author | CLOSED | PR-4 isolation + `gateway.approvalsMerger` deprecation flag + `normalizeApprovals` SDK helper + codemod + crash-safety wrapper |
| `LKGTracker<TParsed, TIssue>` generic split | 10 skill-author | CLOSED | Two-parameter shape lets trackers carry their own issue vocabulary |
| `LKGFingerprint` POSIX-leak split | 10 skill-author | CLOSED | Universal core + optional `fsStat?: LKGFsStat` appendix |
| **B2: PR-2 refactor-only auto-reject** | 13 maintainer | **CLOSED** | Config-LKG migration in-PR + byte-for-byte conformance test |
| **B3: PR-3 bundles 3 deltas** | 13 maintainer | **CLOSED** | Substantive split: PR-3 additive only (no merger references); PR-4 isolated breaking change |
| Contract-level signing slot | 08 compliance | PARTIAL | `attestation?` slot landed; enforcement mode is the residual (see open) |

### OPEN / new R2 concerns (none are launch-blockers)

| Finding | Persona | Severity |
|---|---|---|
| **B4: `ctx.lkgFingerprint` field-shape vs accessor-shape unjustified** | 13 maintainer | Should-fix before `#clawtributors` — small paragraph in PR-3 explaining the choice |
| Attestation enforcement mode (`LKGStoreOptions.requireAttestation`) | 08 compliance C1 | Soft ask, follow-up — slot exists; mandatory-mode is the residual |
| "Two-axis integrity" rename + MUST-check-both normative wording | 08 compliance C2 | Doc gap — high-leverage, should land before `#clawtributors` |
| Sentinel-registry rotation | 07 IT W2 | Known follow-up, untouched in Option C — not gating |
| Supervisor-layer TOCTOU | 07 IT W5 | Still open, separate work item |
| Genesis-hash + kill-switch parity | 07 IT N3/N5 | Untouched, follow-up |
| Startup audit event for `approvalsMerger` mode | 07 IT new | Small ask — fits in PR-4 body |
| Expose `mergeApprovals` publicly OR document engine-internal | 10 skill-author new | Small ask — one line in PR-4 contract |
| `attestation?` semantics doc for custom-backend authors | 10 skill-author new | Small ask — one paragraph in PR-2 |
| Plugin-author code examples in pre-RFCs | 10 skill-author W4 | Known follow-up; channel-readiness gate per persona 10 |
| 10-PR cap math (6 Hapi + 4 LKG = exactly 10) | 13 maintainer new | Dispatch plan needed before opening upstream |
| Per-PR AI-assisted disclosure | 13 maintainer | To land at filing time, per upstream PR rules |
| Microsoft-isms sweep | 13 maintainer | Known follow-up; flagged in PR body's "known follow-ups" |

## Cross-cutting observations

1. **The Option C restructure was the right call.** B2 + B3 (the two substantive HC-BLOCKs from the maintainer) are both closed, not papered over: PR-2's config-LKG migration is real (existing shipped behavior moves onto the new contract with a byte-for-byte conformance test); PR-3 / PR-4 split is substantive (PR-3 body has zero `mergeApprovals` references; PR-4 body has zero PolicyIR references).

2. **Contract-layer wins are durable across personas.** Multi-tenant isolation, audit forensics, type-shape fixes, ergonomics helpers — these landed at the contract layer, so all five personas benefit from each fix without needing per-persona bespoke handling.

3. **Residual asks are mostly documentation, not contract changes.** Attestation enforcement mode is the only structural ask left; everything else is "add a paragraph" or "ship a code example." The 4 PRs as currently scoped do not need re-shaping.

4. **One file-state quirk to flag**: agents 10 and 13 noted that the local lobster-docs working tree did not have the Option C files on disk because the working copy is on `docs/openclaw-acp-and-clis`, not `proposals/upstream-workspace-modernization`. The Option C changes ARE on the PR-295 branch (commit `27dd452`); both agents successfully sourced their reviews from the PR body at `C:\Users\giodl\AppData\Local\Temp\pr295-body-v2.md`, which quotes the relevant type signatures, helper names, and section headers verbatim. This is a working-copy artifact, not a gap in the PR.

## Recommendation for the channel

**Ready for `#clawtributors` thread once these three small items land** (none require restructure):

1. One-paragraph justification in `upstream-pr3-policyir.md` for `ctx.lkgFingerprint` as a field vs `getCurrentLKGFingerprint()` accessor (closes maintainer B4).
2. Plugin-author code examples in each upstream pre-RFC (one minimum-viable tracker snippet in PR-2; one `ctx.lkgFingerprint` consumer snippet in PR-3; one approval-normalization snippet in PR-4) (closes skill-author W4 + addresses skill-author new C1/C2).
3. "Two-axis integrity" wording + MUST-check-both normative paragraph in `upstream-pr3-policyir.md` (closes compliance C2).

Microsoft-isms sweep, AI-assisted disclosure footers, and the 10-PR-cap dispatch plan can land in the same docs sweep.

**Merge order at upstream**: PR-1 → PR-2 → PR-3, with PR-4 ridable in parallel with any of the others (no contract dependency on LKG or PolicyIR).

---

🤖 R2 panel synthesized 2026-04-30 from 5 parallel persona reviews; per-persona files at `R2-{05,07,08,10,13}-*.md`.
