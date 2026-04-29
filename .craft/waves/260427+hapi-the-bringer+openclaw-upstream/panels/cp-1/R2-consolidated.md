# cp-1 Review · R2 Consolidated

**Date**: 2026-04-28
**Reviewers**: claws:claws-release-eng, claws:claws-repo-steward, testing
**Status**: 3 of 6 R1 reviewers re-spawned (the 3 with HC-BLOCKers); 3 not re-spawned (no R1 BLOCKers).

## Verdict roll-up

| Reviewer | R1 | R2 | R1 BLOCKers verified |
|---|---|---|---|
| claws-repo-steward | REQUEST-CHANGES (3 BLOCK) | **APPROVE** | B1, B2, B3 — all CLOSED with line citations |
| claws-release-eng | APPROVE-WITH-WARNINGS (2 BLOCK) | APPROVE-WITH-WARNINGS | B4 CLOSED-VIA-DOWNGRADE, B5 CLOSED |
| testing | APPROVE-WITH-WARNINGS (2 BLOCK) | **APPROVE** | B6, B7 — both CLOSED |

**Cross-reviewer consensus**: 0 HC-BLOCK remaining. The 4 release-eng R2 HC-NOTEs (downgrade-residual stale citations) were addressed in housekeeping immediately after R2 returned.

## R1 → R2 BLOCKer disposition

| # | R1 source | Title | R2 verification |
|---|---|---|---|
| B1 | repo-steward | PR-numbering inconsistency across 5 files | CLOSED (UG-upstream §8 lines 263-268; §9 line 278; PROGRESS.md cp-2..cp-5; all 3 guide frontmatters; inline body refs grepped clean) |
| B2 | repo-steward | FINDINGS.md tally off by 50 | CLOSED (independent grep returns 117 (6/39/72); methodology note explains the 6 cross-ref rows) |
| B3 | repo-steward | UG-upstream v0.3 frontmatter half-extends | CLOSED (title bumped, Reader's guide rewritten, 7 material changes enumerated) |
| B4 | release-eng | regen-script stub vs CI-gate claim | CLOSED-VIA-DOWNGRADE (per user direction "i dont think we need this"; advisory script with real impl, not CI-gated) |
| B5 | release-eng | PR-1 false zero-hits attestation | CLOSED (§3.2 carve-out semantics; `scan-pr-body.sh` exists + executable; PR-1 re-attestation cites carve-out reasons; script exits 0 on PR-1) |
| B6 | testing (also architect W2) | type-mismatch null-anything untested | CLOSED (TSDoc carve-out + null-as-absence in missing-required + 2 tests; negative test on optional path pins the carve-out) |
| B7 | testing | did-you-mean distance-3 cap untested | CLOSED (boundary tests at dist-3 accept + dist-4 reject; refactor flipping `<=` to `<` now breaks a test) |

## R2-introduced housekeeping (release-eng identified 4, all addressed)

| # | Source | Description | Disposition |
|---|---|---|---|
| N1 | release-eng R2 | PROGRESS.md:147-148 still calls regen-script "stub" with "TODO" | FIXED — reworded to "advisory script (not CI-gated)" |
| N2 | release-eng R2 | pulse 04 L3 test asserted "produces identical EVIDENCE.md" — script no longer writes that file | FIXED — L3 count reduced from 3 to 2; carve-out paragraph explains the removal |
| N3 | release-eng R2 | pulse 04 Key Constraints "must be regenerated pre-push" (was hard precondition) | FIXED — "may be refreshed pre-push" + advisory framing |
| N4 | release-eng R2 | UG-upstream §12.3 implied script does the regen | FIXED — reworded to "advisory script prints counts; humans maintain EVIDENCE.md and citations by hand" |

Final post-housekeeping validation: `tsc --noEmit` clean; **47/47 lint tests passing**.

## R1 reviewers not re-spawned in R2 (and why)

| Reviewer | R1 verdict | Why not in R2 |
|---|---|---|
| claws-gateway-eng | APPROVE-WITH-WARNINGS (0 BLOCK) | No BLOCKers to verify; HC-WARN perf concerns deferred to PR-1 prep (L1 perf bench), not cp-1 |
| claws-compliance | APPROVE-WITH-WARNINGS (0 BLOCK) | No BLOCKers to verify; HC-WARN compliance concerns (snap export `--verify` default-on, mutationDetectionLagMs, etc.) deferred to before PR-4 push |
| architect | APPROVE-WITH-WARNINGS (0 BLOCK) | No BLOCKers to verify; W2 (type-mismatch null) was covered by B6 fix; W1/W3/W4 deferred to cp-2 entry |

If any of these reviewers' HC-WARNs become entry conditions later, re-spawn at that gate. For cp-1 close, R2 is sufficient.

## R2 verdict

**APPROVE — cp-1 ready to close, cp-2 ready to open.**

All 7 R1 BLOCKers verified CLOSED across 3 R2 reviewers. The 4 housekeeping notes from release-eng R2 (downgrade-residuals) were addressed in <5 minutes immediately after R2 returned. No new substantive findings.

Strengths preserved from R1 are intact:
- 12-issue cross-doc consistency (EVIDENCE.md ⇆ FINDINGS rows ⇆ scenarios SC-39..SC-50 ⇆ fixture files ⇆ PR-DRAFT 1)
- Schema-DI seam genuinely schema-agnostic
- Per-rule positive+negative discipline (now 47 tests, was 43; the +4 are exactly B6/B7 fixes)
- `hook-types.ts:936-942` citation accuracy
- Adapter-audits §3 SIEM mapping (closes F-38)

The wave can open cp-2 (PR-1 + PR-2 at upstream) once the user confirms.
