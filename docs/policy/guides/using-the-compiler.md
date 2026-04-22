---
covers: [atom:POC, atom:POC/tool-pattern]
---

# Using the compiler

This guide walks through the end-to-end compile → validate → consume
flow. For your first policy from scratch, start at
[../tutorials/first-policy.md](../tutorials/first-policy.md).

## Compile a workspace

```ts
import { parse } from '@bic/openclaw-workspace/parse';
import { compile, validate } from '@bic/openclaw-policy/compile';

const workspace = parse(readWorkspace('/path/to/ws/'));
const ir = compile(workspace);
const result = validate(ir);

if (!result.valid) {
  for (const f of result.findings) {
    console.error(`[${f.severity}] ${f.rule}: ${f.message}`);
  }
  process.exit(1);
}
```

## Use the IR

```ts
for (const [name, tool] of ir.tools) {
  console.log(`${name}: declared=${tool.declaredTier} effective=${tool.effectiveTier} fail=${tool.failMode}`);
}
```

`effectiveTier` differs from `declaredTier` when `args_from` chains
propagate sensitivity (G-CHAIN). A tool declared R1 with an
`args_from` chain that includes a RESTRICTED classifier compiles to
effective R5.

## Cache between snapshots

```ts
import { compileWithCache, makeCache } from '@bic/openclaw-policy/compile';

const cache = makeCache({ capacity: 100 });

// First call: full compile, cache put.
const ir1 = compileWithCache(workspace, cache);

// Workspace unchanged (same snapshotId): cache hit.
const ir2 = compileWithCache(workspace, cache);
console.log(ir1 === ir2);  // true
```

## 29 G-rule findings

Common findings from `validate()`:

| Rule | Meaning |
|------|---------|
| G-03 | Tool missing `<!-- risk:... -->` annotation |
| G-05 | `args_from` references undefined tool |
| G-07 | Circular `args_from` chain |
| G-13 | G-CHAIN: tier uplift required but policy downgraded |
| G-17 | RESTRICTED sensitivity not propagated through chain |
| G-24 | R5 tool with `failMode: 'open'` (blocks compile) |

See the CM in compiler-sdk for the authoritative 29-rule registry.

## Cross-references

- [../specs/POC-compiler.md](../specs/POC-compiler.md) — public API spec
- [../specs/POI-policy-ir.md](../specs/POI-policy-ir.md) — IR shape
- [../pitfalls/failmode.md](../pitfalls/failmode.md) — fail-mode
  misconfiguration
- [../tutorials/first-policy.md](../tutorials/first-policy.md) — from-scratch tutorial
