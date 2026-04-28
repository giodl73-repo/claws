# Plan Review · claws-openclaw-upstream · R1

**Reviewer**: claws:claws-release-eng
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

Plan realistically paces 6 PRs across upstream's 2-open-at-a-time culture and 10-PR-per-author cap. Adapter audits and bot pre-empt checklist are well-conceived risk mitigations. Three gaps require clarification before implementation closes cp-1: versioning/codemod workflow for OC-7's field-widening is under-specified, scope-flip trigger point vs upstream merges is missing, and post-merge verification workflow for H1–H4 criteria is undocumented.

## Findings

### HC-BLOCK (1)

1. **Scope-flip trigger point undefined** — Plan says scope-flip PR (`@bic/openclaw-*` → `@openclaw/*` rename across our monorepo) is "out-of-scope" and defers to a follow-up plan, but does not state WHEN scope-flip lands relative to upstream merges or publish. If `@openclaw/*` packages publish before internal scope-flip lands, internal imports still point to `@bic/openclaw-*`, creating a transient publish-time versioning gap where downstream internal consumers see `@bic/*` in lockfiles while upstream shows `@openclaw/*`. **Consequence**: internal dependency chains risk downgrade conflicts at consume time. **Suggested fix**: Define scope-flip as part of cp-4 (Wave C) closeout, BEFORE any `@openclaw/*` publish happens, or document the transient versioning window and internal migrate path.

### HC-WARN (2)

1. **OC-7 codemod migration artifact under-specified** — Plan says "codemod migration note ships with PR-4" but does not state: (a) where the note lands (PR description, CHANGELOG, separate guide), (b) whether it's machine-runnable or advisory-only, (c) who validates that internal consumers (policy + snap) have adopted it. Minor-version field-widening (`boolean → boolean | ApprovalDescriptor | ApprovalDescriptor[]`) is sound, but no runbook for internal migration at publish time. **Suggested fix**: Expand OC-7 deliverables to include codemod validation gate in cp-4 testing stage + explicit internal consumer audit (policy + snap re-verified against new field shape).

2. **Post-merge verification workflow for H1–H4 criteria not documented** — Plan lists validation criteria (MERGED status, tests green, SDK baseline/overview table refreshed) but does not specify HOW verification runs: webhook polling at `openclaw/openclaw`? Manual PR-status check in our CI? When does post-merge L3 acceptance testing execute — immediately after merge, or in a batched job during testing stage? **Consequence**: delivery stage cannot objectively confirm H1–H4 without first documenting the runbook. **Suggested fix**: cp-4 testing stage must include a test-infrastructure story: "pull latest HEAD from openclaw/openclaw, run H1–H4 validators, report deltas vs pre-merge expectations."

### HC-NOTE (3)

1. **Adapter audit integration point with upstream reviewers unclear** — Plan says adapter audits are "published as reusable artifacts" in `docs/upstream/guides/adapter-audits.md` (internal to this monorepo), but the upstream bot-reviewer trio sees the upstream PR, not our internal docs. PR-3 and PR-5 cite the audit, but the citation is a markdown link to *our* internal guide that upstream GitHub won't resolve. **Consequence**: Greptile + Copilot + chatgpt-codex bots may not recognize the audit context. **Suggested fix**: Either embed audit findings inline in the PR description, link to a public-readable artifact, or clarify that the adapter audit is a pre-flight check for us, not a deliverable to upstream.

2. **Baseline hash + SDK overview table refresh ownership under-specified** — Wave constraints list the file paths and mention "per-PR refresh" in the plan, but the plan does not assign responsibility (author of each PR? release-eng reviewer?) or define validation criteria (what constitutes a valid refresh?). **Suggested fix**: Add to bot-preempt-checklist in H6 deliverable: "Baseline hash and SDK overview table refreshed post-merge via the upstream-provided regen script; commit message includes refresh SHA and timestamp."

3. **Branch cohabitation rebase/merge strategy deferred** — PROGRESS.md says merge ordering between Hapi (this wave) and Isis (lobster-foundation wave on same `feature/isis-the-weaver` branch) is "decided at delivery time, not now." If Isis rebases before Hapi lands, Hapi's commits need rebase; if Hapi merges first, Isis may need rebase. **Consequence**: late delivery-stage risk if rebase conflicts arise. **Suggested fix**: Record a provisional merge order in wave.yaml and add a pre-delivery checkpoint to validate the order is still sound.

## Strengths

- **Bot pre-empt checklist design**: Greptile + Copilot + chatgpt-codex trio is well-understood; checklist directly addresses their categories. This mitigates the <4h merge-time pressure and reduces review friction.
- **Adapter audits as pre-flight gating**: Flagging emitted-plugin registration and audit-stream wire-shape as residual technical risk BEFORE dependent PRs open (H6 → H2/H3) is sound release-engineering discipline.
- **PR sequencing constraint honored**: Wave A → Wave B → Wave C respects the dependency graph. No gating issues; 2-open-at-a-time pacing is realistic against upstream's culture.
