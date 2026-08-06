# PR-DRAFT 1 Review — claws-release-eng

**Reviewer role**: claws-release-eng (release predictability, CI/CD reliability, codemod migrations, PR pacing, bot-trio preempt)
**Target**: `pr-drafts/PR-1.md` (post-2026-04-28 fold absorbing former PR-2)
**Verdict**: **APPROVE-WITH-WARNINGS**
**Pre-push gate**: YES — would survive bot-trio with ≤1 round of changes after the WARN items below are addressed.

## Summary

The fold landed cleanly. The "earns its keep four ways" pitch is the correct frame for a workspace package that would otherwise read as speculative. Bot-trio preempt is structurally sound. Three concrete WARNs around metrics math, codemod concreteness, and evidence-script citation; plus two NOTEs.

## Findings

### HC-WARN 1 — "70 new tests" arithmetic is asserted, never broken down

Line 260 claims `42 lint plan tests + 20 prior PR-1 + 8 absorbed PR-2 = 70`. The math holds (42+20+8=70), and the 42 sub-decomposition (26 L0 + 12 L1 + 2 L2 + 2 L3) is given inline. **But** the 20 "prior PR-1 scope" tests are not enumerated in the PR-1 test plan section (lines 178–236). I count in the test plan:

- Lossless conversion: F-76..F-85, F-98..F-101 → 14
- Lint surface: 13 codes (one checkbox each) → 13
- URI vocabulary: F-86..F-97 → 12
- Cross-OS: F-52, F-53 → 2
- AST: F-54, F-55, F-56 → 3

That's ~44 enumerated checkboxes, with 13 of them collapsing the lint surface into one-line-per-code rather than the 26 L0 + 12 L1 + 2 L2 + 2 L3 = 42 underlying lint tests. A reviewer adding the visible checkboxes will hit ~44, not 70. Greptile will grep for the gap. **Fix**: add a one-line "Test count derivation" sub-bullet under Metrics that maps the enumerated F-IDs to the 70 headline (e.g., "13 lint checkboxes expand to 42 lint-plan tests as detailed in `claws-workspace-lint` plan §X").

### HC-WARN 2 — Codemod call-out (line 270) is too vague for a discriminated-union shift

Line 270 says: _"Codemod note in CHANGELOG."_ That's the entire migration story for downstream consumers reading `loc.file` directly. For a public-API discriminated union shift, release-eng wants:

- **Codemod artifact path** (e.g., `packages/openclaw-workspace/codemods/diagnostic-location-v2.ts` or jscodeshift transform)
- **Deprecation window length** (the "automatically wrapped" claim implies a window — name it: 2 minor versions? until next major?)
- **Detection script** so downstream consumers know when their code needs the codemod

The current PR-3/PR-5 packages (guardrails, policy) are listed as `peerDependency` consumers (line 79). Those are first-party — Greptile will ask "where's the migration test that proves the wrapped `{kind:'file'}` form is consumed correctly by _external_ `loc.file` readers?" Add a "Codemod" subsection under Migration / risk citing the artifact path and window.

### HC-WARN 3 — `regen-lint-evidence.ts` is not cited in the PR description

`scripts/regen-lint-evidence.ts` is listed as a cp-1 deliverable in `wave.yaml:314` and is referenced in `dispatch_plan` step 2 (`wave.yaml:359`) as the author's pre-push refresh tool. **PR-1 never mentions it.** The 27+ issue table (lines 9–15) cites issue numbers as of 2026-04-28; without naming the script that regenerates these counts, the citations rot silently as upstream issues close/open. Reviewers cannot independently re-run the count. **Fix**: add a footnote to the issue-citation table — e.g., _"Counts regenerated via `packages/openclaw-workspace/scripts/regen-lint-evidence.ts`; re-run before push."_

### HC-NOTE 1 — Public-API addition list is incomplete vs. `package.json` exports

