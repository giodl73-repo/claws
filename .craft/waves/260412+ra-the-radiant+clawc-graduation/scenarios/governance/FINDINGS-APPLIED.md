# Findings Applied: governance

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 34
**Major/warning applied**: 25
**Note severity skipped**: 9

---

## Summary of Changes

### CL-08 Package Architecture
- **Unified import**: re-export ordering (primitives before runtime before budget), named re-exports only for tree-shaking, subpath exports alongside root re-exports
- **Name collision prevention**: exported name collision audit during merge, internal module boundaries preserved after merge, .d.ts must preserve JSDoc comments on re-export
- **PolicyWalker consistency**: G-rule evaluation order G01-G29 sequential, depth-first pre-order traversal, equivalence comparison by decision + gate ID (not message text)
- **Budget isolation**: BudgetTracker constructor accepts limit + optional crypto only, no module-level side effects in index.ts, signing is optional not required
- **Type safety**: exhaustive switch on GateType with never default, numeric comparison tests for all RiskLevel boundaries, FailModePolicy optional fields with explicit defaults
- **Version coherence**: singleton version check or peerDependency enforcement, number for agent budgets but BigInt for fleet aggregation, declaration maps enabled in tsconfig
- **Migration**: migration checklist for all consumers of the 3 old packages, crypto as optional peer for budget-only consumers, structural test ensuring single type source with no copies
- **Fleet integration**: fleet aggregation uses generic BudgetSource interface, BudgetTracker accepts pluggable cost function, BudgetTracker standalone bundle size < 50KB
- **Testing**: snapshot-based gate decision regression tests, equivalence test compares pure inputs/outputs only, equivalence test lifecycle from migration to regression

---

## Findings NOT Applied (note severity, skipped per rules)

9 findings with severity "note" were skipped.
