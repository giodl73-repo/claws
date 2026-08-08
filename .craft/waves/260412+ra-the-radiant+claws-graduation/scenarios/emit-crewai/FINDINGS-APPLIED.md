# Findings Applied: emit-crewai

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 19
**Major/warning applied**: 13
**Note severity skipped**: 6

---

## Summary of Changes

### CL-08 Package Architecture

- **CrewAI integration**: CrewAI callback function signature compliance, crewai version targeting with explicit range, Python version compatibility validation
- **Enforcement modes**: soft vs hard governance enforcement mode, agent-level tool restriction support, Pydantic-based validation for output constraints
- **Zero-import enforcement**: sanitize governance rule descriptions in callbacks, sanitize Pydantic field descriptions, product name attribution in Python docstrings
- **Branding neutrality**: neutral branding in log messages, brand-free type alias names, neutral section markers in comments
- **Workspace markers**: regex-extractable marker for Python files, emitter-specific filename conventions, underscore prefix for internal marker constants
- **Marker design**: separate version and IR hash markers, documentation for companion file role, fallback scan for relocated Python files
- **Consumer experience**: dependency declaration for Python consumers

---

## Findings NOT Applied (note severity, skipped per rules)

6 findings with severity "note" were skipped.
