# cp-1 Review · claws-release-eng · R1

**Date**: 2026-04-28
**Verdict**: APPROVE-WITH-WARNINGS

## HC-BLOCK findings (release-engineering blockers — must fix before cp-2 opens)

| # | Title | Where | Why blocking | Action |
|---|---|---|---|---|
| B1 | `regen-lint-evidence.ts` is non-functional past `--dry-run` — cannot fail CI on drift | `packages/openclaw-workspace/scripts/regen-lint-evidence.ts:75-79` | Plan H5 + workspace-lint plan §144 promise this gate keeps PR-1's cited issue counts fresh "up to push time." Today the script writes nothing, leaves a `TODO`, and emits `console.warn` (exit 0). A CI gate calling this script will be green-by-default while citation drift compounds — exactly the failure mode it was meant to catch. | Implement the file-write + diff path, or downgrade the contract in the lint plan from "CI gate (warn-only)" to "advisory script — manual citation refresh required." Either is fine; the current state has the worst of both (looks gated, isn't). |
| B2 | Bot-preempt §3 checklist line conflicts with §3.2 carve-outs — PR-1 self-attests falsely | `bot-preempt-checklist.md:61` vs `bot-preempt-checklist.md:90` and `pr-drafts/PR-1.md:192` | §3 line 2 reads "`grep -iE "(third.?party\|extension\|skill\|clawhub)"` against PR body returns zero matches." Running the §3.2 regex against `PR-1.md` returns 11 hits (line 17 "extension," 19 "extension," 77 "extension," 81 "extension," 92 "extension," 114 "extension," 185 "SKILL," 191 "extension," 192 "third-party-extension/skill," 21, 79). §3.2 documents legitimate architectural carve-outs ("extension-point," `WorkspaceFileKind` enum), but §3's checkbox demands "zero matches" verbatim. PR-1 line 192 ticks the box anyway — the bot trio reads attestations literally. | Rephrase §3 checkbox: "regex returns zero matches OR every match is a §3.2-recognised architectural term." Add a `scripts/scan-pr-body.sh` that distinguishes the two cases and exits non-zero only on §3.2 NEVER-SAFE phrases. PR-1 then re-attests with the qualified form. |

## HC-WARN findings (should address)

| # | Title | Where | Action |
|---|---|---|---|
| W1 | Subpath skew between `package.json` exports and `src/index.ts` namespace exports | `packages/openclaw-workspace/package.json:14-49` vs `src/index.ts:18-24` | `package.json` exports `./ast/jsonc` as a named subpath; `src/index.ts` exports `jsonc` from `./ast/jsonc/index.js` at the root namespace, but `package.json` has no `./jsonc` root subpath. Consumers reading PR-1's "earns its keep" table (`pr-drafts/PR-1.md:88-94`) see only `/ast`, `/path`, `/canonicalize`. Lint subpath `/lint` is also exported but absent from PR-1's table. Either prune unused subpaths or extend PR-1's table to honestly enumerate `/lint`, `/ast/jsonc`, `/staging`, `/path-canonical`. Greptile will flag the dist-shape vs description mismatch. |
| W2 | Codemod gate (post-merge §4) requires the upstream codemod script to exist before PR-4 push | `post-merge-verification.md:285-287` | Step 4 invokes `node /c/src/openclaw-core/scripts/oc7-codemod.js --dry-run …`. That script is what PR-4 ships; it cannot be `--dry-run`-gated against `claws-side` packages until PR-4 itself lands. The gate's logic is sound but the file path implies it pre-exists. Reword as "after PR-4 merges, run the script that PR-4 added" or move the codemod gate from §4 to §5.2 (failure-mode triage). Otherwise CI maintainers will wire a job that always errors on file-not-found. |
| W3 | PR-pacing math: plan says 7 PRs across cp-2/3/4/5; wave.yaml says cp-2 (2) + cp-3 (2) + cp-4 (2) + cp-5 (1+scope-flip+fixtures) = 7 PRs. Budget is intact, BUT cp-5 mixes a real upstream PR (PR-7 snap) with two non-PR pulses (scope-flip, acceptance fixtures) | `wave.yaml:75-87` | Pacing is technically respected (≤2 open at any time). Risk: cp-5 PR-7 review can stall behind the scope-flip review if reviewers conflate them. Recommend: open PR-7 *first* in cp-5, do the internal scope-flip while PR-7 is in review, do fixtures last. Document this ordering in `pulses/10+pr7-openclaw-snap.md`. |
| W4 | Adapter-audits §5 re-audit triggers are stated but not detectable from CI without manual `git diff` | `adapter-audits.md:424-431` | "`src/plugins/hook-types.ts` changes the `PluginHookRegistration` shape" — checkable via a `gh api` call comparing the file's blob SHA between the recorded `upstream_baseline` HEAD and the current HEAD; not currently scripted. Similarly for `register-plugin-cli-command-groups.ts`, the SIEM-formats directory, and the `AuditEventType` union. Add a `scripts/check-adapter-drift.sh` that runs `gh api repos/openclaw/openclaw/contents/<path>` for the four pinned files and exits non-zero on SHA delta. Without it, "event-driven re-audit" is an honor system. |

