# PR-DRAFT 1 Consolidated Review · pre-push

**Date**: 2026-04-28
**Reviewers**: claws:gateway-eng, claws:compliance, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
**Status**: All 6 reviews complete.

## Verdict roll-up

| Reviewer | Verdict | HC-BLOCK | HC-WARN | HC-NOTE |
|---|---|---|---|---|
| gateway-eng | **REQUEST-CHANGES** | 3 | 4 | 4 |
| compliance | APPROVE-WITH-WARNINGS | 2 | 4 | 5 |
| release-eng | APPROVE-WITH-WARNINGS | 0 | 5 | 4 |
| repo-steward | APPROVE-WITH-WARNINGS | 0 | 2 | 6 |
| architect | APPROVE-WITH-WARNINGS | 0 | 4 | 5 |
| testing | **REQUEST-CHANGES** | 0 (binary fix) | 6 | 7 |
| **Total (6/6)** | **REQUEST-CHANGES** | **5** | **25** | **31** |

2 reviewers requested changes (gateway-eng, testing); 4 approved-with-warnings. Pre-push gate: **NO** until BLOCKers close.

## Consolidated HC-BLOCK (5 unique after dedup)

| # | Source | Title | Disposition / fix path |
|---|---|---|---|
| B1 | gateway-eng | "Parity-or-faster" plain-JSON claim is structurally false against `short-circuit.ts` | **CLOSED 2026-04-28** — short-circuit dropped per user direction; parser optimized (line/col extracted from hot loop); honest measured numbers in RESULTS.md |
| B2 | gateway-eng | "JSONC ≤2× stringify on 1MB" is bare assertion, no bench | **CLOSED 2026-04-28** — bench captured at `tests/perf/RESULTS.md`. Real numbers: plain1MB AST 1.16× stringify p50 / 1.63× p95; jsonc1MB pending re-run; 50ms ceiling PASS at 7.4ms p95 |
| B3 | gateway-eng | No recursion depth cap in `parse.ts` | **CLOSED 2026-04-28** — `MAX_DEPTH = 256` added; deep-nest input now records diagnostic and resyncs |
| B4 | compliance | PR-1 "prevents recurrence" overclaims (closed `__OPENCLAW_REDACTED__` issues were patched at consumer, not substrate) | **PENDING** — reframe as "prevents new instances of the corruption substrate; existing reject-rules continue to catch placeholder writes from non-AST consumers" |
| B5 | compliance | PR-1 implies `oc://config/...` URIs feed audit-log correlation, but `adapter-audits.md` §3.3/§3.6 doesn't carry URI as correlator field | **PENDING** — drop the audit-correlation framing OR add the URI to the SIEM mapping table in adapter-audits.md §3.3 |
| B6 | testing | 47 lint tests written, 70 claimed in PR-DRAFT 1 — 23 tests + `resolveConfigUri` source not implemented, but description checks `[x]` | **PENDING** — Path B chosen: write the missing tests + `resolveConfigUri` source in step 0a (upstream fork integration). Until then, downgrade `[x]` → `[ ]` for unwritten tests so the description matches reality |

## Cross-reviewer consensus

These findings were independently flagged by ≥2 reviewers — high-priority targets:

- **Subpath arithmetic** — release-eng W1 + repo-steward W1 — PR-1 says "five subpaths land, four earn keep" but counting differs from the four-ways table. Pick one accounting.
- **Citation accuracy** — repo-steward verified `src/config/io.ts:1381+:2082` are exact matches against HEAD `dd643c82b`. No rot.
- **Codemod scope vague** — release-eng W3 — line 270 "Codemod note in CHANGELOG" needs concrete path/script + deprecation window for the `DiagnosticLocation` discriminated-union shift.
- **`regen-lint-evidence.ts` not cited** — release-eng W4 — script exists but PR-1 doesn't reference it as the pre-push citation-freshness tool.
- **`resolveConfigUri` return type inconsistency** — architect S2 — mixes boolean-tagged `{found: true|false}` with `| OcUriError` — inconsistent with sibling `OcConfigUriError` throw pattern. Drop the error arm OR throw consistently.
- **`/staging` `/path-canonical` SemVer lock-in** — architect S3 — exported but no PR-1 consumers. Consider deferring the export to PR-5/PR-6 when consumers materialize.
- **`ParsedOcUri` discriminated-union** — architect S4 — PR-1 description claims unified `{kind: 'workspace'|'config'}` shape but `oc-config-uri.ts:26-28` defines a separate `ParsedOcConfigUri` with no `kind` discriminator. Reviewers will notice; reconcile.

## HC-WARN themes

