---
pulse: 8
slug: nested-paths-loss-matrix
plan: claws-detect
depends_on: [7]
governing_roles: [claws:platform-eng, craft:architect]
scenario_codes: [detect/copilot-nested, detect/case-sensitive-linux]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/detect/"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 08: Nested Paths + Forward-Compat + Loss Matrix

## Objective

Extend detection to handle nested marker file locations, forward-compatible
platform patterns, and wire detection results into the Spec 108 loss matrix
with enforcement capability scores.

**Nested paths**: `.github/copilot-instructions.md` lives inside a
subdirectory. `.cursor/` directory (not just `.cursorrules` file) is the
forward-compatible Cursor detection path. CrewAI detection checks
`crewai.yaml`, `crew.yaml`, AND `pyproject.toml` with CrewAI markers.

**Forward-compat**: New platform versions may introduce new marker locations.
Detection uses an extensible `MarkerSpec[]` registry so new markers can be
added without modifying the detection orchestrator.

**Loss matrix**: Detection results feed Spec 108 loss matrix with
per-platform enforcement capability scores. Each platform has a capability
vector: `{ deny: bool, trust_tier: bool, audit: bool, emit: bool }`.
Advisory platforms (Cursor, Copilot) have `deny: false, trust_tier: false`
-- the loss matrix records what governance capabilities are lost on that
platform.

## Deliverables

- [ ] `claws-sdk/src/detect/markers/copilot.ts` -- MODIFY: add .copilot/ directory detection alongside .github/copilot-instructions.md
- [ ] `claws-sdk/src/detect/markers/cursor.ts` -- MODIFY: add .cursor/ directory forward-compat detection alongside .cursorrules file
- [ ] `claws-sdk/src/detect/markers/crewai.ts` -- MODIFY: add pyproject.toml with CrewAI markers detection
- [ ] `claws-sdk/src/detect/types.ts` -- MODIFY: add MarkerSpec registry type, EnforcementCapabilityVector, LossMatrixEntry
- [ ] `claws-sdk/src/detect/marker-registry.ts` -- NEW: extensible MarkerSpec[] registry for all 7 platforms with nested path specs
- [ ] `claws-sdk/src/detect/loss-matrix.ts` -- NEW: `computeLossMatrix(target: PlatformTarget): LossMatrixEntry[]` -- per-platform capability loss scoring
- [ ] `claws-sdk/src/detect/index.ts` -- MODIFY: re-export marker-registry, loss-matrix
- [ ] `claws-sdk/tests/detect/markers/copilot.unit.test.ts` -- MODIFY: add nested .github/ path test, .copilot/ directory test
- [ ] `claws-sdk/tests/detect/markers/cursor.unit.test.ts` -- MODIFY: add .cursor/ directory forward-compat test
- [ ] `claws-sdk/tests/detect/loss-matrix.unit.test.ts` -- NEW: 2 L0 tests (advisory loss, full enforcement no-loss)
- [ ] `claws-sdk/tests/detect/nested-paths.integration.test.ts` -- NEW: 2 L1 tests (nested Copilot detection, .cursor/ directory detection)

## TDD Tests

### L0 Unit (5)

- `.github/copilot-instructions.md` detected as Copilot platform -> `tests/detect/markers/copilot.unit.test.ts`
- `.cursor/` directory detected as Cursor platform (forward-compat, .cursorrules absent) -> `tests/detect/markers/cursor.unit.test.ts`
- `crewai.yaml` and `crew.yaml` both detected as CrewAI; pyproject.toml with CrewAI markers also detected -> `tests/detect/markers/crewai.unit.test.ts`
- Loss matrix for advisory platform (Cursor) shows `deny: false, trust_tier: false` -> `tests/detect/loss-matrix.unit.test.ts`
- Loss matrix for full-enforcement platform (OpenClaw) shows all capabilities true -> `tests/detect/loss-matrix.unit.test.ts`

### L1 Integration (2)

- Full detect on workspace with `.github/copilot-instructions.md` in nested path -> `tests/detect/nested-paths.integration.test.ts`
- Full detect on workspace with `.cursor/` directory (no .cursorrules file) -> `tests/detect/nested-paths.integration.test.ts`

## HC-BLOCK Findings Addressed

- Nested marker file detection: .github/copilot-instructions.md was not reachable by root-only scanning
- Forward-compat: .cursor/ directory detection prevents breakage when Cursor deprecates .cursorrules
- Loss matrix: per-platform capability scores enable governance gap reporting

## Acceptance Criteria

1. `.github/copilot-instructions.md` in nested path is detected as Copilot platform
2. `.cursor/` directory is detected as Cursor even without `.cursorrules` file
3. `pyproject.toml` with CrewAI markers is detected as CrewAI platform
4. MarkerSpec registry is extensible: new platform markers can be added without modifying detect.ts
5. Loss matrix correctly scores advisory platforms as losing deny + trust_tier capabilities
6. Loss matrix for full-enforcement platforms shows no capability loss
7. Detection feeds Spec 108 loss matrix via `computeLossMatrix()` return value

## Governing Roles

| Role | File | Focus |
|------|------|-------|
| claws:platform-eng | `.craft/roles/claws/platform-eng.md` | Nested path accuracy, forward-compat patterns, marker registry extensibility |
| craft:architect | `.craft/roles/craft/architect.md` | Loss matrix design, enforcement capability vector, Spec 108 integration |

## Dependencies

- **Pulse 07** (multi-platform-resolution): `resolve()` must return PlatformTarget for loss matrix input
- **Pulse 06** (platform-marker-detection): per-platform marker detectors must exist for modification

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/detect/
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Root-only scanning by default -- nested paths are opt-in via MarkerSpec configuration
- MarkerSpec registry pattern: `{ platform, paths: string[], nested: boolean, validator?: (content) => boolean }`
- Loss matrix is read-only output -- downstream phases consume it for reporting, never modify it
- Forward-compat: marker detectors check BOTH legacy and new locations, prefer new when both exist
- Case sensitivity: marker paths are case-sensitive on Linux, case-insensitive on Windows/macOS

## Review Amendments (R1)

### C03: Loss Matrix Consolidation
- [ ] Loss matrix data lives in `claws-sdk/src/types/loss-matrix.ts` (single source of truth)
- [ ] `detect/capability-scores.ts` imports loss-matrix types for platform scoring
- [ ] `emit/route-selector.ts` imports same loss-matrix types for path scoring
- [ ] No duplicate loss matrix implementation — both modules share the type
