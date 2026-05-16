---
name: openclaw-issue-fixer
description: Find, triage, reproduce, fix, validate, and prepare OpenClaw issue fixes. Use when asked to find the next issue, fix an OpenClaw bug, avoid duplicate PRs, or take an issue from report to PR-ready branch.
---

# OpenClaw Issue Fixer

Use this skill when starting a new OpenClaw bugfix from an issue or candidate
area.

## Workflow

1. Identify the issue and confirm there is no existing active PR collision.
2. Read the issue, related labels, linked PRs, and nearby code.
3. Reproduce the behavior before changing code. Prefer WSL source repro first.
4. Make the smallest complete fix that addresses the root cause.
5. Add a regression test that fails on `origin/main` and passes on the branch.
6. Run focused tests, formatting, `git diff --check`, and `pnpm check:changed`.
7. Run `openclaw-local-review` before filing.
8. Run `openclaw-crabbox-proof` or equivalent live proof before PR body updates.
9. File or update the PR with the exact real behavior proof schema.

## OpenClaw WSL conventions

Use the WSL checkout for OpenClaw code:

```powershell
wsl -d Ubuntu-24.04 -- bash -lc 'cd /root/src/openclaw-branches/base && git status --short --branch'
```

Common branch pattern:

```bash
git fetch origin main
git switch -c fix-short-description-ISSUE origin/main
```

## Triage rules

- Skip issues that already have an active PR unless the user asks to repair that
  PR.
- Prefer narrow regressions with clear reproduction paths.
- Do not start broad API/config redesigns without user confirmation.
- Preserve unrelated worktree changes.
- Keep evidence before and after the fix.

## PR-ready definition

A fix is PR-ready only when:

- The issue behavior is reproduced before the patch.
- The branch shows corrected behavior after the patch.
- Arbitrary adjacent behavior is not loosened.
- Focused and changed-file checks pass.
- A local maintainer-style review found no unresolved substantive issues.
- The PR body can include real behavior proof with exact labels.
