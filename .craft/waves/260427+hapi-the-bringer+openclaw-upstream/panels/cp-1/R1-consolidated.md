# cp-1 Review · R1 Consolidated

**Date**: 2026-04-28
**Reviewers**: claws:gateway-eng, claws:compliance, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
**Status**: All 6 reviews complete.

## Verdict roll-up

| Reviewer | Verdict | HC-BLOCK | HC-WARN | HC-NOTE |
|---|---|---|---|---|
| claws-gateway-eng | APPROVE-WITH-WARNINGS | 0 | 4 | 4 |
| claws-compliance | APPROVE-WITH-WARNINGS | 0 | 5 | 5 |
| claws-release-eng | APPROVE-WITH-WARNINGS | 2 | 4 | 4 |
| claws-repo-steward | **REQUEST-CHANGES** | 3 | 7 | 5 |
| architect | APPROVE-WITH-WARNINGS | 0 | 4 | 5 |
| testing | APPROVE-WITH-WARNINGS | 2 | 6 | 7 |
| **Total (6/6)** | **REQUEST-CHANGES (gated by repo-steward)** | **7** | **30** | **30** |

5 of 6 reviewers approve with warnings; **repo-steward gates the wave on three mechanical fixes** (PR-numbering, FINDINGS tally, v0.3 frontmatter). Without those, cp-2 opens with stale citations threading into upstream PR descriptions.

## Consolidated HC-BLOCK (7 total, 6 unique after dedup)

| # | Title | Source | Domain | Apply where | Effort |
|---|---|---|---|---|---|
| B1 | **PR-numbering inconsistency across docs** — pr-drafts say PR-2=oc://, PR-6=OC-4, PR-7=snap; UG-upstream §8/§9, PROGRESS.md cp-2/cp-4, bot-preempt-checklist `applies_to`, post-merge `applies_to` use different mappings (some inverted) | repo-steward B1 | repo discipline | UG-upstream.amend.md §8/§9, PROGRESS.md, bot-preempt-checklist.md frontmatter, post-merge-verification.md frontmatter | ~30 min audit + edits across 5 files |
| B2 | **FINDINGS.md tally wrong by 50** — headline 67 (6/28/33), actual rows 117 (6/39/72); PROGRESS.md echoes the wrong number | repo-steward B2 | repo discipline | scenarios/FINDINGS.md headline, PROGRESS.md | ~15 min recount |
| B3 | **UG-upstream.amend.md v0.3 frontmatter half-extends v0.2** — version: 0.3 but title still "v0.2 (DRAFT)", Reader's guide doesn't mention §12/§13 | repo-steward B3 | repo discipline | UG-upstream.amend.md title + Reader's guide subsection | ~15 min |
| B4 | **regen-lint-evidence.ts is a stub but cited as CI gate** — Plan H5 + workspace-lint plan promise pre-PR-push refresh; today exits 0 silently | release-eng B1 | release engineering | Either implement file-write+diff path, OR downgrade plan contract from "CI gate" to "advisory script" | 2 hr implement, 5 min downgrade |
| B5 | **PR-1 falsely self-attests "regex-scanned: zero hits"** — actually has 11 hits ("extension", "SKILL"); §3.2 carve-outs not wired into §3 checkbox semantics | release-eng B2 | release engineering | bot-preempt-checklist.md §3 line 2 + new `scan-pr-body.sh`; PR-DRAFT 1 re-attests in qualified form | ~30 min |
| B6 | **`null` matches anything in type-mismatch is untested AND likely wrong for required string paths** — `{ "homeserver": null }` produces ZERO findings (no TYPE_MISMATCH, no MISSING_REQUIRED) | testing B1 (also architect W2) | tests + semantics | `src/lint/rules/type-mismatch.ts` semantics decision + new test in `tests/lint/rules-coverage.test.ts` | ~30 min |
| B7 | **did-you-mean distance-3 cap has no boundary test** — only distance-1 tested today; cap is the entire UX gate; refactor could break invisibly | testing B2 | tests | Add 2 tests in `rules-coverage.test.ts`: distance-3 accepted, distance-4 rejected | ~15 min |

## Cross-reviewer consensus signals

These findings were independently flagged by multiple reviewers — high-confidence priority targets:

- **Type-mismatch null carve-out** — testing B1 (HC-BLOCK) + architect W2 (HC-WARN). Both agents traced the same hole independently; this is real.
- **Subpath/PR-table mismatch** — release-eng W1 + repo-steward W4. The `package.json` exports `./lint`, `./ast/jsonc` but neither PR-DRAFT 1's "earns its keep" table nor `src/index.ts` JSDoc accurately enumerate all subpaths.
- **Citation rot risk** — repo-steward W1 (hook count 36 vs actual 35) + release-eng W4 (adapter-audits §5 triggers not CI-detectable). Both speak to the same theme: claims that don't have automated drift detection.
- **Realism vs minimal fixtures** — testing W1 + compliance C-W3. Toy fixtures may pass while real-world configs surface cross-rule interactions.

## Consolidated HC-WARN highlights (30 total)

