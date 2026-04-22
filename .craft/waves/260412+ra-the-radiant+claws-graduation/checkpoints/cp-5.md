---
checkpoint: 5
name: "Serve Read APIs — Chunks + Schema + Path Syntax"
pulse_range: [21, 22, 66, 23, 24, 25, 26, 27, 28, 64]
depends_on_cp: 4
review_panel: [craft:architect, claws:gateway-eng, claws:platform-eng, craft:type-system]
tag: ra-cp-5
---

# CP-5: Serve Read APIs — Chunks + Schema + Path Syntax

## Summary

Stand up the serve layer: scaffold, workspace parser, OC path syntax, chunk
assembler, four chunk type endpoints (general-preferences, connections,
memory-groups-entitlements, governance-tools-identity-status), workspace
schema, and SSE events. This is the read-side API for CAP/Lobster/Companion.

## Dispatch Plan

### Batch 1

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| alpha | 21 | serve-scaffold | — | Express/Fastify scaffold, routing |

### Batch 2 (depends on batch 1)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| bravo | 22 | workspace-parser | 21 | Parse workspace for serve layer |
| charlie | 28 | sse-events | 21 | SSE event stream, `checkpoint_gate: true` |

Pulses 22 and 28 both depend only on P21 — parallel.

### Batch 3 (depends on batch 2)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| delta | 66 | oc-path-syntax | 22 | oc:// path syntax parser |

### Batch 4 (depends on batch 3)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| echo | 23 | chunk-assembler | 21, 22, 66 | Core chunk assembly engine |
| foxtrot | 64 | workspace-schema | 22, 23, 66 | Schema endpoint |

**Note:** Pulse 64 depends on P23 which is in the same batch. Dispatch
sequentially: echo (P23) first, then foxtrot (P64) after P23 completes.

Revised batch 4:
- **4a:** echo → P23 (chunk-assembler)
- **4b:** foxtrot → P64 (workspace-schema) — after P23 done

### Batch 5 (depends on batch 4)

| Agent | Pulse | Slug | Depends on | Notes |
|-------|-------|------|------------|-------|
| golf | 24 | chunks-general-preferences | 23 | General preferences chunk |
| hotel | 25 | chunks-connections | 23 | Connections chunk |
| india | 26 | chunks-memory-groups-entitlements | 23 | Memory/groups/entitlements chunk |
| juliet | 27 | governance-tools-identity-status | 23 | Governance/tools/identity/status chunk |

All four depend only on P23 — fully parallel.

## Review Panel

- `craft:architect` — serve layer design, chunk assembly patterns
- `claws:gateway-eng` — API routes, SSE protocol, schema validation
- `claws:platform-eng` — SDK integration, parser patterns
- `craft:type-system` — chunk types, schema correctness

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/type-system.md`
- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/platform-eng.md`

## Coverage Bar

All claws packages: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 10 pulses committed with passing tests
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in all claws packages
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-5`
