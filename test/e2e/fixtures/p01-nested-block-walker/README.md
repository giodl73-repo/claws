# p01-nested-block-walker — SC-05 F-02 fixture

Three synthetic TypeScript sources, each assigning `policyArtifactSha256`
inside a distinct nested-block shape (`if`, `try`, `for`). The codegen-lint
AST walker (`harness/lint-rules/no-post-await-assign.ts`) must flag each
one. A top-level-only walker would leave these paths open and regress the
CL-07 Rule-1 "capture pre-await" discipline.

| File | Nested kind | Expected depth |
|---|---|---|
| `if-nested.ts` | `if (cond) { ... }` | 1 |
| `try-nested.ts` | `try { ... } catch { }` | 1 |
| `for-nested.ts` | `for (const item of items) { ... }` | 1 |

Consumed by `scenarios/p01-decision-start-capture.e2e.test.ts` (D1 negative
control) and by `harness/__tests__/codegen-lint-nested-walker.unit.test.ts`
(D6 conformance suite).
