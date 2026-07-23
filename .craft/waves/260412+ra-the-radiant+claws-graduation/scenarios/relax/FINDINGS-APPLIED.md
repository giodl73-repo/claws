# Findings Applied: relax

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 36
**Major/warning applied**: 28
**Note severity skipped**: 8

---

## Summary of Changes

### CL-08 Package Architecture

- **Grammar independence**: grammar must not depend on governance types, identifier character set definition, discriminated union AST types
- **Round-trip fidelity**: serializer precedence-preserving parenthesization, string literal escape round-trip, numeric literal format preservation
- **AST semantics**: structural vs semantic equivalence definition, comment preservation in AST and serialization, whitespace preservation policy for embedded expressions
- **Binding resolution**: tier precedence as explicit ordered array, binding resolution provenance in evaluation result, shallow vs deep shadowing for structured bindings
- **Error reporting**: error position coordinates (expression-relative + optional file context), human-readable error messages (not parser-generator output), Unicode-aware error caret alignment
- **Error types**: ParseError type export with structured fields, stable error codes alongside human-readable messages, ParseError.toJSON() for fleet error aggregation
- **Standalone isolation**: tarball import scanner CI check, verify zero eval imports at extraction time, runtime environment portability requirement
- **Performance**: parser implementation strategy and size budget, tier resolution performance at fleet scale, eager vs lazy binding resolution
- **Testing**: property-based round-trip test strategy, encoding consistency between parser and serializer, multi-error recovery or clean single-error stopping

---

## Findings NOT Applied (note severity, skipped per rules)

8 findings with severity "note" were skipped.
