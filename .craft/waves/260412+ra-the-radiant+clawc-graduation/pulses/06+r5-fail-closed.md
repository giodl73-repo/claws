---
pulse: 6
slug: r5-fail-closed
plan: claws-sdk-graduation
depends_on: [1, 2, 3, 4, 5]
governing_roles: [craft:security, craft:architect, claws:platform-eng]
scenario_codes: [governance/S01, governance/S02, execution/S02]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: true
---

# Pulse 06: R5 Fail-Closed Enforcement

## Objective

Implement R5 fail-closed enforcement for the free tier. This is the minimum viable security guarantee: when governance analysis produces ambiguous or conflicting results, the system MUST fail closed (deny) rather than fail open (allow). This is non-negotiable and non-configurable in the free tier -- there is no flag to disable it, no override, no escape hatch.

R5 fail-closed was moved to the free tier per R1 review finding C1: a compiler without fail-closed enforcement is governance theater. This pulse implements the enforcement layer that sits between analysis output and emit, rejecting any compilation where fail-closed violations are detected.

This is the CP-1 gate pulse. All prior infrastructure (readers, sidecar, IR, crypto, audit) must be stable before this lands.

## Deliverables

- [ ] `claws-sdk/src/compiler/enforce/types.ts` -- FailClosedResult (pass/fail discriminated union), FailClosedViolation (rule, context, severity, explanation), EnforcementConfig (always fail-closed in free tier -- config exists for paid tier extensibility but free tier ignores it)
- [ ] `claws-sdk/src/compiler/enforce/r5.ts` -- `enforceR5(analysis: GovAnalysis, workspace: OCWorkspaceIR): FailClosedResult` -- walks the analysis output, identifies ambiguous/conflicting rules, enforces fail-closed on every ambiguity. Returns violations list if any rule cannot be definitively resolved. ~200 lines
- [ ] `claws-sdk/src/compiler/enforce/guard.ts` -- `compileGuard(analysis: GovAnalysis, workspace: OCWorkspaceIR): void | never` -- top-level guard that calls enforceR5 and throws a typed CompilationDeniedError if violations exist. This is the gate that emit calls before generating output. Non-bypassable in free tier
- [ ] `claws-sdk/src/compiler/enforce/errors.ts` -- CompilationDeniedError (extends Error, carries violations array), formatted error message with rule-by-rule explanation of why compilation was denied
- [ ] `claws-sdk/src/compiler/enforce/index.ts` -- Barrel exports for enforce module
- [ ] `claws-sdk/tests/compiler/enforce/r5.unit.test.ts` -- L0: clean analysis passes R5 (1), ambiguous rule triggers fail-closed (1), conflicting rules trigger fail-closed (1), multiple violations collected (1), empty analysis passes (1), analysis with all rules resolved passes (1)
- [ ] `claws-sdk/tests/compiler/enforce/guard.integration.test.ts` -- L1: compileGuard passes clean analysis (1), compileGuard throws CompilationDeniedError on violation (1), error message includes rule-by-rule explanation (1), guard integrates with reader output and IR types (1)
- [ ] `claws-sdk/tests/compiler/enforce/r5.e2e.test.ts` -- L2: end-to-end R5 enforcement through full compile pipeline (1)
- [ ] `claws-sdk/tests/compiler/enforce/r5.accept.test.ts` -- L3: acceptance test verifying R5 cannot be bypassed: no config flag, no environment variable, no constructor option disables fail-closed in the free tier module (1)

## Acceptance Criteria

- [ ] R5 fail-closed CANNOT be disabled in the free tier -- no flag, no env var, no config
- [ ] Ambiguous governance rules always produce CompilationDeniedError
- [ ] Conflicting governance rules always produce CompilationDeniedError
- [ ] Clean governance analysis (all rules resolved) passes through
- [ ] CompilationDeniedError carries the full violations array with per-rule explanations
- [ ] The guard function is the single enforcement point -- emit must call it before generating output
- [ ] Uses OCWorkspaceIR from pulse 3 and reader integration from pulse 1
- [ ] Zero imports from `@craftworks/compiler-sdk` or `@craftworks/agent-sdk`
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/security.md` -- R5 fail-closed principle, non-negotiable security baseline
- `.craft/roles/craft/architect.md` -- enforcement layer placement, guard pattern, error design
- `.craft/roles/claws/platform-eng.md` -- SDK error patterns, typed error hierarchy

## Dependencies

- Pulse 1 (oc-workspace-readers) -- uses workspace model for enforcement context
- Pulse 2 (forma-sidecar-resolver) -- sidecar resolution must be stable before gate
- Pulse 3 (formir-types) -- uses OCWorkspaceIR and GovAnalysis types for enforcement input
- Pulse 4 (crypto-internalize) -- crypto module must be stable before gate
- Pulse 5 (audit-chain-local) -- audit chain must be stable before gate

## Test Gates

- [ ] L0 unit (6 tests): clean passes (1), ambiguous fails (1), conflicting fails (1), multiple violations (1), empty passes (1), all resolved passes (1)
- [ ] L1 integration (4 tests): guard passes clean (1), guard throws on violation (1), error includes explanation (1), reader+IR integration (1)
- [ ] L2 e2e (1 test): end-to-end R5 enforcement through full compile pipeline (1)
- [ ] L3 acceptance (1 test): R5 non-bypassable verification (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
