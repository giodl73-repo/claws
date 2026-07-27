## Summary

- expose the active, configurable readiness criterion catalog through the read-only `readiness.catalog` Gateway method
- add `openclaw ready criteria list` and `openclaw ready criteria inspect <id>` with human and JSON output
- report core/plugin ownership, descriptions, current required/advisory selection, and selected-but-unregistered criteria

## Why

RFC 0018 lets operators select core and plugin criteria, but the running Gateway has no way to say which criteria are actually registered or who owns them. Operators otherwise have to infer valid IDs from config, plugin source, or a failed readiness result.

This catalog makes the readiness facility inspectable without turning inspection into another probe. It reads the same activation-pinned config and plugin-registry snapshot used by readiness evaluation, but it never invokes an evaluator or provider callback.

## Contract

`readiness.catalog` returns a versioned, sorted descriptor list. Each descriptor contains:

- stable criterion ID and human description
- core, plugin, or unresolved ownership
- `registered` availability
- current `required`, `advisory`, or `unselected` selection

A selected ID missing from the active registry remains present as `registered: false`. Registration source paths, callback functions, and plugin configuration are not projected.

## Stack

- Depends on fork PR #167 for the live `openclaw ready` CLI/RPC surface.
- Does not depend on Standard Hosting Profiles; direct `gateway.readiness` users receive the same catalog.

## Validation

- 78 focused catalog, CLI command, command-registration, method-registry, and Gateway-handler assertions pass locally.
- A live started-Gateway test calls both `ready` and `readiness.catalog` over authenticated RPC, covering startup-to-request-context wiring.
- [Clean exact-head validation](https://github.com/giodl73-repo/openclaw/actions/runs/30227102643) passes 82 focused assertions, formatting, and type-aware lint at `e0a826996730`.
- The clean proof found and fixed a missing lazy health-handler route for the new RPC before publication.
- Independent Codex review found no actionable correctness issues.

Local dependency hydration was blocked by the existing Microsoft package-proxy 404 for `@agentclientprotocol/sdk@1.3.0`. Focused tests used matching checked-out `@openclaw/fs-safe@0.4.7` and `@openclaw/proxyline@0.3.4` test dependencies; no lockfile or dependency changes are included.
