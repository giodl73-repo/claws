---
checkpoint: 6
name: "Serve Write APIs — Validation + PATCH + DryRun + Batch + Versioning"
pulse_range: [29, 30, 31, 32, 33, 34, 67, 68, 69, 70, 71]
depends_on_cp: 5
review_panel: [craft:architect, claws:gateway-eng, claws:platform-eng, claws:ciso, craft:security]
tag: ra-cp-6
---

# CP-6: Serve Write APIs — Validation + PATCH + DryRun + Batch + Versioning

## Summary

Write-side serve APIs: workspace edit, validation layer, PATCH routes,
incremental cache, allow-all mode, dry-run patch, batch edits, workspace
versioning, time-travel API, diff API, and the patch errors E2E gate.

## Dispatch Plan

### Batch 1 (parallel — depend only on CP-5 pulses)

| Agent | Pulse | Slug              | Depends on | Notes                         |
| ----- | ----- | ----------------- | ---------- | ----------------------------- |
| alpha | 29    | workspace-edit    | 22         | Workspace edit primitives     |
| bravo | 32    | incremental-cache | 21         | Incremental compilation cache |

P29 depends on P22 (CP-5). P32 depends on P21 (CP-5).

### Batch 2 (depends on batch 1)

| Agent   | Pulse | Slug             | Depends on | Notes                          |
| ------- | ----- | ---------------- | ---------- | ------------------------------ |
| charlie | 30    | validation-layer | 29, 23, 66 | Schema + governance validation |

P30 depends on P29 (batch 1) + P23, P66 (CP-5).

### Batch 3 (depends on batch 2)

| Agent | Pulse | Slug          | Depends on | Notes                    |
| ----- | ----- | ------------- | ---------- | ------------------------ |
| delta | 31    | patch-routes  | 29, 30     | PATCH HTTP routes        |
| echo  | 67    | dry-run-patch | 30, 31     | Dry-run mode for patches |

**Note:** P67 depends on P31 which is in the same batch. Dispatch sequentially:

- **3a:** delta → P31 (patch-routes)
- **3b:** echo → P67 (dry-run-patch) — after P31 done

### Batch 4 (depends on batch 3)

| Agent   | Pulse | Slug                 | Depends on | Notes                                    |
| ------- | ----- | -------------------- | ---------- | ---------------------------------------- |
| foxtrot | 33    | allow-all            | 31         | Allow-all governance bypass              |
| golf    | 68    | batch-edits          | 31, 67     | Batch edit operations                    |
| hotel   | 69    | workspace-versioning | 31, 32     | Workspace version management             |
| india   | 34    | patch-errors-e2e     | 31, 32     | Patch error E2E, `checkpoint_gate: true` |

P33 depends on P31. P68 depends on P31 + P67. P69 depends on P31 + P32.
P34 depends on P31 + P32.

**Note:** P68 depends on P67 (batch 3b). P33, P69, P34 can start after batch 3a.
Dispatch: foxtrot (P33), hotel (P69), india (P34) after 3a; golf (P68) after 3b.

### Batch 5 (depends on batch 4)

| Agent  | Pulse | Slug            | Depends on | Notes                         |
| ------ | ----- | --------------- | ---------- | ----------------------------- |
| juliet | 70    | time-travel-api | 32, 69     | Time-travel workspace queries |

### Batch 6 (depends on batch 5)

| Agent | Pulse | Slug     | Depends on | Notes                           |
| ----- | ----- | -------- | ---------- | ------------------------------- |
| kilo  | 71    | diff-api | 66, 70     | Diff between workspace versions |

## Review Panel

- `craft:architect` — write API design, versioning strategy
- `claws:gateway-eng` — PATCH routes, batch semantics, SSE
- `claws:platform-eng` — cache integration, edit primitives
- `claws:ciso` — validation layer, allow-all governance
- `craft:security` — dry-run isolation, tamper prevention

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/security.md`
- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/platform-eng.md`
- `.craft/roles/claws/ciso.md`

## Coverage Bar

All claws packages: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 11 pulses committed with passing tests
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in all claws packages
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-6`
