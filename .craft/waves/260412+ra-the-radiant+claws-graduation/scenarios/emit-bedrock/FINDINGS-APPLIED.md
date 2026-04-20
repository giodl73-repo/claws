# Findings Applied: emit-bedrock

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 19
**Major/warning applied**: 13
**Note severity skipped**: 6

---

## Summary of Changes

### CL-08 Package Architecture
- **API compliance**: target API version declaration and schema validation, service limit awareness and overflow handling, configurable severity-to-filter-strength mapping
- **Unmappable rules**: unmappable rule detection and reporting, environment-specific value parameterization, deployment instructions alongside output
- **Zero-import enforcement**: description field must use product name, human-readable topic policy names, filter internal terminology from word lists
- **Output sanitization**: strip build environment paths from JSON output, deep JSON scan for all string values, resource tag sanitization
- **Workspace markers**: marker must not violate Bedrock API schema, marker size constraint for description embedding, configurable output path for Bedrock emitter
- **AWS integration**: AWS tag naming compliance for marker tags, deployment readiness indicator, multi-guardrail detection
- **Traceability**: governance traceability in guardrail description

---

## Findings NOT Applied (note severity, skipped per rules)

6 findings with severity "note" were skipped.
