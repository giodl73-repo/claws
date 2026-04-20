---
pulse: 75
slug: subtree-disposition
plan: claws-pre-extraction-packaging
depends_on: [51, 52, 53, 54]
governing_roles: [craft:architect, claws:claws-repo-steward]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    []
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 75: Non-Consolidated claws-sdk/src/ Subtree Disposition (P54 split)

## Objective

**Split from P54 per architect M1**. Disposition for 23 non-consolidated `claws-sdk/src/` subtrees plus `compiler/` (15-subdir active tree per steward M2 ground-truth). Each subtree gets a concrete disposition: lift-as-claws-internal, merge-into-package, drop, or split. Result written to `claws-sdk/DISPOSITION.md`; CP-11 gate (P56) verifies no subtree un-categorized.

## Deliverables

- [ ] `claws-sdk/DISPOSITION.md` created — table mapping every `claws-sdk/src/` non-consolidated subtree to its disposition
- [ ] Dispositions for the 23 R1-identified subtrees: `adapter/`, `amend/`, `annotate/`, `audit/`, `config/`, `context/`, `detect/`, `doctor/`, `fleet/`, `init/`, `ir/`, `keys/`, `maker/`, `optimize/`, `protect/`, `publish/`, `scaffold/`, `snapshot/`, `util/`, `watch/`, `workspace-edit/`, + 2 top-level .ts files (as plan table)
- [ ] **Disposition for `compiler/` (steward M2)**: 15-subdir active tree. `compiler/emit/` content merges into `claws-sdk/packages/policy/src/emit/` via P51 (already consumed). Remaining 14 subdirs (parser, optimizer, dialect/*, etc.) lift as `bic/claws`-internal — not upstreamable; stay in `claws-sdk/src/compiler/` post-consolidation
- [ ] Each disposition includes:
  - **lift-as-claws-internal**: subtree stays in claws-sdk/src/ post-Horus; not upstreamed; reason documented
  - **merge-into-package**: subtree absorbed into one of the 4 target packages during this pulse; moves executed
  - **drop**: subtree removed entirely (dead code)
  - **split**: subtree has multiple fates — explicit file-list breakdown
- [ ] Actual merges executed where disposition is "merge-into-package" (doctor/ + upgrade/ + watch/ merge into `packages/policy/src/cli-handlers/`; publish/ + snapshot/ merge into `packages/snap/`; audit/ if overlap with guardrails/audit); post-merge diff zero in source subtree
- [ ] Post-pulse: every file under `claws-sdk/src/` that ISN'T in one of the 4 consolidated directories (workspace, compile, emit, compliance, governance) is either (a) listed in DISPOSITION.md with a disposition, or (b) was dropped as dead code
- [ ] Typecheck green across claws-sdk after all moves

## Acceptance Criteria

- DISPOSITION.md complete: every non-consolidated subtree categorized
- Merge-into-package moves executed (files moved, imports updated)
- compiler/emit/ merged into packages/policy/src/emit/ cleanly
- Zero un-categorized files under claws-sdk/src/ post-pulse

## Governing Roles

- `craft:architect` — disposition discipline + merge discipline
- `claws:claws-repo-steward` — ground-truth verification (which subtrees are active vs dead)

## Dependencies

P51 (policy consolidation; policy emit subtree is the merge target for compiler/emit/) + P52 + P53 + P54 (@craftworks sweep; so files being moved don't carry @craftworks deps).

## Test Gates

Typecheck green. DISPOSITION.md completeness checked in P56 gate.
