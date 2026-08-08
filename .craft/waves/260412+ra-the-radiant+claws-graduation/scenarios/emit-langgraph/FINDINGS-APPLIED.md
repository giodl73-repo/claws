# Findings Applied: emit-langgraph

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 19
**Major/warning applied**: 13
**Note severity skipped**: 6

---

## Summary of Changes

### CL-08 Package Architecture

- **Python output**: Python syntax validation with target version, LangGraph node function signature compliance, Python 3.9+ compatible type annotations
- **Framework targeting**: langgraph version targeting and declaration, non-exception governance enforcement pattern, graceful import error with install guidance
- **Zero-import enforcement**: complete template substitution verification, sanitize IR descriptions in Python strings, product name in Python docstrings
- **Cross-language isolation**: sanitize embedded JSON examples, multi-convention scan for cross-language emitters, source attribution via rule ID (not file path)
- **Workspace markers**: marker must be statically extractable from Node.js, lint-friendly marker constant naming, configurable Python filename for detection
- **Staleness detection**: IR hash in Python marker for staleness detection, source-only detection (not bytecode), Python package context in detection report
- **Output metadata**: version metadata in emitted Python

---

## Findings NOT Applied (note severity, skipped per rules)

6 findings with severity "note" were skipped.
