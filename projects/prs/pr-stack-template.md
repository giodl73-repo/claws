# PR Stack Template

Use this for OpenClaw, Lobster, RFC, and docs stacks. GitHub remains the live
source of truth; this note records operator state and handoff context.

## Stack

| Order | Repo | PR  | Branch | Base | Purpose | Status |
| ----- | ---- | --- | ------ | ---- | ------- | ------ |
| 1     |      |     |        |      |         |        |

## Current Head

| Branch | SHA | Local Worktree |
| ------ | --- | -------------- |
|        |     |                |

## Blockers

| PR  | Blocker | Owner | Next Action |
| --- | ------- | ----- | ----------- |
|     |         |       |             |

## Proof

| PR  | Local Proof | CI/External Proof | Gaps |
| --- | ----------- | ----------------- | ---- |
|     |             |                   |      |

## Review Signals

| PR  | Reviewer/Bot | Signal | Follow-Up |
| --- | ------------ | ------ | --------- |
|     |              |        |           |

## Commands

```powershell
gh pr view <number> --repo <owner>/<repo> --json title,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,comments,reviews
gh pr checks <number> --repo <owner>/<repo>
```