PR-1 names `parseOcUri`, `formatOcUri`, `resolveConfigUri`, `DiagnosticLocation`, `ParsedOcUri`, `OcUriError`, `OC_CONFIG_PARSE_ERROR`. `package.json` (lines 8–49) exports **eight** subpaths: `.`, `./path`, `./ast`, `./ast/jsonc`, `./lint`, `./canonicalize`, `./staging`, `./path-canonical`. PR-1 line 87 explicitly notes `/staging` and `/path-canonical` "ride the package without earning their keep here," but the public-API symbols those subpaths export are not listed. Baseline-hash refresh (line 242 checkbox) covers them, but reviewers verifying the baseline diff will want the symbol list. Add a short "Public symbols added (full list)" stanza under `### What ships` or in Metrics.

### HC-NOTE 2 — Perf budget tightening between F-99 and Migration / risk

Line 194 (F-99) says JSONC path "**within 2× stringify on 1MB**; 50ms hard ceiling." Line 274 says "**stays within 10× on 100KB**." These are not contradictory (different fixture size, different metric envelope), but a reviewer scanning for perf claims will pick at the discrepancy. Either align the budgets or add a one-line "perf table" with both rows so the difference is visible. The dispatch plan step 0b (`wave.yaml:353-354`) requires perf bench results embedded in PR description before push — that's the mechanism; reference it.

## Bot pre-empt verdict (per `bot-preempt-checklist` §3.1, §3.2)

- **§3.1 core-not-extension defense**: Lines 19–21 (chokepoint argument) **and** lines 77–81 (governance section) are both strong, evidence-cited, with concrete anti-patterns named (#31251 plugin install corruption). The doubled-up defense is intentional and good — it survives a bot scanning either headline section.
- **§3.2 NEVER-SAFE phrase scan**: Mentally walked the list — `third-party plugin/extension/skill`, `extension to OpenClaw` (unbacked), `OpenClaw skill/extension`, `ClawHub/clawhub`, `r:third-party/skill/extension`, `make this an extension`, `ship as an extension/skill`. **Zero hits.** The line 241 self-attestation that `scripts/scan-pr-body.sh` exits 0 is consistent with the user-supplied confirmation. Carve-out matches (`extension` in "URI scheme extension," `SKILL` in `WorkspaceFileKind`, `extension` in "diagnostic shape extension") are §3.2-recognised architectural carve-outs.

## "Earns its keep four ways" overlap check

| Way                              | Independent? | Notes                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Lossless `replaceConfigFile`  | YES          | The headline; tied to `/ast/jsonc` only                                                                                                                                                                                                                                                       |
| 2. 13-code lint surface          | YES          | Tied to `/lint`; cites 27+ issues                                                                                                                                                                                                                                                             |
| 3. URI vocabulary in diagnostics | YES          | Tied to `/path`; consumed by both lint findings AND doctor (workspace + config)                                                                                                                                                                                                               |
| 4. Cross-OS canonicalize         | **WEAKEST**  | Tied to `/canonicalize`; "CI matrix proves it" — but the only consumer in PR-1 is the matrix itself, not a real call site. Greptile may flag this as "test infrastructure justifying production code." Mitigated by F-52/F-53 evidence and forward-reference to PR-6 snap content-addressing. |

The four ways do **not** materially overlap — each maps to a distinct subpath. Way 4 is the only one a reviewer might pick at; the existing "Cross-OS CI matrix proves it" framing is the right defense but could cite the forward consumer (PR-6 snap) explicitly to remove all doubt.

## PR pacing / cap

After fold, wave is 6 PRs (was 7); well under the 10-PR cap. Concurrency 2 respected (cp-2 ships single PR). Dispatch plan steps 0a + 0b (integration in fork branch + perf bench) are correctly gated **before** `gh pr create`.

## Required before push

1. Add codemod artifact path + deprecation window (HC-WARN 2)
2. Cite `regen-lint-evidence.ts` (HC-WARN 3)
3. Either reconcile or table the perf budgets (HC-NOTE 2)

WARN 1 (test math derivation) and NOTE 1 (full public-symbol list) are nice-to-have; bot-trio survival doesn't strictly require them, but Copilot is likely to ask for the symbol list on baseline-hash inspection.