| Theme | Reviewers flagging | Fix |
|---|---|---|
| Test count integrity (70 claimed vs reality) | release-eng, testing, repo-steward | Mark unwritten tests `[ ]`; total becomes 47 + ~10 step-0a tests = ~57 honest claim |
| Negative cases not surfaced in description | testing | Add a "False-positive contract" subsection naming `$schema` (#14998) and clean `${VAR}` (#62438) as negative-test commitments |
| Public symbol list incomplete | release-eng | Enumerate: `parseOcUri`, `formatOcUri`, `parseOcConfigUri`, `formatOcConfigUri`, `OcConfigUriError`, `parseJsonc`, `emitJsonc`, `emitJsoncWithMutation`, `JSONC_GRAMMAR`, `lint`, `LintFinding`, `LintCode`, `LintSeverity`, `LintSchema`, `DiagnosticLocation` discriminated union shift |
| Codemod call-out vague | release-eng | Add: codemod script path, ~3-month deprecation window for `loc.file` direct access, detection grep |
| `regen-lint-evidence.ts` not cited | release-eng | Add a "Citations refreshed pre-push via `scripts/regen-lint-evidence.ts`" line in the issue-citation table footnote |
| `/staging` + `/path-canonical` consumer-less | architect | Either defer their public exports to later PRs or document the forward consumers explicitly |
| Forward-reference framing in footer | repo-steward (N2) | Tighten or drop the "originally planned as separate PR-2 ... folded 2026-04-28" footer; reviewers don't need internal wave history |
| Real-config round-trip fixture missing | testing | Add a fixture from a representative real openclaw config (anonymized) to `tests/lint/fixtures/` and exercise emit byte-identity |

## Strengths preserved (do not change in the description rewrite)

- Issue-citation table at top — "data-driven, not narrative" — strongest defense against `r:third-party-extension` auto-close (release-eng + compliance + repo-steward)
- `hook-types.ts:936-942` citation verified line-accurate against HEAD `dd643c82b` (repo-steward)
- `DiagnosticLocation` discriminated-union shape (architect)
- `LintSchema` DI seam genuinely schema-agnostic (architect + testing)
- Per-rule positive+negative discipline in tests (testing)
- `replaceConfigFile` chokepoint as right control point for §164.312(b) framing (compliance)
- Detection-only lint posture is the conservative stance an auditor expects (compliance)
- 6-PR pacing under 10-cap; step 0a + 0b correctly gated before `gh pr create` (release-eng)

## Remediation plan (Path B per user direction "B lets get this right")

**Phase 1 — Description rewrites (≤1 hour, no code changes)**:
1. Delete the parity-or-faster claim; replace with measured numbers from `tests/perf/RESULTS.md`
2. Reframe "prevents recurrence" → "prevents new instances of the corruption substrate; existing reject-rules continue at the consumer side"
3. Drop the audit-log-correlation claim for `oc://config/...` OR confirm we're amending adapter-audits §3 SIEM mapping to carry the URI
4. Reconcile subpath arithmetic (5 subpaths land; 4 earn keep visibly in this PR; 2 ride for downstream)
5. Mark unwritten test checkboxes as `[ ]`; honest total drops from 70 to ~47 + step-0a tests
6. Add false-positive-contract subsection (`$schema`, `${VAR}` negative tests as commitments)
7. Enumerate full public-API symbol list
8. Concrete codemod call-out (path, window, detection grep)
9. Cite `regen-lint-evidence.ts` in the issue-citation footnote
10. Reconcile `ParsedOcUri` shape between description and `oc-config-uri.ts`
11. Tighten the wave-history footer

**Phase 2 — Code reconciliation (≤2 hours)**:
1. Drop `OcUriError` from `resolveConfigUri` return type (architect S2) — throw consistently OR use only boolean-tagged result
2. Decide on `/staging` + `/path-canonical` exports — document consumers OR defer
3. Reconcile `ParsedOcConfigUri` with PR-1's claimed `ParsedOcUri` discriminated union

**Phase 3 — Step 0a integration (1-2 days)**:
1. Fork + fork remote setup (`giodl73-repo/openclaw`)
2. Apply patches in fork branch
3. Write the missing 23 tests (lint surface + URI parser/resolver + doctor migration emit)
4. `pnpm install + build + test` clean against trunk

After Phase 3, the description's `[x]` checkboxes match reality; PR is ready to push.

## R2 plan

After Phase 1+2 complete, re-run a focused R2 with the 2 REQUEST-CHANGES reviewers (gateway-eng, testing) verifying their BLOCKers actually closed. The 4 APPROVE-WITH-WARNINGS reviewers don't need re-spawning unless their HC-WARNs get specifically addressed.

After Phase 3 complete, run a full R2 panel (all 6 reviewers) since the test-suite-as-shipped will have changed substantially.

## Final verdict

**REQUEST-CHANGES (consolidated)** until B4, B5, B6 close (Phase 1 closes B4+B5; Phase 3 closes B6).

The substantive design (lint engine, lossless emit, URI vocabulary, runtime-gated enforcement) is sound and should not change. The fixes are description-tightening (Phase 1), small code reconciliation (Phase 2), and the integration work that was always the next step (Phase 3 = wave.yaml's planned step 0a).
