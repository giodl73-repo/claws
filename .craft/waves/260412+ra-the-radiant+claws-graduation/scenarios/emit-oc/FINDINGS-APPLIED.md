# Findings Applied: emit-oc

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 21
**Major/warning applied**: 15
**Note severity skipped**: 6

---

## Summary of Changes

### CL-08 Package Architecture

- **Dependency contract**: emit-oc dependency must be codegen-only, codegen as peer dependency for dedup, IR completeness validation before emission
- **Output isolation**: emitted code must use platform-native imports only, runtime error messages must be platform-native, emitted package.json must be craftworks-free
- **Zero-import enforcement**: type-only imports also violate zero-import rule, zero-import scan must cover comments and strings, provenance stripping in emitted output
- **Output semantics**: emitters must create output directories, overwrite semantics for existing output, generation metadata header in emitted files
- **Workspace markers**: marker format must be centralized in codegen, marker format must be formatter-resistant, marker version must track emitter package version
- **Detection**: fallback detection for missing markers, staleness detection via IR hash in marker, O(1) detection via known output path
- **Testing**: CI automation for zero-import verification, source map path sanitization, multi-platform detection support

---

## Findings NOT Applied (note severity, skipped per rules)

6 findings with severity "note" were skipped.
