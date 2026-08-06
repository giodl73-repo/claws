---
checkpoint: 3
name: "Optimization + Maker + Badge — PRESS, Context DAG, Scaffold, Publish, Badges"
pulse_range: [21, 32]
depends_on_cp: 2
review_panel: [craft:architect, claws:ciso, claws:founder, claws:platform-eng, craft:testing]
tag: thoth-cp-3
---

# Checkpoint 3: Optimization + Maker + Badge

## Scope

PRESS optimization pipeline (pinch profiles, quality matrix, cost estimator,
dead-code merge, context DAG, unified press), maker experience (scaffold,
annotate/import, publish), and badge system (generation, staleness, enterprise
policy). Two independent tracks converge at the CP-3 gate.

**Pulses**: 21–32 (12 pulses)
**Plans**: claws-press-context, claws-maker-commands, claws-badge
**Packages**: claws-sdk, claws-cli

## Dispatch Plan

### Batch 1 — Two independent tracks (parallel)

| Pulse | Slug           | Depends On | Track |
| ----- | -------------- | ---------- | ----- |
| 21    | pinch-profiles | —          | PRESS |
| 27    | maker-scaffold | —          | Maker |

### Batch 2 — Depends on track roots (parallel)

| Pulse | Slug                      | Depends On | Track |
| ----- | ------------------------- | ---------- | ----- |
| 22    | quality-matrix            | 21         | PRESS |
| 23    | governance-cost-estimator | 21         | PRESS |
| 24    | dead-code-merge           | 21         | PRESS |
| 28    | maker-annotate-import     | 27         | Maker |

### Batch 3 — Mid-track convergence (parallel)

| Pulse | Slug          | Depends On | Track |
| ----- | ------------- | ---------- | ----- |
| 25    | context-dag   | 21, 22     | PRESS |
| 29    | maker-publish | 27, 28     | Maker |

### Batch 4 — PRESS pipeline + Badge start (parallel)

| Pulse | Slug             | Depends On | Track |
| ----- | ---------------- | ---------- | ----- |
| 26    | context-press    | 21–25      | PRESS |
| 30    | badge-generation | 29         | Badge |

### Batch 5 — Badge sequence (sequential)

| Pulse | Slug            | Depends On | Track |
| ----- | --------------- | ---------- | ----- |
| 31    | badge-staleness | 30         | Badge |

### Batch 6 — Gate (depends on all)

| Pulse | Slug                    | Depends On |
| ----- | ----------------------- | ---------- |
| 32    | badge-enterprise-policy | 21–31      |

**Checkpoint gate**: Pulse 32 (`checkpoint_gate: true`)

## Review Panel

| Role               | Cluster  | Focus                                                      |
| ------------------ | -------- | ---------------------------------------------------------- |
| craft:architect    | design   | PRESS pipeline stages, maker API surface, badge model      |
| claws:ciso         | security | Badge enterprise policy, publish signing, tier enforcement |
| claws:founder      | product  | Maker UX, scaffold templates, publish workflow             |
| claws:platform-eng | platform | DAG storage, pinch profiles, context compression           |
| craft:testing      | quality  | L0–L3 coverage, dual-track integration, fidelity scores    |

## Coverage Requirements

- **Unit**: 95/90/95/95 per-file
- **Integration**: 85/70/80/85 whole-package (mandatory)
- **Gate command**: `cd claws-sdk && npx vitest run --project unit --coverage && npx vitest run --project integration --coverage`

## Exit Criteria

- [ ] All 12 pulses committed and passing
- [ ] `npm run build` succeeds from repo root
- [ ] `npx tsc --noEmit` passes in claws-sdk and claws-cli
- [ ] Per-file unit coverage thresholds met
- [ ] Integration coverage at or above 85/70/80/85
- [ ] Review panel finds no Major issues
- [ ] `node claws-cli/bin/claws.js --help` runs without error
