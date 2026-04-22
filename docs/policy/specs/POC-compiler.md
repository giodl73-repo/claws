# POC — Compiler public API

**Sub-spec of**: [PO-policy.md](./PO-policy.md)

## Entry points

```ts
function compile(workspace: WorkspaceAST): PolicyIR;
function validate(ir: PolicyIR): ValidationResult;

interface ValidationResult {
  readonly valid: boolean;
  readonly findings: ReadonlyArray<Finding>;
}

class PolicyCompileError extends Error {
  readonly source: 'parse' | 'classify' | 'chain' | 'emit';
  readonly sourceRange?: SourceRange;
}
```

`compile()` is pure: same `WorkspaceAST` → byte-identical `PolicyIR`.
The canonicalizer (WSC) enforces this.

`validate()` runs the 29 G-rule registry (see compiler-sdk internals,
normative: CM) against the IR. Returns findings with
`severity: 'BLOCK' | 'WARN'` and a `sourceRange` pointing back to the
originating AST node. Host tools surface findings in the workspace
UI.

## Incremental caching

```ts
interface CompilerCache {
  get(snapshotId: string): PolicyIR | undefined;
  put(snapshotId: string, ir: PolicyIR): void;
}

function compileWithCache(
  workspace: WorkspaceAST,
  cache: CompilerCache,
): PolicyIR;
```

Cache key is `snapshotId` (from the workspace's `claws.json`
`snapshotId` field). A workspace snapshot maps 1:1 to a compiled IR;
re-compile only on snapshot change. The cache is LRU-bounded in
typical host deployments (e.g., 100 entries).

Cache misses are just compile-then-put; the cache has no semantic
effect beyond performance.

## 29 G-rule registry

The compiler ships a registry of 29 governance rules (G-01 through
G-29) that classify and cross-check tool declarations:

- **G-01 through G-10**: tier classification rules
- **G-11 through G-20**: args_from chain rules (G-CHAIN family)
- **G-21 through G-29**: sensitivity propagation + clamping rules

The normative authority for the registry is the CM (compliance
matrix) in compiler-sdk; this package consumes the registry as
opaque. See [../guides/using-the-compiler.md](../guides/using-the-compiler.md)
for how the 29 rules manifest in findings.

## Error handling

`PolicyCompileError` is the only thrown error. The `source` field
names the phase (`parse`, `classify`, `chain`, `emit`); the optional
`sourceRange` points at the AST node that triggered the error.
Compiler never throws raw strings or `Error` instances — always
typed errors for downstream catching.
