# OpenClaw Agent Skills

Portable local skills for OpenClaw maintenance work. Use these from Codex, Claude,
Copilot, or OpenClaw by asking the agent to load the named skill from this
directory.

## Available skills

| Skill | Use when |
| --- | --- |
| `openclaw-agent-router` | You want help choosing the right OpenClaw skill/profile for the current task. |
| `openclaw-pr-loop` | You need to keep active PRs green, respond to reviews, update proof, or file a PR. |
| `openclaw-issue-fixer` | You want to find or fix the next OpenClaw issue from triage through PR. |
| `openclaw-crabbox-proof` | You need WSL/Crabbox before-and-after evidence for an OpenClaw fix. |
| `openclaw-local-review` | You want a careful maintainer-style review before pushing or opening a PR. |

## Starter prompts

```text
Use the openclaw-agent-router skill from skills/ and tell me which profile to load.
```

```text
Use the openclaw-pr-loop skill from skills/ and get my OpenClaw fix PRs green.
```

```text
Use the openclaw-issue-fixer skill from skills/ and find the next no-collision issue to fix.
```

```text
Use the openclaw-crabbox-proof skill from skills/ and gather before/after evidence for this branch.
```

```text
Use the openclaw-local-review skill from skills/ and review this branch like an OpenClaw maintainer.
```
