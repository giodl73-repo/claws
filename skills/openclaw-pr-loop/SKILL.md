---
name: openclaw-pr-loop
description: Manage OpenClaw PR loops across active PRs, CI checks, reviewer comments, branch hygiene, real behavior proof, and PR filing. Use when asked to keep OpenClaw PRs green, prepare or update PR bodies, respond to review, rebase/refresh branches, or file a completed fix PR.
---

# OpenClaw PR Loop

Use this skill for active OpenClaw contribution operations: tracking PRs,
keeping them green, updating proof, and applying small review fixes without
losing branch hygiene.

## Quick start

From `C:\src\claws-hapi`:

```powershell
.\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1
```

For a single PR:

```powershell
gh pr view <number> --repo openclaw/openclaw --json url,title,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews
gh pr checks <number> --repo openclaw/openclaw
```

## Operating rules

1. Keep draft PRs draft unless the user explicitly says to mark ready.
2. Never force-push, squash, or retarget stacked branches without confirming the
   intended branch and stack.
3. Treat unrelated CI failures as base noise only after checking logs and proving
   the failure points outside changed files.
4. Prefer small reviewable fixes over broad cleanup.
5. Keep PR bodies accurate after every meaningful change: summary, validation,
   real behavior proof, not-tested gaps, issue links, and follow-up PR links.
6. Before filing, run a maintainer-style local review or load
   `openclaw-local-review`.

## PR loop

1. Snapshot open PRs and checks.
2. Read failing logs or reviewer comments directly.
3. Classify each item as:
   - `ours`: changed-file failure, proof body issue, docs drift, or test gap.
   - `base`: unrelated shard failure not caused by our branch.
   - `maintainer`: architecture question, scope concern, or approval request.
4. Fix `ours`, summarize `base`, and queue `maintainer` questions for the user.
5. Rerun targeted checks first, then changed-file checks when code changed.
6. Update the PR body with exact evidence and validation.

## Real behavior proof

Read `references/real-behavior-proof.md` before editing PR proof sections.
OpenClaw's proof gate expects exact labels.

## Useful commands

```powershell
# Open PRs across the usual repos
.\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1

# One PR checks
gh pr checks <number> --repo openclaw/openclaw

# One PR comments and reviews
gh pr view <number> --repo openclaw/openclaw --json comments,reviews

# Rerun failed jobs by run id
gh run rerun <run-id> --repo openclaw/openclaw --failed
```
