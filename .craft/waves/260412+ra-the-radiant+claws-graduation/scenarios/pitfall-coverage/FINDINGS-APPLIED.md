# Findings Applied: pitfall-coverage

**Date**: 2026-04-12
**Scenarios processed**: 20
**Total findings**: 119
**Major/warning applied**: 101
**Note severity skipped**: 18

---

## Summary of Changes

### CL-08 Package Architecture

Pitfall-coverage scenarios validated detection and prevention mechanisms for 20 package extraction pitfalls (P-250 through P-269). Findings reinforce and extend constraints C13-C62 from the package acceptance scenarios.

**Dependency isolation** (P-250, P-251, P-252, P-253, P-266, P-269):

- CI must scan .d.ts files for compiler-sdk path references (C14, C15)
- Diamond dedup verified via `npm ls --all` per package (C60)
- Governance singleton guarantee requires npm dedup verification

**Import and re-export stability** (P-254, P-255, P-267):

- Re-export audit must compare old vs new export lists in CI (C54, C57)
- Subpath export validation against actual dist/ files (C55)
- Wildcard re-export ban enforced at build time (C2)

**Emitter isolation** (P-256, P-257):

- Zero @craftworks/ references in output verified per emit (C42)
- Platform marker alignment tested bidirectionally with workspace detection (C43)

**Audit chain** (P-258, P-268):

- Chain format frozen before extraction with version field (C26)
- Cross-verification regression test permanent (C27)

**Fleet operations** (P-259, P-260, P-261, P-262):

- Resolved version comparison via lock files (C47)
- Broadcast uses --save-exact (C51)
- Partial failure resilience with corrupted-state escalation (C50)
- GovernanceIR version compatibility check in manifest (C46)

**Build/publish** (P-264, P-265):

- EmitRegistry validation at registration time (C34)
- Graceful missing-emitter handling (C36)

**Backward compatibility** (P-263):

- Pipeline equivalence normalization boundary documented (C18)
- Bidirectional codemod covers normalization differences (C56)

---

## Findings NOT Applied (note severity, skipped per rules)

18 findings with severity "note" were skipped. No note-severity findings warranted promotion to open questions — all significant concerns were already captured as major or warning.
