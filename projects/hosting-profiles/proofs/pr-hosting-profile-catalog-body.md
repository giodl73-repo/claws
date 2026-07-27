## Summary

- export immutable descriptors from the built-in Standard Hosting Profile catalog
- add read-only `openclaw hosting profiles list|inspect` commands with human and versioned JSON output
- prove catalog condition names remain aligned with the runtime predicates used by readiness

## Why

Standard Hosting Profiles are intended to be a concrete support promise, but operators and release tooling should not need to copy profile names, conditions, or readiness selectors from documentation. This slice makes the definitions OpenClaw already owns directly inspectable without loading configuration, starting plugins, or contacting a Gateway.

`list` gives a concise view of the four supported runtime postures. `inspect` returns the complete descriptor: profile-owned conditions plus required and advisory RFC 0018 criteria. Active selection is deliberately out of scope; the running Gateway continues to report that through canonical readiness.

## Contract

- JSON list output is `{ contractVersion: 1, profiles: [...] }`.
- JSON inspect output is `{ contractVersion: 1, profile: {...} }`.
- Returned descriptors are copies and cannot mutate the shipped definitions.
- Catalog condition names are tested against `buildHostingProfileConditions`, preventing release/support inventory drift.
- The commands are observationally inert and add no evaluator, Gateway RPC, config, plugin activation, or persistence surface.

## Stack

- Depends on [openclaw/openclaw#113422](https://github.com/openclaw/openclaw/pull/113422) at exact base `e9c1988c5e59`.
- Implements the first RFC 0023 operator facility. Live profile validation and release conformance reporting remain separate follow-ups.

## Validation

- 35 focused profile, command, CLI-registration, and command-registry assertions pass.
- Core TypeScript checking, formatting, type-aware lint, docs inventory, and `git diff --check` pass.
- Codex review found and prompted one accepted fix: table counts are now explicit strings matching the terminal-table API. The post-fix review reports no actionable correctness issues.
- [Exact-head GitHub Actions proof](https://github.com/giodl73-repo/openclaw/actions/runs/30273004269) passes all gates against implementation head `99449434cb4c` with immutable-parent verification.
