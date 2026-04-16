---
checkpoint: 2
name: "Compliance + Audit — SOC2, HIPAA, EU AI Act, Audit Chain, Signing"
pulse_range: [11, 20]
depends_on_cp: 1
review_panel: [craft:architect, claws:ciso, claws:founder, claws:platform-eng, craft:testing]
tag: thoth-cp-2
---

# Checkpoint 2: Compliance + Audit

## Scope

Audit chain infrastructure (hash-chained JSONL, verification, WAL recovery,
witness export), compliance evidence builders (SOC2 Type II, HIPAA Security Rule,
EU AI Act), artifact signing (Ed25519/HMAC), compliance scenario findings
integration, and the CP-2 gate security fixes pulse.

**Pulses**: 11–20 (10 pulses)
**Plans**: claws-comply-audit
**Packages**: claws-sdk, claws-cli

## Dispatch Plan

### Batch 1 — Foundation (single)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 11 | audit-chain-foundation | — |

### Batch 2 — Depends on Pulse 11 (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 12 | audit-verify-integrity | 11 |
| 13 | audit-wal-recovery | 11 |

### Batch 3 — Depends on 11+12 (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 14 | audit-witness-export | 11, 12 |
| 15 | compliance-soc2 | 11, 12 |

### Batch 4 — Depends on Pulse 15 (parallel)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 16 | compliance-hipaa | 15 |
| 17 | compliance-eu-ai-act | 15 |
| 18 | artifact-signer | 15 |

### Batch 5 — Integration (sequential)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 19 | comply-scenario-findings | 14, 15, 16, 17, 18 |

### Batch 6 — Gate (sequential, depends on all)

| Pulse | Slug | Depends On |
|-------|------|-----------|
| 20 | audit-security-fixes | 11–19 |

**Checkpoint gate**: Pulse 20 (`checkpoint_gate: true`)

## Review Panel

| Role | Cluster | Focus |
|------|---------|-------|
| craft:architect | design | Audit chain data model, compliance API surface |
| claws:ciso | security | Hash chain integrity, signing crypto, evidence fidelity |
| claws:founder | product | Compliance framework coverage, audit UX |
| claws:platform-eng | platform | WAL recovery, witness export formats, SIEM integration |
| craft:testing | quality | L0–L3 coverage, compliance scenario validation |

## Coverage Requirements

- **Unit**: 95/90/95/95 per-file
- **Integration**: 85/70/80/85 whole-package (mandatory from CP-2)
- **Gate command**: `cd claws-sdk && npx vitest run --project unit --coverage && npx vitest run --project integration --coverage`

## Exit Criteria

- [ ] All 10 pulses committed and passing
- [ ] `npm run build` succeeds from repo root
- [ ] `npx tsc --noEmit` passes in claws-sdk and claws-cli
- [ ] Per-file unit coverage thresholds met
- [ ] Integration coverage at or above 85/70/80/85
- [ ] Review panel finds no Major issues
- [ ] `node claws-cli/bin/claws.js --help` runs without error
