# Pulse Review · Hapi the Bringer · R1 Consolidated

**Date**: 2026-04-27
**Reviewers**: architect, type-system, dragon, testing
**Status**: All 4 reviewers complete.

## Verdict roll-up

| Reviewer    | Verdict                                    | HC-BLOCK | HC-WARN | HC-NOTE |
| ----------- | ------------------------------------------ | -------- | ------- | ------- |
| architect   | APPROVE-WITH-WARNINGS                      | 1        | 2       | 3       |
| type-system | APPROVE-WITH-WARNINGS                      | 0        | 3       | 4       |
| dragon      | APPROVE-WITH-WARNINGS                      | 0        | 5       | 3       |
| testing     | CONDITIONAL PASS (= APPROVE-WITH-WARNINGS) | 0        | 2       | 1       |
| **Total**   | **APPROVE-WITH-WARNINGS**                  | **1**    | **12**  | **11**  |

No reviewer recommends REJECT. The wave structure is sound; the findings are all addressable in pulse-content edits without re-architecting checkpoints or DAG.

## Headline HC-BLOCK (applied)

**A1 (architect)**: Pulse 06 had stale "PR-2" wording from the 2026-04-27 restructure. Should be "PR-3." Multiple occurrences. **APPLIED**: replaced all "PR-2" → "PR-3" in `pulses/06+pr3-oc4-stripfrontmatter.md`. ✅

## Consolidated HC-WARN (12)

| #   | Title                                                                                                            | Source      | Apply where                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| W1  | Pulse 08 frontmatter under-specifies cp-3 closure (`depends_on` missing 06)                                      | architect   | Pulse 08 frontmatter edit                                                     |
| W2  | Pulse 11 (scope-flip) `depends_on` incomplete — needs all 7 upstream PRs                                         | architect   | Pulse 11 frontmatter edit                                                     |
| W3  | Diagnostic location should be discriminated union                                                                | type-system | PR-1 description + pulse 04 deliverables                                      |
| W4  | `parseOcUri()` return type lacks explicit `kind` discriminator                                                   | type-system | PR-2 description + pulse 05 verification gate                                 |
| W5  | `sourcePluginId` mandatory is runtime-flagged not type-safe; document lenient as runtime-only + provide accessor | type-system | PR-4 description + pulse 07 docs                                              |
| W6  | F-76 (HC-BLOCK headline invariant) silent in pulse 04's `addresses_findings:` frontmatter                        | dragon      | Pulse 04 frontmatter edit                                                     |
| W7  | OC-7 crash-safety spec choice (F-23) missing from PR-5 description                                               | dragon      | PR-5 description in pulse 08                                                  |
| W8  | Adapter-audits.md quality validation gate missing in pulse 01                                                    | dragon      | Pulse 01 verification gate (grep for F-39, F-40, F-41, F-42, F-35 in content) |
| W9  | Scope-flip contingency path silent — wave can deadlock if any upstream PR rejected                               | dragon      | Pulse 11 contingency note                                                     |
| W10 | "Three-ways" pitch unvalidated in pulse 04 TDD — should subsection per /path /ast /canonicalize                  | dragon      | Pulse 04 TDD section restructure                                              |
| W11 | L3 acceptance underdeveloped — only ~4 vs target 8 (per-PR acceptance gates missing)                             | testing     | Add per-PR L3 to pulses 04, 05, 06, 07, 08, 09, 10 OR consolidate in pulse 12 |
| W12 | Pulse 12 verification gate missing fixture census assertion (≥41 fixtures)                                       | testing     | Pulse 12 verification gate edit                                               |

## Consolidated HC-NOTE (11)

| #   | Title                                                                                           | Source      | Apply where                                   |
| --- | ----------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
| N1  | Cross-pulse symbol coherence holds (positive verification finding)                              | architect   | (no action)                                   |
| N2  | Restructure consistency verified for 11/12 pulses (6 was the outlier)                           | architect   | (no action — A1 fix applied)                  |
| N3  | Spec amendment §10a covers PR-2 properly                                                        | architect   | (no action)                                   |
| N4  | PR-1 JSONC AST interface needs explicit type signature                                          | type-system | Pulse 04 deliverables                         |
| N5  | PR-2 public-API surface list missing from baseline-hash refresh deliverable                     | type-system | Pulse 05                                      |
| N6  | PR-5 "compile clean" semantics need clarification                                               | type-system | Pulse 08 verification gate                    |
| N7  | All PRs should explicitly list affected exports in baseline-hash refresh                        | type-system | Pulses 04, 05, 07, 08, 09, 10                 |
| N8  | Backward-compat audit-entry migration cost — verifier should print N strict / M lenient summary | dragon      | Pulse 07                                      |
| N9  | i18n / CLI help text translations not addressed (out of wave scope but flag)                    | dragon      | Future-wave note                              |
| N10 | Pre-v2026.1 config formats on disk — confirm tests exercise old snapshots                       | dragon      | Pulse 04 TDD addition                         |
| N11 | Verification gate asymmetry between docs pulses (grep) and PR pulses (full build)               | testing     | (informational; expected for content vs code) |

## Apply-back routing

| Apply target                                           | Findings                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pulse 04 (PR-1) frontmatter + TDD**                  | W6 (add F-76 to addresses_findings), W10 (subsection TDD by three-ways), N4 (AST interface signature), N7 (list affected exports), N10 (pre-v2026.1 config tests) |
| **Pulse 04 (PR-1) deliverables**                       | W3 (DiagnosticLocation discriminated union)                                                                                                                       |
| **Pulse 05 (PR-2) verification gate**                  | W4 (ParsedOcUri kind discriminator), N5 (export list), N7                                                                                                         |
| **Pulse 06 (PR-3) content**                            | A1 ✅ APPLIED — PR-2 → PR-3                                                                                                                                       |
| **Pulse 07 (PR-4) docs**                               | W5 (lenient mode runtime-only doc + accessor), N8 (verifier summary)                                                                                              |
| **Pulse 08 (PR-5) frontmatter**                        | W1 (add 06 to depends_on)                                                                                                                                         |
| **Pulse 08 (PR-5) PR description + verification gate** | W7 (F-23 spec choice), N6 (compile-clean clarification), N7                                                                                                       |
| **Pulse 01 (adapter-audits) verification gate**        | W8 (grep for substantive content keywords)                                                                                                                        |
| **Pulse 11 (scope-flip) frontmatter + contingency**    | W2 (full depends_on), W9 (contingency note)                                                                                                                       |
| **Pulse 12 (acceptance fixtures) verification gate**   | W12 (fixture census)                                                                                                                                              |
| **L3 acceptance distribution**                         | W11 (add per-PR L3 in pulses 04..10)                                                                                                                              |

## Round-2 plan

1. Apply A1 — DONE ✅
2. Apply quick frontmatter edits: W1, W2, W6 (3 pulses)
3. Apply quick verification-gate edits: W8 (pulse 01), W12 (pulse 12)
4. Apply pulse-content edits for W7, W9, W10 (PR description language)
5. Defer type-safety expansions (W3, W4, W5, N4, N5, N6) to PR-DRAFT skeleton phase — they belong in PR description language, not pulse content
6. Defer L3 distribution (W11) to per-PR description writing — each PR description includes its acceptance criteria as L3 specs
