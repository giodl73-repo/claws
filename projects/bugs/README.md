# Bugs Project

Use this area for cross-cutting bugfix work that is not clearly owned by a
single feature project yet. Once a bugfix belongs to policy, doctor, feeds,
context-budget, oc-path, or ClawPilot, move the durable notes into that project
area and keep this file as the triage index.

## Purpose

- Track bug reports, reproduction notes, fix branches, and verification proof.
- Keep bugfixes small and tied to concrete failures.
- Avoid mixing bugfix work with feature stacks unless the PR is explicitly a
  follow-up to that stack.

## Bug Note Shape

```text
Bug:
Repo:
Issue / PR:
Local worktree:
Branch:
Observed failure:
Reproduction:
Fix scope:
Tests / proof:
Status:
Next action:
```

## Active Bugs

| Bug | Repo | Issue / PR | Status | Next action |
| --- | --- | --- | --- | --- |
| _None indexed yet_ | | | | |

## Rules

- Reproduce or identify the exact failing behavior before changing code.
- Prefer one bug per branch and PR.
- Keep unrelated refactors out of bugfix PRs.
- Update `SESSION.md` after filing, fixing, reviewing, or closing a bug.
