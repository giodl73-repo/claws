# FINDINGS-APPLIED: fail-mode + emit-artifacts Scenario Series

**Date**: 2026-04-11
**Scope**: 6 fail-mode scenarios (39 findings) + 8 emit-artifacts scenarios (53 findings)
**Applied**: All major and warning findings (74 total)
**Skipped**: note-severity findings (18 total)

---

## Summary

Two scenario series were analyzed and applied to claws design documents:

1. **fail-mode** (S01-S06): Tests R5 fail-closed prevention, R1 fail-open behavior, R3-R4 configurable fail modes, hook crashes at R5/R1, and hook timeouts. 39 findings total.
2. **emit-artifacts** (S01-S08): Tests minimal/full artifact emission, plugin hook registration, SKILL.md governance advisory, exec-approvals matching, plugin timeout, R5 deny-on-error, and zero-craftworks-imports. 53 findings total.

### Finding Severity Distribution

| Series | Major | Warning | Note | Total |
|--------|-------|---------|------|-------|
| fail-mode | 16 | 14 | 9 | 39 |
| emit-artifacts | 24 | 20 | 9 | 53 |
| **Total** | **40** | **34** | **18** | **92** |

### Applied: 74 findings (40 major + 34 warning)
### Skipped: 18 findings (note severity)

---

## Documents Modified

### Specs

| Spec | Changes |
|------|---------|
| CL-02-security-model.md | CB-01 expanded: catch clause simplicity, error sanitization, hardened audit, secondary audit, global fail mode override, R3-R4 defaults, risk branching testing, configured vs default precedence, hook time complexity. Runtime integrity gains 4th layer. |
| CL-03-runtime-enforcement.md | Fail-mode implementation: pre-computed risk map, hardened audit, secondary audit, sanitized errors. New: persistent failure detection, block reason formatting, governance recovery, error type classification, handler interruptibility, runner independence, handler presence monitoring, configurable timeout, per-call vs per-workflow budget, performance context. |
| CL-04-compilation-pipeline.md | EMIT section: 45+ new constraints from emit-artifacts findings. Workflow inversion: branch-aware injection. Constraints: atomic emit, cross-artifact consistency, PRESS safety, post-emit verification. |

### Pitfalls (PITFALLS.md)

Category 15: P-070 through P-083 (14 new pitfalls, 2 critical + 11 high + 1 medium)

### Plans

| Plan | Changes |
|------|---------|
| claws-emit.md | 36 new finding items + 22 new test items |
| claws-governance-ir.md | 10 new finding items |

### Guides

| Guide | Changes |
|-------|---------|
| docs/claws/governance/fail-mode.md | R3-R4 defaults, global override, reclassification, block formatting, secondary audit, persistent recovery, R5 reclassification workaround |
| docs/claws/governance/defense-in-depth.md | Sidecar table: persistent failure detection, error classification, handler unregistration. Recovery section. |
| docs/claws/architecture/governance-plugin.md | Catch clause minimalism, AbortSignal propagation, error type distinction, async errors, missing rule tables, post-emit verification, TS targeting, Node.js compat |
| docs/claws/architecture/compiler.md | Core invariants expanded 5 to 8: atomic emit, cross-artifact consistency, PRESS safety keywords |

---

## Themes

The 74 applied findings cluster into 8 themes:

1. **Catch clause defense hardening** (10 findings): Pre-computed risk maps, minimal catch clauses, fallback-to-closed on unknown tools, async error handling, risk branching exhaustive testing.
2. **Audit trail resilience** (5 findings): Hardened audit in crash path, secondary audit via stderr, performance context in timeout events, fail-open event forensics.
3. **Artifact emission correctness** (12 findings): Atomic emit, cross-artifact consistency, OC plugin scaffold, workflow-plugin name contract, compiled workflow validation, overwrite strategy.
4. **Platform compatibility** (6 findings): Node.js version polyfills, TS version targeting, platform field name mapping, OC API version compat, platform-specific timeout code.
5. **PRESS and SKILL.md quality** (5 findings): Safety-critical keyword preservation, instruction quality, provenance invisibility, size management, compression level config.
6. **exec-approvals correctness** (5 findings): Schema conformance, staleness detection, built-in tool inclusion, custom overrides, TOOLS.md change triggers.
7. **Timeout and latency** (6 findings): Configurable hook timeout with ceiling, AbortSignal propagation, side effect cleanup, per-call vs per-workflow budgets, handler interruptibility.
8. **Fail-mode configuration** (7 findings): R3-R4 default documentation, global override, reclassification impact, configured vs default precedence, R5 reclassification workaround, error code registry.
