---
pulse: 7
slug: multi-platform-resolution
plan: claws-detect
depends_on: [6]
governing_roles: [claws:platform-eng, craft:navigator]
scenario_codes:
  [detect/multi-platform-resolve, detect/multi-platform-ambiguous, detect/case-sensitive-linux]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/detect/resolve.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 07: Multi-Platform Resolution

## Objective

Implement `resolve()` that takes a `PlatformInventory` (from Pulse 06's
`detect()`) and selects the highest-enforcement platform as primary. When
multiple platforms are detected (e.g., CLAUDE.md + .cursorrules), the platform
with the highest enforcement capability wins: full > advisory > explicit-only.
If two platforms have equal enforcement (e.g., two advisory platforms),
resolution requires explicit `targets` selection in claws.json -- ambiguity
is rejected with an actionable error message. The resolved `PlatformTarget`
drives all downstream compilation: parse supplements, rule adjustments, and
emission format.

## Deliverables

- [ ] `claws-sdk/src/detect/types.ts` -- MODIFY: add PlatformTarget type (primary platform + secondaries + resolution metadata)
- [ ] `claws-sdk/src/detect/resolve.ts` -- NEW: `resolve(inventory: PlatformInventory, config?: ClawsConfig): PlatformTarget` -- select primary, reject ambiguity, apply claws.json overrides
- [ ] `claws-sdk/src/detect/index.ts` -- MODIFY: re-export resolve
- [ ] `claws-sdk/tests/detect/resolve.unit.test.ts` -- NEW: 5 L0 tests
- [ ] `claws-sdk/tests/detect/resolve.integration.test.ts` -- NEW: 2 L1 tests (detect -> resolve pipeline)
- [ ] `claws-sdk/tests/fixtures/platform-multi/` -- NEW: workspace with CLAUDE.md + .cursorrules (multi-platform)

## TDD Tests

### L0 Unit (5)

- CLAUDE.md + .cursorrules resolves to `claude-code` as primary (full > advisory) -> `tests/detect/resolve.unit.test.ts`
- Two advisory platforms (Cursor + Copilot) with no explicit target rejects with actionable error -> `tests/detect/resolve.unit.test.ts`
- `claws.json#targets` explicit selection overrides auto-detection precedence -> `tests/detect/resolve.unit.test.ts`
- Single platform inventory resolves without ambiguity -> `tests/detect/resolve.unit.test.ts`
- Case-sensitive marker matching: `CLAUDE.md` vs `claude.md` on case-sensitive filesystem -> `tests/detect/resolve.unit.test.ts`

### L1 Integration (2)

- Full `detect()` -> `resolve()` pipeline on platform-multi fixture selects correct primary -> `tests/detect/resolve.integration.test.ts`
- Full pipeline with claws.json targets override on multi-platform fixture -> `tests/detect/resolve.integration.test.ts`

## HC-BLOCK Findings Addressed

- Multi-platform ambiguity rejection: equal-enforcement platforms without explicit target produce error (not silent selection)
- claws.json targets override: explicit configuration always wins over auto-detection

## Acceptance Criteria

1. `resolve()` selects highest-enforcement platform as primary when enforcement levels differ
2. Equal enforcement without explicit target produces actionable error: "ambiguous platform -- set targets in claws.json"
3. `claws.json#targets` explicit selection overrides auto-detection precedence
4. Resolved PlatformTarget includes primary platform, secondary platforms list, and resolution metadata
5. Single-platform inventory resolves trivially without ambiguity check
6. Case-sensitive marker matching works correctly on Linux (case-sensitive) and Windows (case-insensitive)

## Governing Roles

| Role               | File                                 | Focus                                                                                 |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------- |
| claws:platform-eng | `.craft/roles/claws/platform-eng.md` | Enforcement precedence correctness, ambiguity rejection UX, config override semantics |
| craft:navigator    | `.craft/roles/craft/navigator.md`    | Resolution → parse pipeline threading, PlatformTarget propagation downstream          |

## Dependencies

- **Pulse 06** (platform-marker-detection): `detect()` must return PlatformInventory
- **claws-sdk/src/detect/types.ts**: PlatformInventory type from Pulse 06

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/detect/resolve.unit.test.ts
cd claws-sdk && npx vitest run tests/detect/resolve.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Enforcement precedence: full > advisory > explicit-only (OpenClaw/Claude Code > Cursor/Copilot > Bedrock)
- Ambiguity is an error, not a warning -- forces explicit selection for deterministic compilation
- Error message must be actionable: include the exact claws.json snippet needed to resolve ambiguity
- PlatformTarget is immutable after resolution -- downstream phases read it, never modify it
- Resolution metadata tracks whether selection was auto-detected or config-overridden (for diagnostics)
