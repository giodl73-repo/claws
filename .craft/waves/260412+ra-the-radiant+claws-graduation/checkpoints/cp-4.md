---
checkpoint: 4
name: "Publish + DX — Docs, Migration, npm, Incremental, Watch, Event Bus"
pulse_range: [19, 20, 80, 81, 83]
depends_on_cp: 3
review_panel: [craft:architect, claws:platform-eng, craft:conformance, craft:codegen, craft:perf-stress]
tag: ra-cp-4
---

# CP-4: Publish + DX — Docs, Migration, npm, Incremental, Watch, Event Bus

## Summary

Two groups land in this checkpoint:

1. **Publish (pulses 19-20)** — Migration documentation for consumers moving
   from compiler-sdk to the standalone @bic/claws-sdk package, followed
   by the GHE Packages publish pipeline that enforces the freemium boundary
   at publish time. P20 is the original CP-4 gate.

2. **Compile DX (pulses 80, 81, 83)** — from the claws-compile-dx plan:
   per-stage incremental compile (80), `claws watch` auto-rebuild (81), and
   the CompilerEventBus hook surface for Horus hot-reload (83). 80 is the
   foundation; 81 depends on it; 83 is independent and ships the subpath
   export Horus will consume.

P20 remains the CP-4 gate — the checkpoint advances only after publish
pipeline is validated AND the DX pulses land green.

## Dispatch Plan

### Batch 1 — Publish prep

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| alpha | 19 | docs-migration-guide | 16, 18 | Migration docs, CHANGELOG |

### Batch 2 — DX foundation (parallel with Batch 1; depends only on pulse 12)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| bravo | 80 | incremental-stages | 11, 12 | Per-stage caches + stageTimings; claws-compile-dx H2; CL-04 v1.2 §IS |
| charlie | 83 | compiler-event-bus | 12 | CompilerEventBus + subpath export; claws-compile-dx H5; CL-14 v1.4 §9; Horus seam |

80 and 83 are independent and parallel-safe. Both thread through the host
pipeline but touch different surfaces (cache/stage logic vs event emission).

### Batch 3 — Watch mode (depends on incremental)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| delta | 81 | watch-mode | 80 | `claws watch` with chokidar + debounce + SIGINT cleanup; claws-compile-dx H1; consumes per-stage caches from 80; threads `options.events` through to 83 |

### Batch 4 — Gate (depends on all prior + Batch 2/3)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| echo | 20 | npm-publish-pipeline | 19, 80, 81, 83 | Publish workflows to GHE Packages + CI gates, `checkpoint_gate: true` — tarballs MUST include `./compiler/events` subpath (§9.5) |

## Review Panel

- `craft:architect` — migration guide structure, package references, CI/CD pipeline design, DX module boundaries (watch/incremental/event-bus layering)
- `claws:platform-eng` — SDK migration patterns, GHE Packages publishing, integrity hashing, subpath-export wiring for `./compiler/events`
- `craft:conformance` — migration guide completeness, publish gate coverage, CL-04 v1.2 §IS + CL-14 v1.4 §9 conformance
- `craft:codegen` — event-bus payload shapes, typed listener overloads (brought in for pulses 80+83)
- `craft:perf-stress` — incremental compile wall-clock targets (80%+ reduction), watch debounce correctness, cache-singleton sharing (brought in for pulses 80+81)

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/conformance.md`
- `.craft/roles/craft/codegen.md`
- `.craft/roles/craft/perf-stress.md`
- `.craft/roles/claws/platform-eng.md`

## Coverage Bar

All claws packages: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 5 pulses (19, 20, 80, 81, 83) committed with passing tests
- [ ] @bic/claws-sdk publish dry-run succeeds with zero @craftworks/ in tarball
- [ ] @bic/claws-sdk publish dry-run succeeds with integrity hash pinning
- [ ] `./compiler/events` subpath resolves from outside the package (CL-14 §9.5)
- [ ] `claws watch` on canonical fixture: single edit → single compile within 300ms debounce + 1000ms emit mtime update
- [ ] Incremental compile on lobster-only change: ≥80% wall-clock reduction vs from-scratch on canonical fixture
- [ ] CompilerEventBus emits all 20 discriminated-union event types per CL-14 §9.2 for a successful compile
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in all claws packages
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-4`
