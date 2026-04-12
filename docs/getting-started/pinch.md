# How do I check my agent?

<!-- atom:pinch (C30) -->

`claws pinch` checks your workspace against governance policies.
Think of it as `npm test` for governance. You'll run it constantly.

## Run it

```
$ claws pinch

  G-CLASS      Tool risk classification          PASS
  G-ELICIT     OBO elicitation gates             PASS
  G-A2A-TRUST  Inter-agent trust boundaries      FAIL  [HIGH]
      agents.yaml:14 -- agent "research" trusts "drafting" but no trust group defined
      Fix: add trust-group declaration in agents.yaml or claws.json
  G-INPUT      Input sanitization                PASS
  G-BUDGET     Token budget enforcement          PASS

  1 violation (1 high) in 0.3s
```

Each line is one governance rule. Green = pass, red = fail. The number of rules checked depends on the workspace's tools, agents, and policies. claws defines 29 governance rules across 8 rule groups (see CL-02); the actual count varies per workspace because not all rules apply to every configuration.

## Reading a violation

When a rule fails, claws tells you three things:

```
  G-A2A-TRUST  Inter-agent trust boundaries      FAIL  [HIGH]
      agents.yaml:14 -- agent "research" trusts "drafting" but no trust group defined
      Fix: add trust-group declaration in agents.yaml or claws.json
```

1. **Where**: `agents.yaml:14` -- file and line
2. **What**: the problem in plain English
3. **How to fix**: a concrete action you can take now

Colors by severity: red = critical/high, yellow = medium, dim = low.

## Auto-fix with `--fix`

Some violations have automatic fixes:

```
$ claws pinch --fix

  G-INPUT      Input sanitization                FIXED
      TOOLS.md:47 -- added @claws/security sanitizer stub for "web-fetch"

  1 fixed, 1 remaining. Re-run `claws pinch` to verify.
```

The remaining violation needs a manual fix -- claws already told you how.

## Pre-commit hook with `--staged`

Catch violations before they're committed:

```
$ git add TOOLS.md agents.yaml
$ claws pinch --staged

  All 15 policy checks passed in 0.2s
```

Wire it into git:

```bash
# .git/hooks/pre-commit (or use husky/lint-staged)
claws pinch --staged --quiet
```

`--quiet` suppresses passing rules. Clean commits are silent.

## Other flags

- `claws pinch --watch` -- re-checks on every file save. Keep it running while you edit.
- `claws pinch --strict` -- promotes warnings to errors. Use it in CI.

## Quick reference

| Command | When to use it |
|---------|---------------|
| `claws pinch` | Quick check, any time |
| `claws pinch --fix` | Auto-fix what can be fixed |
| `claws pinch --staged` | Pre-commit hook |
| `claws pinch --watch` | Live feedback while editing |
| `claws pinch --strict` | CI, zero-tolerance mode |

Pinch runs in under a second. Run it constantly.
