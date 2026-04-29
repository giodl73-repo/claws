# PR-DRAFT 1 — claws-repo-steward review · pre-push (cp-2)

**Date**: 2026-04-28
**Subject**: `pr-drafts/PR-1.md` (post-2026-04-28 fold of former PR-2)
**Lens**: repository discipline, file:line citation accuracy, frontmatter contracts, atom registries, cross-document consistency.
**Verdict**: APPROVE-WITH-WARNINGS
**Pre-push gate**: YES, conditional on W1 + W2 wording fixes — citations and cross-doc structure hold; two surface defects are cheap to flip before `gh pr create`.

---

## Citation accuracy verification

Verified against `C:\src\openclaw-core\src\config\io.ts` (current HEAD on the integration fork branch).

| PR-1 cite | Verified content | Verdict |
|---|---|---|
| `src/config/io.ts:1381` (PR-1 L3, L101) | `const persistedRootRaw = JSON.stringify(persistedRootParsed, null, 2)` | EXACT MATCH |
| `src/config/io.ts:2082` (PR-1 L3, L108) | `const json = JSON.stringify(stampedOutputConfig, null, 2).trimEnd().concat("\n");` | EXACT MATCH |
| `replaceConfigFileSync` defined at `:1305`; called from `:1385` | matches PR-1's "two write paths through `replaceConfigFile`" framing | OK |

Note: `JSON.stringify` also appears at `:436` and `:449` (health-state writes inside `writeFile`/`writeFileSync`). PR-1 correctly excludes them — they are not config-mutation paths and the body says "the only two write paths through `replaceConfigFile`" which is accurate. **No citation rot.**

## Cross-document consistency post-merge

Spot-checked PR-1 vs pulse 04, cp-2.md, UG-upstream §8/§9/§10a, and PROGRESS.md cp-2 entry:

- pulse 04 deliverable list (lines 24–61): workspace package + `/ast/jsonc` + `/lint` + dual `/path` URIs + `/canonicalize` + doctor migration emit + `replaceConfigFile` conversion + diagnostic-location format extension. PR-1 §"What ships" enumerates the same five items. **Match.**
- cp-2.md line 27 ("AND ... AND ... AND") matches PR-1's four-ways framing.
- UG-upstream.amend.md §8 line 265 calls Wave A "PR-1 + PR-2", which is **a stale internal reference** to the pre-2026-04-28 split. UG-upstream §9 line 278 has the correct post-merge framing ("Pre-2026-04-28 plan had 7 PRs ..."). §8 line 265 should be tightened during deploy or the amendment risks confusing future readers — flagged as N1.
- PROGRESS.md line 49 ("6 upstream PRs total ... Workspace earns its keep FOUR ways") matches PR-1 L169–177 four-ways table. **Match.**

## Subpath table consistency (PR-1 L90–95)

The "Consumed in PR-1 by" column lists `/ast`, `/ast/jsonc`, `/lint`, `/path`, `/canonicalize` — five subpaths. The intro sentence (L87) says "Five subpaths land with this PR; four of them are exercised in the same PR" with `/staging` and `/path-canonical` deferred. **Math doesn't add up**: 5 listed + 2 deferred = 7 subpaths total, but pulse 04 line 26 lists exactly 7 (`/path`, `/ast`, `/ast/jsonc`, `/lint`, `/canonicalize`, `/staging`, `/path-canonical`). So the table is **complete on landing** but the "four of them" wording is undercount — `/ast` (workspace-file diagnostic vocabulary), `/ast/jsonc` (lossless emit), `/lint` (lint surface), `/path` (URIs in diagnostics + lint), `/canonicalize` (cross-OS CI) all earn keep. That's **five, not four**. Flagged as W1.

## Frontmatter discipline

PR-1 is body-only — no YAML frontmatter. Verified all six PR-drafts (`PR-1.md` … `PR-6.md`): all body-only, all open with `## Why this PR`. **Convention is consistent across the wave.** Pulses (`pulses/04+pr1-openclaw-workspace.md` line 1–11) and checkpoints (`checkpoints/cp-2.md` line 1–6) DO carry frontmatter; pr-drafts don't. The split is intentional (pr-drafts are PR-body fodder, not internal artifacts), and PR-1 conforms. **Pass.**

## "Earns its keep four ways" table (L169–177) vs deliverables

| Way | Subpath in table | Deliverable in §"What ships" | Match? |
|---|---|---|---|
| 1. Lossless `replaceConfigFile` | `/ast/jsonc` | "`replaceConfigFile` lossless conversion" L99–114 | OK |
| 2. 13-code lint surface | `/lint` | "13 new lint codes" §"Lint surface" L198–213 | OK |
| 3. URI vocabulary in diagnostics | `/path` | "Diagnostic location format extension" + "`oc://config/...` URI scheme + doctor migration emit" L116–167 | OK |
| 4. Cross-OS canonicalize | `/canonicalize` | F-52, F-53 in test plan L230–231 | OK — but no body §; deliverable is the CI matrix only |

The four-ways table is honest. **However the cp-2 R1-already-cross-confirmed HC-WARN from cp-1 release-eng W1** ("PR-1 'earns its keep' table missing `/lint` and `/ast/jsonc`") is fully addressed in this draft — both rows present. Confirms the post-restructure cleanup applied.

