# Policy Session Context

## Agent Start

1. Read this file.
2. Read `projects/policy/README.md`.
3. For OpenClaw PR work, use the OpenClaw PR loop/testing/review skills as
   appropriate.
4. Check live PR and branch state before changing code or PR bodies.

## Baseline

- Area: Policy conformance, named evidence files, RFC addenda, and Lobster
  managed policy baselines.
- Primary repos: `openclaw/openclaw`, `openclaw/rfcs`, `bic/lobster`.
- Main tracking file: `projects/policy/README.md`.
- Current policy focus: `exec-approvals.json` evidence and rules, with the
  next P1 stack layer covering `sandbox.allowModes`.
- Active OpenClaw PR: https://github.com/openclaw/openclaw/pull/90003.
- Active RFC PR: https://github.com/openclaw/rfcs/pull/6.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Keep policy work scoped to file-based evidence, especially the
  named `exec-approvals.json` artifact, without broadening config or plugin
  surface.
- Active branch / PR: `policy-file-stores-exec` / OpenClaw #90003; stacked
  draft `policy-sandbox-allow-modes` / giodl73-repo/openclaw #3.
- Known dirty state: check the target worktree before editing.
- Blocking question: none recorded.

## Resume Checklist

- Run: check GitHub PR state for #90003 and RFC #6.
- Verify: confirm branch/worktree state before edits.
- Review: keep examples concrete and policy-scoped.
- Update: this file and `projects/policy/README.md` after meaningful changes.

## Guardrails

- Do not add config surface or plugin surface unless explicitly requested.
- Keep named product artifacts as file evidence, not runtime calls.
- Keep RFC changes as addenda, not rewrites.
- Put OpenClaw code in OpenClaw worktrees and RFC text in RFC worktrees.

## Open Threads

- Keep the PR body concrete with redacted evidence examples and policy rule
  examples.
- Track whether ClawSweeper or Codex review finds new policy issues.
- Keep the P2 config/plugin coverage bundle separate from this P1 policy stack.
