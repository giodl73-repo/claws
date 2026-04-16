---
checkpoint: 1
name: "Security Hardening + Protect — Budget, Secrets, Identity, Anubis Findings"
pulse_range: [1, 10]
depends_on_cp: null
review_panel: [craft:architect, claws:ciso, claws:founder, claws:platform-eng, craft:testing]
tag: thoth-cp-1
---

# Checkpoint 1: Security Hardening + Protect

## Scope

All pulses from the **claws-protect** plan: type foundations, workspace/fleet
budget tracking, encrypted secrets vault, SSO/RBAC identity, LLM/key/trust/race
security hardening, and the CP-1 gate test-coverage pulse.

**Pulses**: 1–10 (10 pulses)
**Plan**: claws-protect
**Packages**: claws-sdk, claws-cli

## Dispatch Plan

### Batch 1 — No dependencies (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 1 | protect-types | — |
| 6 | security-hardening-llm | — |
| 9 | security-hardening-race | — |

### Batch 2 — Depends on Pulse 1 (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 2 | budget-workspace | 1 |
| 4 | secrets-vault | 1 |
| 5 | identity-sso | 1 |

### Batch 3 — Depends on Batch 2 outputs (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 3 | budget-fleet | 2 |
| 7 | security-hardening-keys | 4 |
| 8 | security-hardening-trust | 5 |

### Batch 4 — Gate (sequential, depends on all)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 10 | protect-test-coverage | 1–9 |

**Checkpoint gate**: Pulse 10 (`checkpoint_gate: true`)

## Review Panel

| Role | Cluster | Focus |
|------|---------|-------|
| craft:architect | design | Type surface stability, barrel exports, API contracts |
| claws:ciso | security | Vault crypto, key hygiene, trust model, race conditions |
| claws:founder | product | Protect feature completeness, security posture value |
| claws:platform-eng | platform | Budget token counting, SSO integration, fleet ops |
| craft:testing | quality | L0–L3 coverage, dual-coverage gate, test fidelity |

## Coverage Requirements

- **Unit**: 95/90/95/95 per-file (stmts/branches/funcs/lines)
- **Integration**: 85/70/80/85 whole-package (aspirational for CP-1)
- **Gate command**: `cd claws-sdk && npx vitest run --project unit --coverage && npx vitest run --project integration --coverage`

## Exit Criteria

- [ ] All 10 pulses committed and passing
- [ ] `npm run build` succeeds from repo root
- [ ] `npx tsc --noEmit` passes in claws-sdk and claws-cli
- [ ] Per-file unit coverage thresholds met
- [ ] Review panel finds no Major issues
- [ ] `node claws-cli/bin/claws.js --help` runs without error
