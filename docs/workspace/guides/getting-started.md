---
covers: [atom:WSP, atom:WSA]
---

# Getting started with @bic/openclaw-workspace

This guide walks through parsing an OpenClaw workspace into a typed
AST, walking the AST, and emitting it back to disk without drift.

## Install

```bash
npm i @bic/openclaw-workspace
```

## Parse

```ts
import { parse } from '@bic/openclaw-workspace/parse';

const ast = parse({
  'AGENTS.md': fs.readFileSync('AGENTS.md'),
  'TOOLS.md': fs.readFileSync('TOOLS.md'),
  // ... the other 7 bootstrap files, if present
});

if (ast.toolsMd === null) {
  throw new Error('workspace missing required TOOLS.md');
}
```

The parser accepts any of the 9 bootstrap files as `Uint8Array` or
`string`. Missing files yield `null` slots. Unknown files are preserved
in `ast.unknownFiles` so they survive round-trip.

## Walk

```ts
import { walkAst } from '@bic/openclaw-workspace/ast';

walkAst(ast, {
  visitToolsMd: (tools) => {
    for (const tool of tools.tools) {
      console.log(`${tool.name} @ risk ${tool.riskTier}`);
    }
  },
});
```

## Resolve a path

```ts
import { parseOcUri, resolveFsPath } from '@bic/openclaw-workspace/path';

const ocPath = parseOcUri('oc://skills/my-skill');
const absPath = resolveFsPath(ocPath, workspaceRoot);
// absPath is guaranteed to be under workspaceRoot (symlink-followed).
```

`parseOcUri` rejects the 12 vectors listed in
[../specs/WSP-path.md § 12 rejection vectors](../specs/WSP-path.md).
`resolveFsPath` re-validates the absolute path at the filesystem layer.

## Emit

```ts
import { emit } from '@bic/openclaw-workspace/emit';

const files = emit(ast);
for (const [name, bytes] of Object.entries(files)) {
  fs.writeFileSync(name, bytes);
}
```

`emit()` is idempotent: if the AST is untouched, `emit(ast)` returns
the exact bytes the parser ingested. No CRLF churn, no BOM stripping.

## Next

- [../specs/WSA-ast.md](../specs/WSA-ast.md) for the full AST type shape
- [../guides/uri-handling.md](./uri-handling.md) for defence-in-depth path handling
- [../pitfalls/path-handling.md](../pitfalls/path-handling.md) for common traps
