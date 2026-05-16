---
name: openclaw-pr-loop
description: Manage OpenClaw contribution loops across open PRs, reviewer comments, CI gates, real behavior proof, PR drafts, branch hygiene, and CodeClaw/live validation. Use when asked to check or keep OpenClaw PRs green, prepare or update PR bodies, respond to ClawSweeper/reviewer feedback, rebase branches, gather behavior proof, test with CodeClaw, or coordinate OpenClaw/lobster/lobster-docs PR status.
---

# OpenClaw PR Loop

Use this skill for ongoing OpenClaw contribution operations: tracking PRs,
keeping them green, updating proof, and applying small review fixes without
losing branch hygiene.

## Quick Start

1. Snapshot open PRs:

   ```powershell
   .\.codex\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1
   ```

2. For any failing or stale PR, inspect exact details before changing code:

   ```powershell
   gh pr view <number> --repo openclaw/openclaw --json url,title,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews
   gh pr checks <number> --repo openclaw/openclaw
   ```

3. Fix only concrete reviewer or CI issues. Do not churn branches just to
   appear active.

4. After code changes, run targeted tests first, then repo-required format,
   lint, changed-file, and proof gates.

## Operating Rules

- Keep draft PRs draft unless the user explicitly says to mark ready.
- Never force-push or squash without confirming the intended branch and stack.
- Treat unrelated CI shard failures as base noise only after checking the log
  points outside the changed files.
- Prefer small, reviewable fixes over broad cleanup.
- Keep PR bodies accurate after every meaningful change: summary, validation,
  real behavior proof, not-tested gaps, issue links, and follow-up PR links.
- If a PR depends on another branch, confirm the base/head relationship before
  rebasing.
- Use local maintainer notes in `C:\src\lobster-docs\project-lobster-vault\Tech\OpenClaw`
  when reviewer expectations or proof schemas are unclear.

## Review Loop

For each active PR:

1. Check status checks, review decision, labels, mergeability, and new comments.
2. Read failing job logs or reviewer comments directly.
3. Classify each item:
   - `ours`: changed-file failure, proof body issue, docs drift, test gap.
   - `base`: unrelated shard failing without touching our files.
   - `maintainer`: architectural question or approval request.
4. Fix `ours`, summarize `base`, and queue `maintainer` questions for the user.
5. Rerun only the failed or targeted checks unless the change is broad.

## Real Behavior Proof

Read `references/real-behavior-proof.md` before editing PR proof sections.
OpenClaw's proof gate accepts exact field labels, not shortened aliases.

## CodeClaw / Live Proof

Use CodeClaw when a PR needs live OpenClaw behavior proof rather than a source
harness proof. Before using it:

1. Confirm which branch or commit should be deployed.
2. Record the OpenClaw version, branch SHA, environment, and command path.
3. Capture terminal output, screenshot, runtime log, or linked artifact.
4. Put the evidence in the PR body using the Real behavior proof schema.

If CodeClaw setup details are needed, read the local deployment notes before
issuing cloud or remote commands:

```powershell
Get-Content C:\src\claws-hapi\CLAWCODE-DEPLOYMENT.md
```

## Useful Commands

```powershell
# Open PRs across the usual repos
.\.codex\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1

# One PR checks
gh pr checks <number> --repo openclaw/openclaw

# One PR comments and reviews
gh pr view <number> --repo openclaw/openclaw --json comments,reviews

# Real behavior proof rerun by run id
gh run rerun <run-id> --repo openclaw/openclaw --failed
```