## HC-NOTE findings (capture for follow-up)

| # | Title | Where |
|---|---|---|
| N1 | `bot-preempt §4` pre-flight commands assume the PR description lives at `PR-DESCRIPTION.md` | `bot-preempt-checklist.md:106` — the actual draft lives at `.craft/waves/.../pr-drafts/PR-N.md`. Either symlink convention or parameterize the path. |
| N2 | Plan claims "median <4h merge" for the bot trio | `bot-preempt-checklist.md:36` — no anchor PR # cited. §5's table claims PR #72287 anchor for `chatgpt-codex` patterns; consider adding 2-3 anchor PRs to §1's median claim so reviewers can verify. |
| N3 | `package.json` declares `vitest` ^4.0.0 but no test script in CI surface yet | `package.json:60-69` — confirm CI workflow `openclaw-workspace-cross-os.yml` exists before PR-1 push (post-merge §3.1 line 94 references it). |
| N4 | `post-merge §3.1` round-trip node-eval inlines a JSONC fixture with `\n` escapes | `post-merge-verification.md:102-109` — works but a `tests/integration/round-trip.test.ts` invocation would be more durable than an inline `node -e`. |

## Strengths

- **Adapter-audits §3 audit-stream wire-shape** is genuinely impressive — 13-row field-by-field SIEM mapping is exactly what closes F-38 HC-BLOCK as the file declares. Round-trip integrity contract is testable, lossy-format tradeoffs honest, the `--verify` flag sensible.
- **PR-1 issue-citation table** (lines 5-17) leads with **data not narrative** — 27+ real issue numbers, distinguishing open vs closed, mechanism per row. This is the strongest defense against `r:third-party-extension` auto-close I have seen in this wave's drafts.
- **Pulses/checkpoints sequencing in `wave.yaml`** correctly tags cp-1 as "NO upstream PRs" — the prep wave doesn't burn a PR slot, preserving the 10-PR budget for actual deliverables.
- **post-merge §6 CHANGELOG record format** is copy-paste-ready; auditors will love the `MERGE_SHA` + `baseline-hash post:` discipline.
- **Adapter-audits §4 runtime-gated enforcement model** is the right call — explicitly flagging "this is not write-blocked" closes a real consumer-threat-model gap rather than burying it.

## Verdict reasoning

This wave can ship 7 PRs through upstream's bot trio without auto-close, **provided B1 and B2 close before cp-2 opens.** The bot-preempt checklist, post-merge runbook, and adapter audits are substantively right — they identify the real auto-close failure modes (keyword regex, baseline-hash drift, SIEM mapping) and provide concrete commands rather than narrative. The codemod gate in post-merge §4 is the cleanest articulation of W1 I've seen, and the PR-1 draft's data-driven pitch is materially harder to label `r:third-party-extension` than the prior draft.

What worries me is the **gap between attestation and enforcement.** PR-1 ticks every checkbox in §3, including the regex-clean one — but the regex is not actually clean, and §3.2's carve-outs aren't wired into the checkbox logic. That same gap exists in `regen-lint-evidence.ts` (claims a CI gate; ships a stub) and adapter-audits §5 (claims event-driven re-audit; relies on manual diff). Each individually survives; together they form a pattern where the tooling looks gated but isn't. Bot-trio review history (Greptile especially) catches this exact category — "claim made in description, no test asserting it." We will eat at least one round of changes per PR if these aren't tightened.

Pacing is fine. The 2-open-at-a-time discipline is intact across cp-2/3/4/5; PR-7 + scope-flip + fixtures in cp-5 needs the ordering I noted in W3 but doesn't break the budget. Adapter audits §3 closing F-38 unlocks PR-3 cleanly. Once B1/B2 are addressed, this wave is ready to open cp-2 — and barring upstream-side surprises, every PR should land within the 4h median with at most one round of changes. **APPROVE-WITH-WARNINGS** — gate the cp-2 opening on B1/B2 close.
