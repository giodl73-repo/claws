---
pulse: 57
slug: emitter-scope-prefix
plan: claws-pre-extraction-packaging
depends_on: [56]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/policy && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/policy && npx tsc --noEmit"
checkpoint: 12
---

# Pulse 57: Emitter Scope-Prefix Flag

## Objective

Add `--scope` flag to `claws policy generate` (and library-level `emit({ scopePrefix })`). Default `@bic/openclaw-*`; `--scope @openclaw` flips emitted gateway-plugin.ts imports to upstream names for pre-submission builds. Byte-identical policy-ir.json + audit-manifest.json across scopes.

## Deliverables

- [x] `claws policy generate --scope @openclaw` flag accepted; defaults to `@bic/openclaw`
- [x] Library-level `emit({ scopePrefix })` option wired through emit-plugin.ts
- [x] L0 tests itemized: 2 argv parsing (default + explicit --scope), 2 scope-prefix string substitution in import lines, 2 byte-parity on policy-ir.json + audit-manifest.json across scopes = 6 L0
- [x] L1 tests itemized: 1 end-to-end `generate --scope @openclaw` fixture run producing byte-different gateway-plugin.ts (imports only) vs default; 1 round-trip validation (scope-prefixed import paths resolvable against a mock module resolver) = 2 L1

## Acceptance Criteria

- [x] --scope flag accepted + defaults to @bic/openclaw
- [x] policy-ir.json + audit-manifest.json byte-identical across scopes
- [x] gateway-plugin.ts byte-differs only in import lines
- [x] L0: 6; L1: 2

## Governing Roles

- `craft:architect` — scope-prefix plumbing through emit-plugin.ts
- `claws:gateway-eng` — emitted imports resolve correctly

## Dependencies

CP-11 gate (P56) passed. Policy package exists with emit pipeline.

## Test Gates

- [x] L0: 6 itemized (6 passing in `tests/scope-prefix.unit.test.ts`)
- [x] L1: 2 end-to-end fixture (2 passing in `tests/scope-prefix.integration.test.ts`)
- [x] `cd claws-sdk/packages/policy && npx vitest run --coverage` — 209 pass, 100% on `src/emit/scope.ts`, per-file thresholds 95/90/95/95 met
- [x] `cd claws-sdk/packages/policy && npx tsc --noEmit` — clean
