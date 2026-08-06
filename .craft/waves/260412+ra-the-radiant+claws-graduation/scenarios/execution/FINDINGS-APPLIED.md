# Findings Applied: execution

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 36
**Major/warning applied**: 28
**Note severity skipped**: 8

---

## Summary of Changes

### CL-08 Package Architecture

- **Task graph ordering**: stable topological sort with alphabetical tie-breaking, parallel eligibility via reachability (not just direct edges), O(V+E) scheduling algorithm
- **Failure isolation**: partial failure isolation (block dependents, not siblings), transitive block propagation with root cause tracing, report first cycle with note about additional cycles
- **Quality gates**: gate conditions as RELAX expressions (not eval'd strings), gate evaluation at producer completion (not consumer start), gate evaluation errors fail closed (R5 principle)
- **Pipeline status**: task state enum (completed/blocked/failed/pending), pipeline status (complete/partial/failed), multi-gate failure aggregation in execution result
- **Skill resolution**: subpath exports for task graph vs skill resolution, skill resolution decoupled from scheduling execution, skill resolver accepts pre-parsed input (does not import forma)
- **Cycle detection**: cycle detection at graph construction (not scheduling), TaskCycleError with typed cycle path and edge suggestion, implicit cycle detection through skill resolution chains
- **Builder pattern**: builder pattern with transactional validation at build(), immutable-after-build or incremental validation on mutation, mandatory validation with no skip flag
- **Module design**: ESM build with tree-shakeable entry points, lazy governance import for skill-only consumers, error wrapping at package boundary (context to execution)
- **Testing**: dry-run mode for ordering analysis without execution, critical path computation API, changelog separation for merged subsystems

---

## Findings NOT Applied (note severity, skipped per rules)

8 findings with severity "note" were skipped.
