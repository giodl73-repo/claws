---
checkpoint: 7
name: "Lobster Collaboration — Loop, Calendar, Trust, Sessions, Fleet Compile"
pulse_range: [35, 36, 37, 38, 39, 60, 61, 63, 65, 72, 73, 82]
depends_on_cp: 6
review_panel:
  [
    craft:architect,
    claws:gateway-eng,
    claws:platform-eng,
    craft:dragon,
    claws:ciso,
    craft:perf-stress,
  ]
tag: ra-cp-7
---

# CP-7: Lobster Collaboration — Loop, Calendar, Trust, Sessions, Fleet Compile

## Summary

Lobster collaboration features: soul sync loop, memory sync loop, schedule
calendar, work queue, trust escalation, session types, session routes,
approval session context, session config edit, auto-snapshot (72), violation
state (73). Also includes the VS Code LSP validation pulse (56) which depends
on the validation layer from CP-6, plus the claws-compile-dx fleet-parallel
compile pulse (82) — independent of the collaboration work but lands in CP-7
because fleet ops are Lobster-adjacent.

## Dispatch Plan

### Batch 1 (parallel — depend only on CP-5/CP-6 pulses)

| Agent   | Pulse | Slug                  | Depends on | Notes                        |
| ------- | ----- | --------------------- | ---------- | ---------------------------- |
| alpha   | 37    | schedule-calendar     | 22         | Schedule/calendar management |
| bravo   | 38    | workqueue             | 22         | Work queue for async tasks   |
| charlie | 56    | vscode-lsp-validation | 30         | VS Code LSP validation layer |
| delta   | 60    | session-types         | 22, 23     | Session type definitions     |

All four depend only on CP-5/CP-6 pulses — fully parallel.

### Batch 2 (depends on batch 1 + CP-6)

| Agent   | Pulse | Slug                     | Depends on | Notes                                          |
| ------- | ----- | ------------------------ | ---------- | ---------------------------------------------- |
| echo    | 35    | loop-soul-sync           | 30, 31     | Soul document sync loop                        |
| foxtrot | 36    | loop-memory-sync         | 30, 31     | Memory sync loop                               |
| golf    | 39    | trust-escalation         | 30, 31     | Trust escalation flow, `checkpoint_gate: true` |
| hotel   | 61    | session-routes           | 21, 60     | Session HTTP routes                            |
| india   | 63    | approval-session-context | 60         | Approval session context                       |

P35, P36, P39 depend on P30+P31 (CP-6). P61 depends on P21 (CP-5) + P60 (batch 1).
P63 depends on P60 (batch 1).

### Batch 3 (depends on batch 2)

| Agent  | Pulse | Slug                | Depends on | Notes                       |
| ------ | ----- | ------------------- | ---------- | --------------------------- |
| juliet | 65    | session-config-edit | 60, 61, 30 | Session config editing      |
| kilo   | 72    | auto-snapshot       | 29, 30, 69 | Workspace auto-snapshot     |
| lima   | 73    | violation-state     | 30, 33     | Violation state persistence |

P65 depends on P60 (batch 1), P61 (batch 2), P30 (CP-6). P72 depends on CP-6 write APIs (29, 30) + workspace-versioning (69). P73 depends on R5 enforcement from CP-6 (33) + validation layer (30).

### Batch 4 — Compile DX (parallel; depends only on CP-2)

| Agent | Pulse | Slug                   | Depends on | Notes                                                                                                                                 |
| ----- | ----- | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| mike  | 82    | fleet-parallel-compile | 11, 12     | `claws fleet compile` with bounded semaphore + failure isolation; claws-compile-dx plan H3; CL-01 v1.2; scenario codes fleet/S01, S02 |

Pulse 82 is independent of the Lobster collaboration work — it depends only on CP-2 (pulse 11 cache + pulse 12 host). Placed in CP-7 because fleet operations are Lobster-adjacent, not because of a code dependency. Can run at any point during CP-7 in parallel with other batches.

## Review Panel

- `craft:architect` — session architecture, sync loop design
- `claws:gateway-eng` — session routes, calendar API
- `claws:platform-eng` — queue patterns, trust model
- `craft:dragon` — session config editing domain
- `claws:ciso` — trust escalation security
- `craft:perf-stress` — fleet concurrency bounds, max-concurrency semantics, peak-concurrency observability (pulse 82)

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/dragon.md`
- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/platform-eng.md`
- `.craft/roles/claws/ciso.md`

## Coverage Bar

All claws packages: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 12 pulses committed with passing tests (35, 36, 37, 38, 39, 60, 61, 63, 65, 72, 73, 82)
- [ ] `claws fleet compile` on 3-workspace fixture: failure isolation verified (pulse 82)
- [ ] `claws fleet compile --max-concurrency N` peak-concurrency observed ≤ N (pulse 82)
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in all claws packages
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-7`
