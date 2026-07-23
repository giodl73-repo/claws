# Findings Applied: workspace

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 31
**Major/warning applied**: 22
**Note severity skipped**: 9

---

## Summary of Changes

### CL-08 Package Architecture

- **Platform detection**: per-marker confidence rules (not just presence/absence), data-driven platform registry (not hardcoded enum), marker type annotation (file vs directory)
- **Discovery**: default directory exclusion list, circular symlink detection via canonical path tracking, configurable maxDepth with default of 5
- **Cross-platform normalization**: full 3-byte BOM check rejecting UTF-16 BOM, normalize replaces \r\n only preserving lone \r, single normalization implementation in workspace imported by forma
- **Path handling**: forward-slash normalized paths in discovery results, case-insensitive marker matching or canonical casing spec
- **Error handling**: structured error for inaccessible directories, graceful EPERM/EACCES/ENOENT handling, empty array return never null
- **API design**: AsyncIterable return type for discover(), combined discover+detect mode to avoid redundant reads, extensible platform registry via options parameter
- **Robustness**: symlink resolution with Windows EPERM fallback, closed-set marker matching (not pattern-based), exact marker name matching (no substring or fuzzy)
- **Performance**: performance budget and parallel traversal strategy, normalize performance for large files
- **Testing**: test fixture migration from compiler-sdk to workspace, minimum marker set and partial detection rules per platform

---

## Findings NOT Applied (note severity, skipped per rules)

9 findings with severity "note" were skipped.
