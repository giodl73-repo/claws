---
name: openclaw-local-review
description: Perform a careful maintainer-style local review of an OpenClaw branch before pushing or filing a PR. Use when asked to review a fix, check security boundaries, find test gaps, or anticipate maintainer objections.
---

# OpenClaw Local Review

Use this skill after implementation and before PR filing or force-push.

## Review checklist

1. Read the full diff with `git --no-pager diff`.
2. Confirm the fix matches the issue and does not solve unrelated problems.
3. Check boundary and security implications:
   - path guards
   - auth scopes
   - plugin bootstrap behavior
   - sandbox/host separation
   - write vs read permissions
4. Verify the regression test would fail before the fix.
5. Verify adjacent negative cases remain covered.
6. Confirm runtime call sites are wired consistently.
7. Check PR-body proof can honestly describe what was and was not tested.

## Review output

Report only substantive findings:

```text
file:line - issue
Why it matters.
Suggested fix.
```

If no findings remain, say that the review found no substantive blockers and
list the most important validation already run.

## Bias

Act like a skeptical OpenClaw maintainer. Prefer catching one real boundary bug
over approving a larger-looking change. Do not comment on style unless it could
affect correctness or reviewability.
