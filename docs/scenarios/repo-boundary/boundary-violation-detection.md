# boundary-violation-detection: Weekly cron catches illegal cross-boundary import

**Series**: repo-boundary
**Spec**: CL-13
**Type**: audit
**Criticality**: high

## Setup

- `bic/claws` and `bic/claws` both post-migration, boundary operational
- Weekly CI cron configured per §9 quarterly audit (run weekly for higher sensitivity)
- Test fixture: a feature branch in `bic/claws` introduces `require('@craftworks/agent-sdk')` inside `claws-serve/src/gateway.ts`

## Steps

1. Feature branch PR opens against `bic/claws` main
2. Pre-merge CI runs the boundary-check step: `rg "@craftworks/" claws-*/src/ claws-*/tests/` excluding license/attribution paths
3. Check fails with structured error:
   ```
   BOUNDARY_VIOLATION
     file: claws-serve/src/gateway.ts:42
     import: @craftworks/agent-sdk
     rule: CL-13 §2 (one-way dependency; claws MUST NOT consume @craftworks/*)
     reviewer_required: claws-repo-steward
   ```
4. CI status becomes red; PR blocked from merge
5. Parallel: weekly cron in `bic/claws` scans main; assert cron does not yet alert (since the violation is on a branch, not main)
6. Inverse fixture: `bic/claws` branch adds `require('@bic/claws-sdk')` to a runtime Gateway file (not a build-time consumer); craftworks weekly cron detects and fails

## Expected outcome

- PR is blocked at step 4 with the structured error — developer cannot bypass without `claws-repo-steward` override commit
- Error output is machine-readable (e.g., JSON on `stderr` in addition to human text) for dashboard integration
- Inverse-direction violation in craftworks is also detected (the boundary is one-way but both directions are audited)
- When violation is fixed and pushed, CI goes green without manual re-trigger

## Failure modes

- Boundary check skips a directory via an over-broad `.rgignore` → false negative; audit scope must be the full package source tree
- Check passes because the import is in a comment or docstring → grep must exclude comment-only matches OR reviewer must confirm. Acceptable initial implementation: flag all hits, let reviewer adjudicate.
- `claws-repo-steward` override issued without review → audit evidence must record the steward's SHA-signed approval
- Must NOT allow `@craftworks/*` imports in `claws/` even for test-only packages — the rule is unconditional per §2

## Evidence

- `boundary-violation.yaml` written to the PR's CI artifact folder on failure
- Weekly cron `boundary-cron-<week>.yaml` signed by the cron role key (release-eng), published to the audit bucket
- Retention: 4 quarters minimum

## Related

- CL-13 §2 (Dependency direction)
- CL-13 §9 (Post-migration boundary maintenance, quarterly cadence)
- Sibling: `cross-boundary-grep-clean`
