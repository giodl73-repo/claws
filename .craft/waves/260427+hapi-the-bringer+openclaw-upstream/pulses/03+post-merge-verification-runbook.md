---
pulse: 03
slug: post-merge-verification-runbook
plan: claws-openclaw-upstream
checkpoint: cp-1
depends_on: []
governing_roles: [claws:claws-release-eng, claws:claws-repo-steward]
addresses_findings: [W2 from R1-consolidated]
addresses_headlines: [H1, H2, H3, H4, H5, H6]
---

# Pulse 03 · Post-Merge Verification Runbook

## Objective

Write `docs/upstream/guides/post-merge-verification.md` — runbook for confirming H1–H5 validation criteria against `openclaw/openclaw` trunk after each upstream PR merges. Per R1-consolidated W2: validation criteria say "MERGED at openclaw/openclaw" but don't specify HOW we verify. This pulse closes that gap with copy-paste-able commands.

## Deliverables

- [ ] `docs/upstream/guides/post-merge-verification.md` (NEW) — sections:
  - **§1 When to run** — immediately after each PR merges, NOT batched; before opening the next PR in the same wave
  - **§2 Per-PR verification recipe**
    - Confirm merge: `gh api repos/openclaw/openclaw/pulls/<N> --jq '.merged'` returns `true`
    - Capture merge SHA: `gh api repos/openclaw/openclaw/pulls/<N> --jq '.merge_commit_sha'`
    - Pull trunk: `git -C /c/src/openclaw-core fetch origin main && git -C /c/src/openclaw-core log -1 origin/main`
    - Run trunk-side validators (per-headline; details in §3)
    - Record merge SHA + verification verdict in `docs/upstream/CHANGELOG.md`
  - **§3 Per-headline validators**
    - **H1** (`@openclaw/workspace`): `pnpm --filter @openclaw/workspace test` against trunk; cross-OS canonicalize CI matrix green; `plugin-sdk-api-baseline.sha256` post-merge hash captured for diff
    - **H2** (`@openclaw/guardrails`): hash-chain integrity test green on trunk; approval-handle replay-resistance test green; zero `@microsoft/*` import gate green
    - **H3** (`@openclaw/policy`): deterministic-generation test green; emitted plugin loads + registers via `@openclaw/plugin-sdk` HEAD without modification
    - **H4** (`@openclaw/snap`): cross-host snapshotId stability matrix green; promote-audited test green; HTTP smoke (curl `/v1/healthz`)
    - **H5** (OC-4 + OC-7): regression test on `stripFrontMatter` round-trip; merger conjunctive test on three-plugin fixture
  - **§4 Codemod validation gate (W1 from R1-consolidated)** — after PR-3 merges, before declaring H5 done:
    - Pull trunk
    - Run our internal `@bic/openclaw-policy` + `@bic/openclaw-snap` build against trunk's widened `requireApproval` field
    - Confirm both compile clean; record verdict in CHANGELOG
  - **§5 Failure modes**
    - Trunk verification red: file an issue at openclaw/openclaw, halt the wave, do not open subsequent PRs in the chain
    - Codemod verification red: roll back internal consumers' adoption pending fix; subsequent PR-4 / PR-5 still openable since they don't use the OC-7 surface yet
  - **§6 CHANGELOG record format** — one line per PR:
    ```markdown
    - PR-1 @openclaw/workspace MERGED 2026-MM-DD at SHA `xxxxxxx`. H1 trunk-side validators GREEN. baseline-hash post: `sha256:...`.
    ```

## TDD Tests

Documentation only. Verification is human review + downstream wave consumption.

## Verification Gate

```bash
test -s "docs/upstream/guides/post-merge-verification.md"
grep -q "gh api repos/openclaw/openclaw/pulls" "docs/upstream/guides/post-merge-verification.md"
grep -q "Per-headline validators" "docs/upstream/guides/post-merge-verification.md"
grep -q "Codemod validation gate" "docs/upstream/guides/post-merge-verification.md"
```

## Key Constraints

- Verification runs IMMEDIATELY after merge, not batched. The next PR in the chain depends on the previous landing clean on trunk.
- Codemod gate (per W1) must pass BEFORE Wave C opens; PR-4 + PR-5 build against trunk's widened field.

## Scenario codes addressed

H1–H5 validation criteria from the plan.