## Issue-number cross-reference (PR-1 vs `EVIDENCE.md` + `FINDINGS.md` Phase 6)

Issues cited in PR-1: #14998, #20478, #22272, #31251, #48415, #59070, #60334, #61683, #62281, #62438, #65565, #72872 + closed-historical #13495, #44357, #62281, #21573, #13210, #12078, #44943, #62182. PR-1 also cites #22272 in the table at L12 (mapped to "doctor --fix reports changes but doesn't modify file") AND at L10 (mapped to "Unrecognized key startup blocks"). EVIDENCE.md row 17 maps #22272 → `OC_CFG_UNKNOWN_FIELD` with title "doctor --fix flags unrecognized config keys but does not remove them". The double-citation is defensible (the issue genuinely sits on both axes) but the L12 row may read as overclaim — flagged as W2.

All other issue numbers reconcile against EVIDENCE.md aggregate counts (line 32–40) and FINDINGS Phase 6 F-105..F-116 issue-replay rows. **27 distinct, all sourced.**

## PR-3 / PR-5 cross-references (post-renumber)

PR-1 does not contain the strings "PR-3 leads with the audit-stream substrate" or "PR-5 leads with the generator-emitted plugin" verbatim — those framings live in the review prompt, not in the PR description body. PR-1's only forward references are L87 ("consumed by PR-5 and PR-6") for `/staging` and `/path-canonical`. Verified against PR-5 (`@openclaw/policy` generator) and PR-6 (`@openclaw/snap`) — **renumbering is correct**. PR-3 = guardrails (audit-stream substrate) and PR-5 = policy (generator-emitted plugin) per the post-2026-04-28 scheme.

## Footer wave-history note (L278)

> "originally planned as a separate PR-2 ... folded into this PR on 2026-04-28 since the lint surface already establishes the URI vocabulary in active use; splitting would have created a forward-reference dependency for reviewers."

For the **public** PR description: the framing is acceptable. Bot reviewers don't care about internal wave history, but a 1-sentence rationale ("we considered a split, here's why we didn't") **answers the bot question before it's asked** — Greptile sometimes posts "scope-creep?" comments on multi-concern PRs. The "would have created a forward-reference dependency" half is the load-bearing justification. **Keep, but tighten** — flagged as N2.

## Findings

### HC-WARN

| # | Where | Issue | Action |
|---|---|---|---|
| W1 | L87 | "four of them are exercised in the same PR" — actually FIVE earn keep on landing (`/ast`, `/ast/jsonc`, `/lint`, `/path`, `/canonicalize`); only `/staging` + `/path-canonical` defer | Reword to "five of seven" or restructure intro — current count contradicts the four-ways table at L169 (which lists four because it folds `/ast` into the URI-vocabulary row). Pick one accounting and apply consistently. |
| W2 | L12 | #22272 row maps to "doctor `--fix` reports changes but doesn't modify file" — EVIDENCE.md L17 maps the same issue to `OC_CFG_UNKNOWN_FIELD` (different bug class) | Either consolidate the two #22272 rows (L10 + L12) into one with both mechanisms cited, or strike the L12 row and let L10's `OC_CFG_UNKNOWN_FIELD` carry the citation |

### HC-NOTE

| # | Where | Issue | Action |
|---|---|---|---|
| N1 | UG-upstream.amend.md §8 line 265 | "Wave A (cp-2): PR-1 ... + PR-2 oc://config URI scheme extension — open simultaneously" — stale pre-2026-04-28 wording | Pre-deploy fix in record stage; not a PR-1 blocker. PROGRESS.md and §9 already carry the corrected framing. |
| N2 | L278 | Wave-history footer is acceptable but verbose | Tighten to: "The runtime-config URI scheme + doctor migration emit ride alongside the lint surface in this PR; splitting would have created a forward-reference dependency on the URI vocabulary." Drop the date and "originally planned" framing. |
| N3 | L260 | Test totals: PR-1 says **70 tests** (42 lint + 20 prior + 8 absorbed). Pulse 04 line 113 says **67 tests** (41 L0 + 14 L1 claws + 7 L1 upstream + 3 L2 + 2 L3) and notes "PR-1 description's '70 new tests' includes these plus 3 prior-scope L2 tests." The arithmetic is consistent (67 + 3 L2 prior-scope = 70) but the PR-1 body breakdown (42 + 20 + 8 = 70) and the pulse breakdown reach 70 by different routes | Add a one-line reconciliation comment, or normalize one count |

## Pre-push gate decision

**Conditional pass.** W1 (subpath count) is the only finding that a bot reviewer is likely to flag — it's a literal arithmetic inconsistency in adjacent paragraphs. W2 is a citation-discipline issue that auditor-class reviewers (compliance lens, already raised B1/B2 on adjacent claims) might pick up. Both are 5-minute fixes. N1–N3 are post-merge cleanup items.

Citations to `io.ts:1381` and `io.ts:2082` are exact matches against the integration fork; no rot. Frontmatter convention holds. Cross-document references (pulse 04, cp-2.md, PROGRESS.md, UG-upstream §9) all reconcile post-merge. Issue numbers match EVIDENCE.md and Phase 6 findings. The four-ways table matches the deliverables list. The PR description is structurally sound; ship after W1+W2 fixes.
