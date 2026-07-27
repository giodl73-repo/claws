## Summary

- add `openclaw hosting profiles validate [profile]` over the running Gateway's canonical `ready` result
- distinguish structural profile conformance from current serving readiness while exiting nonzero for either failure
- emit a versioned JSON artifact that embeds the canonical readiness evidence

## Why

Catalog discovery tells operators what OpenClaw ships. Validation answers the next operational question: whether a running Gateway selected the expected Standard Hosting Profile, reports the matching contract version and required profile conditions, and is currently ready.

The command does not load local config or plugins, infer effective state, reproduce profile predicates, or create another evaluator. It calls `ready` once and validates the returned canonical evidence.

## Contract

```console
openclaw hosting profiles validate
openclaw hosting profiles validate container --json
```

- With no argument, validation uses the exact active profile reported by the Gateway.
- With an argument, the active profile must match it.
- `conformant` covers readiness schema integrity, exact profile identity, profile contract version, and required profile-condition coverage.
- `ready` is copied only from structurally valid canonical evidence.
- A conformant but non-ready runtime remains distinguishable and exits nonzero.
- Gateway errors, malformed evidence, unknown profile IDs, version mismatches, and missing/duplicate/non-required profile conditions fail closed with stable findings.

## Stack

- Depends on [profile catalog PR 173](https://github.com/giodl73-repo/openclaw/pull/173) at exact base `99449434cb4c`.
- Implements the second RFC 0023 operator facility. Portable release-conformance artifacts remain a follow-up.

## Validation

- 51 focused profile, validation, CLI-registration, command-registry, and protocol-schema assertions pass.
- Core TypeScript checking, formatting, type-aware lint, and `git diff --check` pass.
- Codex review found and prompted three accepted fail-closed fixes: complete canonical condition validation, exact Gateway profile identifiers, and suppression of `ready: true` for malformed evidence. The final review reports no actionable correctness defects.
- [Exact-head GitHub Actions proof](https://github.com/giodl73-repo/openclaw/actions/runs/30275850209) verifies the immutable implementation parent and runs the complete gate.
