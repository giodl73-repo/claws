# Governance Rules Scenario Findings -- Applied

**Date**: 2026-04-11
**Source**: 12 scenarios (S01-S12), 84 total findings
**Applied**: 60 findings (major + warning severity)
**Skipped**: 24 findings (note severity -- informational only)

---

## Summary

| Scenario | Major | Warning | Note | Total |
|----------|-------|---------|------|-------|
| S01 G-CLASS risk scoring | 2 | 3 | 2 | 7 |
| S02 G-PERM capability | 3 | 2 | 1 | 6 |
| S03 G-DATA sensitivity | 2 | 3 | 2 | 7 |
| S04 G-A2A trust | 3 | 2 | 2 | 7 |
| S05 G-A2A identity | 2 | 3 | 2 | 7 |
| S06 G-INPUT isolation | 3 | 2 | 1 | 6 |
| S07 G-CONTEXT memory | 3 | 2 | 2 | 7 |
| S08 G-OUTPUT PII | 3 | 3 | 1 | 7 |
| S09 G-BOUND step limit | 2 | 3 | 1 | 6 |
| S10 G-ELICIT approval | 3 | 3 | 1 | 7 |
| S11 G-ELICIT timeout | 3 | 2 | 1 | 6 |
| S12 G-SUPPLY unsigned | 3 | 3 | 1 | 7 |
| **Total** | **32** | **28** | **24** | **84** |

---

## Documents Modified

### 1. CL-02 Security Model Spec
**File**: `design/claws/specs/CL-02-security-model.md`
Added "Scenario-Driven Amendments" section with 54 amendments (A1-A54). Resolved Open Question #1.

### 2. PITFALLS.md
**File**: `design/claws/PITFALLS.md`
Added Category 16 with 16 new pitfalls (P-084 through P-099). Updated summary: 90 total (was 74).

### 3. claws-rules Plan
**File**: `.craft/plans/claws-rules.md`
Added 47 scenario finding checklist items + 28 new test additions.

### 4. claws-governance-ir Plan
**File**: `.craft/plans/claws-governance-ir.md`
Added 10 IR type impact items.

### 5. Governance Guides (5 files)
- `docs/claws/governance/tool-classification.md` -- classification precedence, overrides, platform built-in tables, R1 audit failure
- `docs/claws/governance/obo-boundary.md` -- OBO overrides section
- `docs/claws/governance/elicitation-gate.md` -- policy completeness, per-tool timeouts, audit dependency, subagent independence
- `docs/claws/governance/defense-in-depth.md` -- injection defense Guardrail Sandwich with sub-rule codes
- `docs/claws/governance/fail-mode.md` -- R1 audit failure, platform deny-on-timeout override, configurable bound severity

---

## Key Themes

1. **Compile-time vs runtime boundary**: G-INPUT, G-CONTEXT, G-OUTPUT, G-DATA check configuration at compile time. Runtime enforcement is CL-03.
2. **Closed enums and normalization**: Capability names, data sensitivity labels, identity levels. Non-standard values produce parse errors.
3. **Rule dependency ordering**: A2A rules cascade from G-A2A-TRUST. Downstream rules suppressed when prerequisite fails.
4. **Per-entity granularity**: Redaction per channel, sensitivity per entry, timeout per tool, severity per environment.
5. **Cross-reference validation**: Tool names, audit chain + elicitation, token signing + approval policies.
6. **Configurable strictness**: G-PERM, G-BOUND, G-SUPPLY, G-A2A-IDENTITY support warning vs error per environment.
