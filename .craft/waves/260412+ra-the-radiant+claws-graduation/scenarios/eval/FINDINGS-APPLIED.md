# Findings Applied: eval

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 33
**Major/warning applied**: 23
**Note severity skipped**: 10

---

## Summary of Changes

### CL-08 Package Architecture

- **Zero dependencies**: eval row must show zero @craftworks/ deps in dependency matrix, dual-format export requirement (CJS + ESM) for all core packages
- **Rubric validation**: weight validation invariant in createRubric contract, schema version in EvaluationResult type, error message quality requirements for factory functions
- **Pass@k evaluation**: must evaluate all samples (not short-circuit), statelessness requirement for multi-sample evaluation, separate PassAtKResult fields for boolean vs statistical
- **Assertion composability**: AND combinator must evaluate all operands for diagnostics, NOT must preserve inner diagnostic verbatim, OR diagnostic must highlight decisive operand
- **Assertion types**: Assertion interface must return AssertionResult (not boolean), assertion-level error containment for regex patterns, optional labels for composite assertion nodes
- **Serialization**: assertion serialization strategy (registry vs rejection), weight serialization precision strategy, mandatory schema version in serialized rubric format
- **Determinism**: structural equality comparison method, deterministic evaluation mode for testing, k=1 equivalence with single-sample evaluation
- **Packaging**: install size budget per package tier, type export surface requirements, UTF-8 encoding requirement for serialized rubrics
- **Testing**: diagnostic detail level for criterion results, dual serialization for diagnostic trees, metadata preservation requirement in serialization

---

## Findings NOT Applied (note severity, skipped per rules)

10 findings with severity "note" were skipped.
