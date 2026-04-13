# Acceptance Test Scorecard

**Date**: 2026-04-12
**Wave**: Ptah the Craftsman (claws foundation)
**Pulse**: P31 — Acceptance Test Wiring + Full Run

## Summary

| Metric | Value |
|--------|-------|
| Total scenarios | 74 |
| Passed | 65 |
| Failed (known) | 9 |
| Skipped | 0 |
| Pass rate | **87.8%** |
| Compile-pipeline failures | **0** |
| Known failures (it.fails) | 9 (7 rule gaps + 2 security-blocked) |

## Per-Series Results

| Series | Runner | Scenarios | Pass | Fail | Rate |
|--------|--------|-----------|------|------|------|
| compile-pipeline | compile-sim | 8 | 8 | 0 | 100% |
| governance-rules | pinch-sim | 12 | 5 | 7 | 42% |
| fail-mode | pinch-sim, security-sim | 6 | 4 | 2 | 67% |
| emit-artifacts | emit-sim | 8 | 8 | 0 | 100% |
| cross-file-conflicts | compile-sim | 7 | 7 | 0 | 100% |
| input-resolver | compile-sim | 6 | 6 | 0 | 100% |
| loss-aware-emission | emit-sim | 5 | 5 | 0 | 100% |
| pitfall-coverage-1 | compile-sim, emit-sim | 10 | 10 | 0 | 100% |
| lossless-roundtrip | compile-sim | 5 | 5 | 0 | 100% |
| platform-detection | emit-sim | 7 | 7 | 0 | 100% |

## Failure Analysis

### Category 1: Rule Implementation Gaps (7 failures)

Governance-rules scenarios that test specific rule violations. The rules are
registered and evaluated, but the current implementations don't produce the
expected violations for these specific test conditions.

| Scenario | Expected | Actual | Root Cause |
|----------|----------|--------|------------|
| S02-g-perm-capability | G-PERM violation (workspace capability mismatch) | No G-PERM violation | G-PERM-01 checks OBO+risk mismatch, not workspace capability matrix |
| S03-g-data-sensitivity | G-DATA violation (sensitivity ceiling) | No G-DATA violation | G-DATA rules need workspace-extracted sensitivity ceiling |
| S04-g-a2a-trust | G-A2A-TRUST violation (no trust declaration) | No G-A2A-TRUST violation | G-A2A-TRUST checks escalation, not missing trust declarations |
| S06-g-input-isolation | G-INPUT violation (injection boundary) | No G-INPUT violation | G-INPUT rules don't detect injection patterns in single-tool setups |
| S07-g-context-memory | G-CONTEXT violation (memory isolation) | No G-CONTEXT violation | G-CONTEXT rules only fire on multi-agent setups |
| S08-g-output-pii | G-OUTPUT violation (PII in output) | No G-OUTPUT violation | G-OUTPUT rules don't detect PII patterns |
| S11-g-elicit-timeout | G-ELICIT-TIMEOUT violation (deny-default) | G-ELICIT-GATE fires, not TIMEOUT | TIMEOUT checks explicit `allow`, not absence of timeout config |

**Resolution**: Rule enrichment in Anubis wave (governance depth). Each gap maps
to a spec amendment (CL-02).

### Category 2: SECURITY-BLOCKED — R5 Fail-Closed (2 failures)

R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis.
Compile-time analysis cannot model hook crash/timeout behavior.

| Scenario | Expected | Root Cause |
|----------|----------|------------|
| S04-hook-crash-r5 | blocked=true (hook crash detection) | SECURITY-BLOCKED: R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis |
| S06-hook-timeout-r5 | blocked=true (hook timeout detection) | SECURITY-BLOCKED: R5 fail-closed requires runtime enforcement (CL-03), deferred to Anubis |

**Resolution**: Runtime enforcement layer (Anubis wave, CL-03). These scenarios use `it.fails()` in tests.

### Category 3: Emit Feature Gaps (2 failures — RESOLVED)

| Scenario | Expected | Root Cause | Status |
|----------|----------|------------|--------|
| S02-full-emit-workflow | "workflow" artifact type | `invertWorkflow` emitter not wired in emit-sim | **FIXED**: GW-1 wired invertWorkflow() call |
| S10-catch-clause-crash | 4 artifacts | Emit produced 3; 4th is workflow | **FIXED**: GW-1 wired invertWorkflow() call |

**Resolution**: invertWorkflow() now called in emit-sim when scenario expects workflow artifact.

## Platform Detection: KNOWN GAP (PL-1)

Platform detection scenarios expect 6 fields not yet in the GovernanceIR type
system: `platform_detected`, `detection_confidence`, `detection_source`,
`marker`, `default_trust_tier`, `enforcement`. These are scenario-level
expectations that will be wired when GovernanceIR adds platform metadata
(Anubis wave, CL-01 platform spec). Noted in `expect-ir.ts` with
`// KNOWN GAP` comment.

## Infrastructure Rules

The following rule IDs fire universally on simplified test fixtures and are
filtered from zero-violation assertions:

- **G-CLASS-02**: Tools with 'custom' classification (all fixtures)
- **G-DATA-NOLABEL**: No sensitivity ceiling in AGENTS.md (all fixtures)
- **G-PERM-01**: Tool capability not declared in TOOLS.md (all fixtures)
- **G-ELICIT-GATE**: R5 tools without elicitation config (fixtures lack elicit policy)
- **G-ELICIT-PREAUTH**: R5/OBO tools ungoverned by USER.md (fixtures lack user authority)

## Test Infrastructure

- 10 test entry points across 4 directories (compile/, check/, emit/, pitfalls/)
- 5 runner types: compile-sim, pinch-sim, emit-sim, security-sim, fleet-sim (stub)
- Manifest-driven discovery: `scenarios/manifest.yaml` defines series and min counts
- Config extraction: A2A, ELICIT, DATA rule configs derived from parsed manifest
- Workspace builder: copies `00+workspace/` to temp dir for isolation

## Parser Improvements (P31)

- `classifyRisk`: now parses explicit `- Risk: R<N>` declarations in TOOLS.md
- `detectOBO`: now parses explicit `- OBO: true` declarations in TOOLS.md
- Both changes improve R5/OBO detection for structured tool descriptions
