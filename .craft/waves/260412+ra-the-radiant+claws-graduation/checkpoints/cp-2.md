---
checkpoint: 2
name: "Emit + Compile — Emitters, Validator, Cache, Host"
pulse_range: [7, 8, 9, 10, 11, 12]
depends_on_cp: 1
review_panel:
  [
    craft:architect,
    craft:codegen,
    craft:conformance,
    craft:perf-stress,
    claws:platform-eng,
    craft:testing,
  ]
tag: ra-cp-2
---

# CP-2: Emit + Compile — Emitters, Validator, Cache, Host

## Summary

Build the emit pipeline on top of CP-1 infrastructure. OC target emitter,
Claude Code emitter, TypeScript codegen, eval validator, compilation cache,
and the full compile pipeline E2E gate. After this checkpoint the standalone
compiler can read → analyze → emit → validate → cache.

## Dispatch Plan

### Batch 1 (parallel — depend only on CP-1)

| Agent | Pulse | Slug           | Depends on | Notes                |
| ----- | ----- | -------------- | ---------- | -------------------- |
| alpha | 07    | emit-oc-target | 1, 3, 6    | OC workspace emitter |
| bravo | 10    | eval-validator | 1, 3       | Validation framework |

Pulse 7 needs readers (P01), IR (P03), and R5 (P06, all CP-1).
Pulse 10 needs readers (P01) and IR (P03).

### Batch 2 (depends on batch 1)

| Agent   | Pulse | Slug             | Depends on | Notes                      |
| ------- | ----- | ---------------- | ---------- | -------------------------- |
| charlie | 08    | emit-claude-code | 6, 7       | Claude Code target emitter |
| delta   | 09    | ts-codegen       | 7          | TypeScript code generation |

Pulse 8 needs R5 (P06) and OC emitter (P07).
Pulse 9 needs OC emitter (P07).

### Batch 3 (depends on all prior in CP-2)

| Agent | Pulse | Slug          | Depends on | Notes                   |
| ----- | ----- | ------------- | ---------- | ----------------------- |
| echo  | 11    | cache-compile | 1-10       | Compilation cache layer |

Pulse 11 depends on all pulses 1-10.

### Batch 4 — Gate (depends on all)

| Agent   | Pulse | Slug                 | Depends on | Notes                                      |
| ------- | ----- | -------------------- | ---------- | ------------------------------------------ |
| foxtrot | 12    | compile-pipeline-e2e | 1-11       | Full pipeline E2E, `checkpoint_gate: true` |

## Review Panel

- `craft:architect` — pipeline structure, cache integration
- `craft:codegen` — emitter correctness, target fidelity
- `craft:conformance` — E2E pipeline compliance
- `craft:perf-stress` — cache performance, compilation speed
- `claws:platform-eng` — SDK patterns, cross-module wiring
- `craft:testing` — validator design, E2E test coverage

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/codegen.md`
- `.craft/roles/craft/conformance.md`
- `.craft/roles/craft/perf-stress.md`
- `.craft/roles/craft/testing.md`
- `.craft/roles/claws/platform-eng.md`

## Coverage Bar

All claws-sdk files: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 6 pulses committed with passing tests
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in claws-sdk
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-2`