| Category | Count | Notable items |
|---|---|---|
| Performance / runtime | 4 | gateway-eng W1-W4: pushDiag O(N²), unbounded recursion depth, 13× walker passes with path clone, post-merge §3 has no perf microbench |
| Compliance / SIEM | 5 | compliance C-W1-C-W5: `--verify` should default-on; mutation-lag `mutationDetectionLagMs` field; OC-5 metadata-key contract; postAudit override should be HC-WARN; mutation forensics omits prior-turn `actor.principalId` |
| Architecture / seams | 4 | architect W1-W4: `pluginIdSources(doc)` seam leak; type-mismatch null carve-out; ocUri message-weave irreversible; §13 fixer contract under-specified for cross-fixer interactions |
| Tests / fixtures | 6 | testing W1-W6: minimal-toy fixtures; test-schema drift risk; weak ocUri invariant; H1 validator delegates to upstream CI; no concurrent-read; no rule-ordering/dedup |
| Repo discipline | 7 | repo-steward W1-W7: hook count, ATOMS prose, ATOMS frontmatter version pin, index.ts JSDoc, §13 reciprocal cite, §10a numbering, lint/ Error-export parity |
| Release engineering | 4 | release-eng W1-W4: subpath skew, codemod gate path implies pre-existence, cp-5 PR ordering, adapter-audits §5 not CI-detectable |

## Apply-back routing

| Apply target | Findings |
|---|---|
| **PR-numbering audit + cross-doc patch** | B1 (5 files) |
| **FINDINGS.md recount** | B2 |
| **UG-upstream.amend.md v0.3 frontmatter + Reader's guide** | B3 + W5/W6 (repo-steward) |
| **bot-preempt-checklist.md §3 + scan-pr-body.sh** | B5 |
| **regen-lint-evidence.ts implementation OR plan downgrade** | B4 |
| **type-mismatch.ts semantics + tests** | B6 (also architect W2) |
| **unknown-field.ts boundary tests** | B7 |
| **PR-DRAFT 1 subpath table extension + index.ts JSDoc** | release-eng W1 + repo-steward W4 |
| **adapter-audits §3 mapping refinements (compliance C-W2/C-W3/C-W4)** | compliance HC-WARNs (post-cp-1, before PR-3 push) |
| **Performance instrumentation** | gateway-eng HC-WARNs (post-cp-1, capture as L1 perf bench in PR-1 prep) |
| **Architectural refinements** | architect W1/W3/W4 (deferred to cp-2 entry; W2 covered by B6) |
| **Test additions for unicode/empty/large/concurrent/dedup** | testing HC-NOTEs N1-N7 (post-cp-1; treat as polish) |

## Strengths consolidated

Things every reviewer wants preserved as-is:

- **Adapter-audits §3 audit-stream wire-shape** (release-eng + compliance) — 13-row SIEM mapping closes F-38 substantively; lossy-format honesty; `--verify` flag.
- **PR-1 issue-citation table** (release-eng + repo-steward + compliance) — 27+ real issue numbers with mechanism per row; the strongest defense against `r:third-party-extension` auto-close.
- **Schema dependency-injection** (architect + testing) — engine genuinely degrades gracefully without schema; verified by smoke test.
- **Per-rule positive+negative discipline** (testing) — every one of 13 rules has both a fires-test and a silent-test; negative-fixtures (#14998, #62438) encode false-positive-rate as contract.
- **Citation accuracy on the load-bearing line** (repo-steward) — `hook-types.ts:936-942` against HEAD `dd643c82b` verified line-accurate.
- **`oc-config-uri.ts` proto vs PR-2 canonicalization** (architect + repo-steward) — mirrors `oc-path.ts` shape, stable enough that PR-2 is a re-home not a rewrite.
- **lint() is a pure fold** (gateway-eng) — no global state, no I/O, schema dependency-injected, re-entrant; the right factoring.
- **Cross-document consistency on lint pipeline** (repo-steward) — 12 issue numbers match across EVIDENCE.md, FINDINGS F-105..F-116, scenarios SC-39..SC-50, fixture files, PR-DRAFT 1.
- **Runtime-gated enforcement model** (gateway-eng + compliance) — adapter-audits §4 explicit "NOT write-blocked" closes a real consumer-threat-model gap rather than burying it.

## Recommended remediation order

Given repo-steward gates on three mechanical fixes (~1 hr total), the fastest path to cp-2 ready:

1. **B2 + B3** (~30 min) — recount FINDINGS, fix v0.3 frontmatter + Reader's guide
2. **B1** (~30 min) — audit PR-numbering across the 5 affected files; pick pr-drafts as ground truth
3. **B6 + B7** (~45 min) — type-mismatch semantics + 3 missing tests
4. **B5** (~30 min) — bot-preempt-checklist §3 carve-outs + qualified PR-1 attestation
5. **B4** decision (~5 min) — implement vs downgrade regen-script; if implement, ~2 hr; if downgrade, ~5 min

Total: ~3 hours if implementing B4, ~1.5 hours if downgrading.

After all 7 BLOCKs close, the panel re-runs (R2) on the patched artifacts before cp-2 opens. R2 should be light — the structural shape is right, only the discipline gaps need closing.

## Verdict

**REQUEST-CHANGES (consolidated)** — gate cp-2 opening on B1-B7 close, then run R2.

Five reviewers approve-with-warnings; repo-steward gates the wave on the three discipline issues (B1-B3) plus the structural cross-confirms from release-eng (B4-B5) and testing (B6-B7). The substantive design (lint engine, audit-stream wire-shape, runtime-gated enforcement, evidence-driven PR-1 pitch) is sound and should not change. The fixes are mechanical: renumber, recount, retitle, add 3 tests, clarify one semantic decision, fix one false attestation, choose implement-or-downgrade for one stub script.
