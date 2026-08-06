# Findings Applied: forma

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 36
**Major/warning applied**: 26
**Note severity skipped**: 10

---

## Summary of Changes

### CL-08 Package Architecture

- **Type ownership**: forma must define its own types, not re-export from compiler-sdk; .d.ts files must not reference compiler-sdk paths
- **Dependency isolation**: crypto as peer dependency (not dev), transitive dependency audit in CI, dynamic import scanning alongside static
- **IR contract**: public IR field contract excluding compiler internals, deterministic key ordering in serialize(), Zod-validated deserialization
- **Normalization**: BOM stripping before parse, line ending normalization before frontmatter, raw-bytes vs normalized-content hash semantics
- **Lossless fidelity**: raw Buffer comparison (not string), binary file detection in canvas/ to skip normalization, normalization boundary (forma for content, workspace for discovery)
- **Error handling**: collect-all-errors (no fail-fast), structured error wrapping for YAML/JSON parse failures, deterministic error ordering by file name
- **File semantics**: required vs optional file classification, empty file treated as empty content + warning, unclosed frontmatter as distinct error type
- **Serialization**: empty collections serialize as [] never null, unknown IR fields ignored not rejected, R-level representation must match compiler-sdk exactly
- **Testing**: standalone install fixture per Layer 1 package, combinatorial coverage for file presence/absence, subpath exports tested in standalone CI

---

## Findings NOT Applied (note severity, skipped per rules)

10 findings with severity "note" were skipped.
