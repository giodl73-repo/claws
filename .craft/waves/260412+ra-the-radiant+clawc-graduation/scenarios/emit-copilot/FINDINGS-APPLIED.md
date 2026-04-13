# Findings Applied: emit-copilot

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 18
**Major/warning applied**: 13
**Note severity skipped**: 5

---

## Summary of Changes

### CL-08 Package Architecture
- **Size awareness**: size-aware instruction generation with priority ranking (Copilot has ~8KB effective context limit), warn when output exceeds effective size limit
- **Visibility control**: visibility filtering for public-repo governance, sensitive governance details must not appear in .github/ directory
- **Output format**: section-delimited merge with existing instructions, deep merge for VS Code settings, enforce canonical .github/ output path
- **Zero-import enforcement**: code examples in instructions must be craftworks-free, settings values must use standard Copilot schema, translate internal terminology for Copilot
- **Content sanitization**: strip internal documentation links, strip or replace internal rule IDs, build-path leak detection in Copilot output
- **Workspace markers**: GitHub-safe marker format for .github/ files, brand-neutral marker option for public repos, invisible marker in GitHub rendered view
- **Output quality**: instruction style optimization for Copilot, generation metadata in instructions file, marker deduplication on re-emission

---

## Findings NOT Applied (note severity, skipped per rules)

5 findings with severity "note" were skipped.
