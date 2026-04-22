---
pulse: 70
slug: time-travel-api
plan: claws-cap-integration
depends_on: [32, 69]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 70: Time-Travel API

## Objective

`?at=` parameter on any Layer 1 GET endpoint to query historical governance state.
Three addressing modes: version (`?at=v38`), time (`?at=2026-04-14`), and named
snapshot (`?at=snap:pre-upgrade`).

Backed by three existing systems:

1. **Compilation forest per-phase cache** (pulse 32) — every successful compilation
   stores GovernanceIR + per-phase outputs (parse, extract, analyze, emit) keyed by
   the workspace version number. The time-travel API reads from this cache directly.
   The version-store is NOT a separate copy — it IS the compilation forest cache
   with a version-indexed lookup layer on top.

2. **Workspace versioning** (pulse 69) — monotonic version counter incremented on
   every successful write. Maps version → { fileHashes, compiledAt, GovernanceIR hash }.
   The version-store uses this index to find the right forest cache entry.

3. **claws snap** (Thoth CP-3) — named snapshots saved to `.claws/snapshots/{name}/`.
   Each snapshot is a full workspace state (files + compiled IR + cache). The
   version-resolver reads named snapshots from this directory.

Business logic in claws-sdk (version resolver, forest reader). Route middleware
in claws-serve.

## Deliverables

- [ ] `claws-sdk/src/workspace/version-resolver.ts` — Resolves `?at=` parameter to a specific cached GovernanceIR. Three modes: (a) version number → lookup in compilation forest cache via version index, (b) ISO date → find nearest version by compiledAt timestamp, (c) snapshot name → read from `.claws/snapshots/{name}/`. Returns the full GovernanceIR from the forest cache entry, not a separate copy.
- [ ] `claws-sdk/src/workspace/version-store.ts` — Version index over the compilation forest cache. Maps version number → forest cache entry (GovernanceIR + per-phase outputs + file hashes + timestamp). Bounded to last 100 versions (configurable). When the forest evicts an old phase cache entry, the version-store marks that version as `evicted` (returns 404 with `reason: 'version_evicted'`). NOT a separate GovernanceIR copy — reads directly from the forest.
- [ ] `claws-serve/src/middleware/time-travel.ts` — Middleware that intercepts `?at=` on GET requests, resolves to cached state, serves from cache instead of live workspace.
- [ ] `claws-sdk/tests/workspace/version-resolver.unit.test.ts` — L0: 8 tests (version lookup, date lookup, snapshot lookup, out-of-range version, date between versions → nearest, snapshot not found, eviction, restart persistence).
- [ ] `claws-serve/tests/middleware/time-travel.integration.test.ts` — L1: 4 tests (GET with ?at=v1, ?at=date, ?at=snap:name, ?at without value → 400).
- [ ] `claws-serve/tests/e2e/time-travel.e2e.test.ts` — L2: 2 tests (PATCH → version increments → GET ?at=old_version returns old state, GET ?at=snap after claws snap save).

## Acceptance Criteria

- [ ] GET /api/oc/TOOLS.md?at=v38 returns GovernanceIR from version 38 (not current)
- [ ] GET /api/oc/TOOLS.md?at=2026-04-14 resolves to nearest cached version
- [ ] GET /api/oc/TOOLS.md?at=snap:pre-upgrade returns snapshot state
- [ ] Out-of-range version returns 404 with available version range
- [ ] ?at= only works on GET (PATCH with ?at= returns 400)
- [ ] Version store bounded to 100 versions (configurable)
- [ ] Historical responses include `X-Governance-Version` header

## Test Gates

- [ ] L0 unit (8 tests): version resolver with all three modes + edge cases
- [ ] L1 integration (4 tests): middleware intercepts and serves cached state
- [ ] L2 e2e (2 tests): full PATCH → version → time-travel round-trip
