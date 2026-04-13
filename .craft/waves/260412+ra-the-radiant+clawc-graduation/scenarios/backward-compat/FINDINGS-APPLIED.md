# Findings Applied: backward-compat

**Date**: 2026-04-12
**Scenarios processed**: 3
**Total findings**: 31
**Major/warning applied**: 22
**Note severity skipped**: 9

---

## Summary of Changes

### CL-08 Package Architecture
- **Re-export stability**: re-exports must preserve old function names (not just new names), re-exported packages must be regular dependencies (not devDeps), class re-exports must be pass-through (not wrapper constructors)
- **Subpath migration**: each subpath export entry must be updated or shimmed (not left pointing at removed code), compat layer needs both exports map and physical dist/ shims for legacy TS resolution, explicit subpath entries for compat shims (no wildcards)
- **Type safety**: audit transitively exposed types in .d.ts (not just explicit exports), Extension Contract Rule 4 must apply to compiler-sdk compat layer, test re-export resolution with and without TS path aliases
- **Monolith downgrade**: freeze audit chain JSONL format before extraction, constraint C12 covers Layer 1 equivalence only (not Layer 2/3), explicitly exclude Layer 3 from downgrade guarantee
- **Migration tools**: provide bidirectional codemod for import path migration, downgrade script must include npm prune step, downgrade script must clear TS build cache and node_modules/.cache
- **Deprecation lifecycle**: JSDoc @deprecated (not runtime warnings) for re-export paths, define compat re-export lifecycle with removal milestone, coordinate craft-cli migration with shim deployment
- **Build pipeline**: validate exports map entries against actual dist/ files post-build, shim compilation must precede exports map validation, shims must use targeted subpath imports (not barrel imports)
- **CI validation**: automated re-export completeness check comparing old vs new export lists, periodic CI job for downgrade validation during compat window, minimum Node.js version for subpath export correctness
- **Documentation**: downgrade documentation must highlight lock file review, classify subpath usage as internal vs external to minimize compat surface, document new capabilities with no monolith equivalent

---

## Findings NOT Applied (note severity, skipped per rules)

9 findings with severity "note" were skipped.
