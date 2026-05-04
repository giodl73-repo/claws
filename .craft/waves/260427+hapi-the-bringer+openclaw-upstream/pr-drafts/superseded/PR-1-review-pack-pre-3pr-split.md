# PR-1 Review Pack

Curated subset of supporting documents for upstream reviewers of PR-1
(`@openclaw/oc-paths` substrate + lint + doctor packages). The full
review trail is preserved internally; this index is what you actually
need to evaluate the change.

## What to read in order

1. **The PR body** — `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/pr-drafts/PR-1.md`
   - Strategic frame, change shape, test posture, risk + mitigation.
   - The AI-assisted disclosure (D2) calls out which surfaces are
     load-bearing.

2. **The substrate's pitfall taxonomy** — `packages/oc-paths-substrate/PITFALLS.md`
   - Every defended pitfall maps 1:1 to a test in
     `tests/scenarios/wave-23-pitfalls.test.ts`.
   - DEFERRED entries are honest about v1+ work; CALLER entries are
     honest about caller invariants we don't try to enforce.

3. **The contract docs**:
   - `packages/oc-paths-substrate/README.md` — package shape + verbs
   - `packages/oc-paths-lint/README.md` — `LintRule` + runner
   - `packages/oc-paths-doctor/README.md` — `OcPathFixerSpec` + adapter

## Optional deeper context

These exist for reviewers who want to see the design history and the
multi-persona panel review process. Skipping them does not make a
review less rigorous — the test suite is the source of truth for
behavior.

- **Panel review (R1 → R2 round-trip)**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/panels/cp-1/`
  - R1 entries from each persona (architect, gateway-eng, release-eng,
    repo-steward, compliance, testing).
  - R1-consolidated rolls them up; R2 entries fold the resolution
    decisions back; R2-consolidated is the closure record.
- **PR-DRAFT-1 panel pass**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/panels/cp-2/PR-DRAFT-1-consolidated.md`
  - Last-mile review against the actual PR body before submission.
- **Issue drafts** (one per PR in the proposed set):
  `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/issue-drafts/issue-pr1-workspace.md`
- **Plan**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/PROGRESS.md`
- **Carve consumer catalog**: `carve-consumer-catalog.md` — which
  upstream files this PR carves out.

## Panel-finding-to-commit mapping

The branch closes every load-bearing panel finding from the multi-
persona R1 → R2 review. Each commit prefix maps to a finding:

  - `A1` … `A7` — panel A (critical / correctness)
  - `B1` … `B5` — panel B (improvements / blockers)
  - `C1` … `C13` — panel C (care-and-feeding)
  - `D1` … — panel D (nits / hygiene)

`git log --oneline --reverse origin/main..HEAD` shows the full chain.

## What's intentionally not in this pack

- **The 3-package full test trace**: not bundled — run `npm test` in
  each of `packages/oc-paths-{substrate,lint,doctor}` and the CI run
  on this PR confirms the same numbers (substrate 666, lint 412,
  doctor 528).
- **Internal session logs / conversation history**: available on
  request. Excluded by default — they're voluminous and don't affect
  what landed.
- **Speculative future-work scaffolding**: speculative rules are
  tagged via `status: 'speculative'` (see C5); this is the only
  forward-looking surface that ships, and it's clearly opt-out via
  `disabledRuleIds`.

## How to give feedback

Inline PR comments are the canonical channel. For larger
architectural concerns, opening a GitHub Discussion against this
repo is welcome — link from the PR.
