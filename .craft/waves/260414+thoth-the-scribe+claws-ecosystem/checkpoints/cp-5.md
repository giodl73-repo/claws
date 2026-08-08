---
checkpoint: 5
name: "Ecosystem — CI/CD Action, @openclaw/* Packages, GuardrailProvider Spec, Aether Integration"
pulse_range: [43, 52]
depends_on_cp: 4
review_panel: [craft:architect, claws:ciso, claws:founder, claws:gateway-eng, craft:testing]
tag: thoth-cp-5
---

# Checkpoint 5: Ecosystem

## Scope

CI/CD GitHub Action (SARIF pipeline, severity gating, caching), upstream
@openclaw/* packages (audit-chain, budget-meter, identity-bridge, siem-emitter,
secret-scanner), GuardrailProvider specification, and Aether integration
(approval policies, blob integrity verification, guardrail composition).

**Pulses**: 43–52 (10 pulses)
**Plans**: claws-cicd-action, claws-upstream-contrib, claws-aether-integration
**Packages**: claws-sdk, claws-cli, standalone @openclaw/* packages

## Dispatch Plan

### Batch 1 — Two independent tracks (parallel)

| Pulse | Slug                 | Depends On | Track    |
| ----- | -------------------- | ---------- | -------- |
| 43    | cicd-sarif-pipeline  | —          | CI/CD    |
| 46    | upstream-audit-chain | —          | Upstream |

### Batch 2 — Depends on track roots (parallel)

| Pulse | Slug                     | Depends On | Track    |
| ----- | ------------------------ | ---------- | -------- |
| 44    | cicd-severity-gating     | 43         | CI/CD    |
| 47    | upstream-budget-identity | 46         | Upstream |
| 48    | upstream-siem-scanner    | 46         | Upstream |

### Batch 3 — CI/CD caching + track convergence (parallel)

| Pulse | Slug                | Depends On | Track |
| ----- | ------------------- | ---------- | ----- |
| 45    | cicd-caching-action | 43, 44     | CI/CD |

### Batch 4 — GuardrailProvider spec (convergence gate)

| Pulse | Slug                    | Depends On |
| ----- | ----------------------- | ---------- |
| 49    | upstream-guardrail-spec | 43–48      |

**Mid-checkpoint gate**: Pulse 49 (`checkpoint_gate: true`)

### Batch 5 — Aether integration (depends on P49, parallel)

| Pulse | Slug                     | Depends On | Track  |
| ----- | ------------------------ | ---------- | ------ |
| 50    | aether-approval-policies | 49         | Aether |

### Batch 6 — Aether dependent (parallel)

| Pulse | Slug                        | Depends On | Track  |
| ----- | --------------------------- | ---------- | ------ |
| 51    | blob-integrity-verification | 18, 50     | Aether |
| 52    | guardrail-composition       | 49, 50     | Aether |

**Checkpoint gate**: Pulse 52 (`checkpoint_gate: true`)

> **Note**: Pulse 51 has a cross-checkpoint dependency on Pulse 18 (artifact-signer
> from CP-2). This is satisfied by the CP-2 → CP-3 → CP-4 → CP-5 ordering.

## Review Panel

| Role              | Cluster     | Focus                                                             |
| ----------------- | ----------- | ----------------------------------------------------------------- |
| craft:architect   | design      | GuardrailProvider spec, @openclaw/* API surface, Aether contracts |
| claws:ciso        | security    | Blob integrity, approval policies, signing chain                  |
| claws:founder     | product     | Ecosystem value, upstream package usability                       |
| claws:gateway-eng | integration | Aether host approval, external guardrail composition              |
| craft:testing     | quality     | L0–L3 coverage, zero-import verification, cross-package tests     |

## Coverage Requirements

- **Unit**: 95/90/95/95 per-file
- **Integration**: 85/70/80/85 whole-package (mandatory)
- _*@openclaw/* packages_*: Must have independent test suites with zero @craftworks imports
- **Gate command**: `cd claws-sdk && npx vitest run --project unit --coverage && npx vitest run --project integration --coverage`

## Exit Criteria

- [ ] All 10 pulses committed and passing
- [ ] `npm run build` succeeds from repo root
- [ ] `npx tsc --noEmit` passes in claws-sdk and claws-cli
- [ ] Per-file unit coverage thresholds met
- [ ] Integration coverage at or above 85/70/80/85
- [ ] Review panel finds no Major issues
- [ ] `node claws-cli/bin/claws.js --help` runs without error
- [ ] @openclaw/* packages have zero `@craftworks` imports (grep verification)
- [ ] host-approval-policies.json emitted and verified
- [ ] GuardrailProvider spec passes conformance tests
