# Pulse Review · Hapi the Bringer · R1

**Reviewer**: dragon
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

All 5 dragons are mitigatable within scope, but 3 directly threaten delivery confidence. Wave structure is sound; the gaps are in _what's not explicitly tied down_ — finding orphans, missing pre-flight gates, missing contingency paths, missing PR-description language that locks the user-facing pitch.

## Findings

### HC-WARN (5)

1. **F-76 (HC-BLOCK from scenarios) silent in pulse 04's addresses_findings** — Pulse 04's `addresses_findings:` lists `[F-52, F-53, F-54, F-55, F-56, churn data on doctor-legacy-config.migrations]` but does NOT include F-76 (JSONC parse + emit byte-identical — the headline invariant). The TDD section covers it, but the frontmatter doesn't tag it. **Consequence**: F-76 is orphaned in any later traceability audit. **Suggested fix**: add F-76 (and Phase 5 finding IDs F-77..F-101 where addressed) to pulse 04's frontmatter.

2. **OC-7 crash-safety spec choice (F-23) missing from PR-5 description** — Pulse 08 covers F-22 (crash-safety) via try/catch wrapper but doesn't explicit cite F-23 (spec-declared resolution path: error-propagate vs continue-with-error-log). Upstream reviewers won't know which semantics PR-5 chose. **Consequence**: review-time surprise; reviewer asks "what happens to subsequent plugins after plugin-B throws?" and PR description doesn't answer. **Suggested fix**: pulse 08 to include explicit resolution-path subsection; cite UG-upstream amendment §11.

3. **Adapter-audits.md quality validation gate missing** — Pulse 01 produces the adapter-audits.md guide but has no internal validation gate that checks the document covers the substantive cases (CEF timestamp granularity F-39, actor-identity collision F-40, correlation-field convention F-41, CLI registration precedent F-35). If pulse 01 ships a thin or wrong audit, pulse 07 (PR-4 hard dependency on F-38) opens with the wrong evidence and stalls in upstream review. **Suggested fix**: pulse 01 verification gate to grep for `F-39`, `F-40`, `F-41`, `F-42`, `F-35` keywords (or their content equivalents) in the produced guide.

4. **Scope-flip contingency path silent (pulse 11)** — Pulse 11 implicit contract: "all 4 upstream package PRs merge, then scope-flip happens." But if any 1 PR is rejected upstream for unrelated reasons (bot-reviewer auto-close on a phrase, maintainer asks for split, review takes weeks), pulse 11 hangs while 4 sibling pulses show completion. No fallback recorded. **Consequence**: wave can deadlock without explicit contingency. **Suggested fix**: pulse 11 to include contingency note: "If any upstream PR is split or deferred, scope-flip moves to the next wave; record disposition in `docs/upstream/CHANGELOG.md`."

5. **Three-Ways pitch unvalidated in TDD (pulse 04)** — Pulse 04 claims `/path`, `/ast`, `/canonicalize` each "earns its keep" in PR-1, but the TDD section doesn't map 1:1 to the three ways. If a reviewer asks "specifically, where is `/path` consumed in this PR?", the proof is buried in the diagnostic-shape extension paragraph. **Consequence**: review-time question that should have a fast answer. **Suggested fix**: subsection the TDD section in pulse 04 — "Way 1 (`/ast` lossless): tests F-76, F-77, F-78, F-79, F-80; Way 2 (`/path` diagnostic vocabulary): tests F-86, F-87; Way 3 (`/canonicalize` cross-OS): test F-52, F-53."

### HC-NOTE (3)

1. **Backward-compat for existing on-disk audit entries** — Sourceless pre-v0.2 audit entries exist on customer disks today. Lenient mode handles them, but: who counts? Operations should know the migration cost. Pulse 07 could mention "audit verifier prints summary at end: N strict entries, M lenient entries" so operators see the migration progress.

2. **i18n / CLI help text translations** — None of the pulses mention diagnostic message translations. Likely out-of-scope for this wave but flag for future. Pulses 06 (OC-4) + 09 (PR-6 policy) introduce new diagnostic codes; if upstream translates messages, our additions become a translation backlog.

3. **Old config formats lurking on disk** — Pulse 04 (PR-1) wholesale-converts `replaceConfigFile`. What about config files that pre-date v2026.x format conventions? They might have schema differences AST parser can't handle. Check whether existing tests exercise pre-v2026.1 config snapshots.

## Strengths

- **Dependency DAG is clear and parallel-safe** — every hard-dependency gate (F-38 for PR-4, codemod gate for Wave C, scope-flip cascade) is explicit and greppable.
- **Pulse pairing strategy works** — small surgical (OC-4, OC-7) paired with heavy package (guardrails, policy) at every wave gives reviewers fast wins while the big PRs accumulate inline comments.
- **Restructure was disciplined** — 7 PRs across 4 waves, 12 pulses across 5 checkpoints; numbers consistent across pulse frontmatter, checkpoint files, and wave.yaml after the architect found one stale "PR-2" string in pulse 06 content.
