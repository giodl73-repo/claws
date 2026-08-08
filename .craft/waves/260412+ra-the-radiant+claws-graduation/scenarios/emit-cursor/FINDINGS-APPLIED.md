# Findings Applied: emit-cursor

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 18
**Major/warning applied**: 13
**Note severity skipped**: 5

---

## Summary of Changes

### CL-08 Package Architecture

- **MDC output**: mandatory MDC frontmatter field mapping from IR, default activation strategy when IR lacks file scope, MDC file naming conventions
- **File management**: managed vs user file separation in .cursor/rules/, rule consolidation threshold for large governance sets, generation report for rule-to-file mapping
- **Zero-import enforcement**: type references must become natural language, code examples must use platform-native imports, user-friendly descriptions in MDC frontmatter
- **Content sanitization**: strip internal documentation links, format-aware scanning for MDC files, markdown formatting quality in MDC body
- **Workspace markers**: non-intrusive marker strategy for MDC files, forward-compatible marker for Cursor MDC, managed file counting must exclude user files
- **Lifecycle**: cache invalidation for deleted rule files, manifest file for Cursor rule management, domain-level governance coverage reporting

---

## Findings NOT Applied (note severity, skipped per rules)

5 findings with severity "note" were skipped.
