---
checkpoint: 3
name: "Package Split — Create @bic Packages, API Contract, Cache CLI"
pulse_range: [13, 14, 15, 16, 79]
depends_on_cp: 2
review_panel: [craft:architect, claws:platform-eng, craft:type-system, craft:conformance]
tag: ra-cp-3
---

# CP-3: Package Split — Create @bic Packages, API Contract, Cache CLI

## Summary

Ship the `@bic/claws-sdk` (MIT at source level) and `@bic/claws-sdk`
(enterprise extension) packages, with API stability contract tests. Add the
`claws cache` operator CLI (stats/prune/clear/list). Strictly sequential for
pulses 13→14→15→16; pulse 79 runs in parallel (depends only on pulse 11 from
CP-2).

**Scope note**: Pulses 17 (extract 10 `@craftworks/*` dialect packages) and
pulse 18 (extract 7 per-platform emitter plugins) have been **cut from Ra**.
claws has zero runtime dependency on `@craftworks/` internals — claws-sdk is
standalone after pulse 13, the `@bic/claws-sdk` bundles claws-sdk via tsup
`noExternal`, and claws's governance rules use hand-coded TypeScript (no RELAX
DSL). The @craftworks package split is an independent craftworks-internal
refactor and has been deferred to a future `craftworks-modularization` wave.

## Dispatch Plan

### Batch 1

| Agent | Pulse | Slug | Depends on | Notes | Status |
|-------|-------|------|------------|-------|--------|
| alpha | 13 | remove-craftworks-deps | 12 | Strip all @craftworks imports | ✅ 7d80093c9 |

### Batch 2 (depends on batch 1)

| Agent | Pulse | Slug | Depends on | Notes | Status |
|-------|-------|------|------------|-------|--------|
| bravo | 14 | create-claws-compiler-package | 13 | Create @bic/claws-sdk package | ✅ 724ec3cc5 |

### Batch 3 (depends on batch 2)

| Agent | Pulse | Slug | Depends on | Notes | Status |
|-------|-------|------|------------|-------|--------|
| delta | 15 | create-craftworks-extension | 14 | Create @bic/claws-sdk extension | ✅ bc1f38614 |

### Batch 4 (depends on batch 3)

| Agent | Pulse | Slug | Depends on | Notes | Status |
|-------|-------|------|------------|-------|--------|
| foxtrot | 16 | api-contract-tests | 14, 15 | Contract tests on @bic/claws-sdk | ✅ 339199063 |

### Batch 5 — Compile DX (parallel; depends only on pulse 11 from CP-2)

| Agent | Pulse | Slug | Depends on | Notes | Status |
|-------|-------|------|------------|-------|--------|
| golf | 79 | cache-cli | 11 | `claws cache {stats, prune, clear, list}` operator commands | ✅ a1ef824c3 |

Pulse 79 is independent of the @bic package work — it extends the cache API from pulse 11. Ran in parallel with Batches 1-4. Breaking CLI rename approved by user: legacy `claws cache` (LLM extraction cache) → `claws extract-cache`; new operator `claws cache {stats,prune,clear,list}` takes the canonical name. No aliases preserved.

### R1 Fix Commits

After R1 review, 10 Major findings were dispatched to 3 parallel fix clusters:

| Cluster | Agent | Fix commit(s) | R1 findings resolved |
|---------|-------|---------------|----------------------|
| A — @bic/claws-sdk hygiene | november | `6f476b6e1` | M01 bundling, M02 exports, M03 engines, M04 unused deps, M09 SOC2Evidence rename |
| B — @bic/claws-sdk contract | oscar | `c13e9de5e` | M05 dts leak, M08 api-diff structural signatures |
| C — Root + cache boundary + pin | papa | `174af227f`, `e9e7bd151`, `2117f72fe` | M06 root build, M07 cache CLI boundary, M10 integrity pin |
| (aux) — claws-cli test failures | hotel | `44d5a1fd0`, `b2c8ca66f` | e2e cache-roundtrip flake, secrets get wrong-passphrase regression |

R2 verified all 10 R1 Majors RESOLVED. Zero new Majors. See `panels/cp-3/R2-consolidated.md`.

## Review Panel

- `craft:architect` — package boundary design, dependency graph
- `claws:platform-eng` — SDK extraction patterns, npm package structure
- `craft:type-system` — API surface types, contract correctness
- `craft:conformance` — contract test coverage, API guarantees

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/type-system.md`
- `.craft/roles/craft/conformance.md`
- `.craft/roles/claws/platform-eng.md`

## Coverage Bar

All claws packages: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [x] Pulse 13 committed with passing tests (7d80093c9)
- [x] Pulse 14 committed with passing tests (724ec3cc5)
- [x] Pulse 15 committed with passing tests (bc1f38614)
- [x] Pulse 16 committed with passing tests (339199063)
- [x] Pulse 79 committed with passing tests (a1ef824c3)
- [x] `npm run build` exits 0 from repo root (after M06 fix in 174af227f — root build now invokes both @bic packages)
- [x] `tsc --noEmit` exits 0 in all claws packages
- [x] Per-file coverage thresholds met
- [x] Review passes with no Major findings (R1 surfaced 10 Majors; all RESOLVED in R2 via fix commits 6f476b6e1, c13e9de5e, 174af227f, e9e7bd151, 2117f72fe)
- [x] Ready for `/craft-push ra cp-3`

## Deferred (not blocking CP-3)

- Pulse 17 — extract 10 `@craftworks/*` dialect packages (moved to future `craftworks-modularization` wave)
- Pulse 18 — extract 7 per-platform emitter plugins (moved to future `craftworks-modularization` wave)
