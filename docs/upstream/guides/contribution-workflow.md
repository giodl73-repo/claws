---
covers: [atom:UG, atom:UG/contribution-sequence]
---

# Contribution workflow

Author-side walkthrough of landing a change that crosses the `@bic/*`
→ `@openclaw/*` boundary.

## Step 1 · Write a plan

All cross-package governance changes start as a plan in
`.craft/plans/`. Use `/craft:plan "intent"` — the plan captures the
atom list, the pipeline, the stage overrides. See the craftworks
plan workflow.

## Step 2 · Run the wave

`/craft:run new <slug>` kicks off a wave directory with pulse plans
and checkpoints. Implementation happens in pulse branches, reviewed
via `/craft:review` at checkpoint boundaries.

## Step 3 · Sequence the PRs

Per [../specs/UG-upstream.md § PR sequencing](../specs/UG-upstream.md),
cross-package PRs land in this order:

1. `workspace`
2. `security` (reference docs, not code imports)
3. `guardrails`
4. `policy` or `snap`
5. `claws-sdk`
6. `claws`, `claws-test`, `claws-serve`

Out-of-order commits fail the sequencing lint. If your wave touches
`guardrails` AND `snap`, land `guardrails` first, then `snap`.

## Step 4 · Pre-merge guard

Any PR touching governance or decision code runs the R5 pre-merge
guard (see [../specs/UG-upstream.md § R5 pre-merge guard](../specs/UG-upstream.md)).
If the guard fails:

- **Policy diff flags new R5**: add operator sign-off line to PR
  description — `[X] R5 additions acknowledged by <operator>`
- **Scenario diff flags missing coverage**: add scenarios under the
  affected package's `scenarios/{SUBSPEC}/` directory
- **Trust-set impact**: add a signed approval file to
  `.audit/trust-set-changes/{pr-number}.json`

Guard failures cannot be overridden — fix the underlying issue.

## Step 5 · Review

Upstream core reviewers for cross-package changes are:

- **Johan** (always; primary reviewer for governance boundary)
- **One area architect** (domain-specific — e.g., Agnar for platform,
  Ligia for ops, Priya for skills)

Review happens on the PR; comments resolve before merge.

## Step 6 · Merge + scope-flip path

Internal merges land on `main` via the standard PR flow. When a
package is ready for `@openclaw/*` graduation:

1. File a scope-flip PR (see [../specs/UG-upstream.md § Scope-flip at
   publish](../specs/UG-upstream.md))
2. Confirm behaviour-diff is empty via the guard
3. Merge + publish

See [`repo/specs/RB-repo-boundary.md`](../../repo/specs/RB-repo-boundary.md)
for the package-location rules that apply before and after the scope
flip.
