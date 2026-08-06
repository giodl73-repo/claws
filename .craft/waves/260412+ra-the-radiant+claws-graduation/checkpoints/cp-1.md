---
checkpoint: 1
name: "Infrastructure — Readers, Crypto, Audit, R5"
pulse_range: [1, 2, 3, 4, 5, 6]
depends_on_cp: null
review_panel: [craft:architect, craft:security, claws:platform-eng, craft:type-system]
tag: ra-cp-1
---

# CP-1: Infrastructure — Readers, Crypto, Audit, R5

## Summary

Foundation checkpoint for claws-sdk graduation. Establishes the four pillars
the standalone compiler needs before it can emit anything: workspace reading,
sidecar resolution, IR types, cryptographic primitives, audit chain, and R5
fail-closed enforcement.

All work targets `claws-sdk/src/compiler/`. Zero imports from
`@craftworks/compiler-sdk` or `@craftworks/agent-sdk` in any deliverable.

## Dispatch Plan

### Batch 1 (parallel — no dependencies)

| Agent   | Pulse | Slug                 | Notes                                   |
| ------- | ----- | -------------------- | --------------------------------------- |
| alpha   | 01    | oc-workspace-readers | 9 readers + orchestrator, ~800 lines    |
| bravo   | 03    | formir-types         | OCWorkspaceIR types, type-only pulse    |
| charlie | 04    | crypto-internalize   | AES, HMAC, SHA-256, Ed25519, ~250 lines |

Pulses 1, 3, 4 have `depends_on: []` — fully independent.

### Batch 2 (depends on batch 1)

| Agent | Pulse | Slug                   | Depends on | Notes                         |
| ----- | ----- | ---------------------- | ---------- | ----------------------------- |
| delta | 02    | forma-sidecar-resolver | 1          | Uses normalize.ts from P01    |
| echo  | 05    | audit-chain-local      | 4          | Uses Ed25519/SHA-256 from P04 |

Pulse 2 needs pulse 1 (normalize.ts). Pulse 5 needs pulse 4 (crypto).

### Batch 3 — Gate (depends on all prior)

| Agent   | Pulse | Slug           | Depends on    | Notes                                    |
| ------- | ----- | -------------- | ------------- | ---------------------------------------- |
| foxtrot | 06    | r5-fail-closed | 1, 2, 3, 4, 5 | CP-1 gate pulse, `checkpoint_gate: true` |

Pulse 6 depends on all five prior pulses. This is the checkpoint gate —
R5 fail-closed enforcement ties readers, IR, crypto, and audit together.

## Review Panel

Roles drawn from governing_roles across all 6 pulses + architect + testing:

- `craft:architect` — monorepo structure, WorkspaceReader contract, enforcement layer
- `craft:security` — R5 fail-closed, crypto standards, audit chain integrity
- `claws:platform-eng` — SDK patterns, cross-module integration
- `craft:type-system` — IR types, strict typing discipline

## Governing Role Files

- `.craft/roles/craft/architect.md`
- `.craft/roles/craft/security.md`
- `.craft/roles/craft/type-system.md`
- `.craft/roles/claws/platform-eng.md`

## Coverage Bar

All claws-sdk files: **95/90/95/95** (statements/branches/functions/lines).

## Exit Criteria

- [ ] All 6 pulses committed with passing tests
- [ ] `npm run build` exits 0 from repo root
- [ ] `npx tsc --noEmit` exits 0 in claws-sdk
- [ ] Per-file coverage thresholds met
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-1`
