## Summary

- explain the identity and lifetime of subjects behind non-passing readiness conditions
- include both primary and related affected subjects
- preserve canonical JSON, ready-state human output, exit behavior, and legacy Gateway compatibility

## Why

The canonical result already says which condition failed and names its subject. Operators also need to know whether that subject is the same lifetime, a replacement, or a revised generation when investigating a red readiness signal.

Human output now adds a compact `Affected subject lifetimes` section only when a condition is `False` or `Unknown`. It reports the subject's existing kind, ID, generation, and parent reference. A healthy result stays concise, and machine consumers continue receiving the unchanged canonical result through `--json`.

## Stack

- Depends on fork PR #171 for bounded `openclaw ready --wait`.
- Uses only RFC 0018 identity and condition fields; it does not depend on Standard Hosting Profiles.
- Adds no protocol, config, persistence, or evaluator surface.

## Validation

- [Exact-head GitHub proof](https://github.com/giodl73-repo/openclaw/actions/runs/30268030672) passes formatting, 61 focused assertions, and type-aware lint against immutable implementation parent `3010730e9f6a`.
- 61 focused command and CLI-registration assertions pass.
- Tests cover required failures, related affected subjects, healthy-output suppression, legacy results, unchanged JSON, wait, watch, and catalog behavior.
- Formatting, type-aware lint, docs inventory, and `git diff --check` pass.
- `codex review --uncommitted` reports no actionable findings. Its nested test attempt was blocked by its read-only sandbox lock path; the same focused suites passed immediately before review in the owning worktree.
