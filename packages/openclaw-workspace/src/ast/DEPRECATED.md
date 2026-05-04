# DEPRECATED — `@bic/openclaw-workspace/ast` subpath

**Superseded by**: [`@bic/oc-paths-substrate`](../../../oc-paths-substrate/)
**Status**: deprecating; do NOT import in new code
**Scope**: ONLY the `/ast` subpath (PEG grammars + typed AST). Other
`@bic/openclaw-workspace` subpaths (`/path`, `/canonicalize`,
`/staging`, `/path-canonical`, `/lint`) remain live.

## Why

The PEG-grammars-based `WorkspaceAst` / `WorkspaceFileKind` shape in
this subpath predates the universal-AST reshape. The new
`@bic/oc-paths-substrate` package ships:

- Per-kind ASTs with a unified discriminator: `MdAst`, `JsoncAst`,
  `JsonlAst`, `YamlAst` (all carry `kind: 'md' | 'jsonc' | 'jsonl' | 'yaml'`)
- Universal addressing verbs: `resolveOcPath`, `setOcPath`,
  `findOcPaths` over the tagged-union AST
- Per-kind parsers + emitters: `parseMd` / `parseJsonc` / `parseJsonl`
  / `parseYaml` and matching `emitXxx` round-trip
- Substrate-level redaction sentinel guard at every emit boundary
- `inferKind(filename)` for filename → kind dispatch
- Workspace manifest layer (`buildWorkspaceManifest`,
  `OPENCLAW_WORKSPACE_ROLES`) — oc-path applied to the filesystem

Lands at `openclaw/openclaw` upstream per
`lobster-docs/Tech/OpenClaw/specs/proposals/upstream/oc-paths/upstream-pr1-workspace.md`.

## Migration

Replace `WorkspaceAst` usage with the per-kind ASTs from oc-paths:

```ts
// before
import { parse as workspaceParse } from '@bic/openclaw-workspace/ast';
import type { WorkspaceAst, WorkspaceFileKind } from '@bic/openclaw-workspace/ast';

const result = workspaceParse(kind, raw);
// result.ast: WorkspaceAst (PEG-based shape)

// after
import { parseMd, parseJsonc, parseJsonl, parseYaml, inferKind } from '@bic/oc-paths-substrate';
import type { OcAst, OcKind } from '@bic/oc-paths-substrate';

const kind = inferKind(filename);  // 'md' | 'jsonc' | 'jsonl' | 'yaml' | null
const result = kind === 'md'    ? parseMd(raw)
             : kind === 'jsonc' ? parseJsonc(raw)
             : kind === 'jsonl' ? parseJsonl(raw)
             : kind === 'yaml'  ? parseYaml(raw)
             : null;
// result.ast: MdAst | JsoncAst | JsonlAst | YamlAst (universal)
```

For walking workspace files to extract policy-relevant sections,
prefer `findOcPaths` over manual AST traversal:

```ts
// before — walk WorkspaceAst.blocks for `## Tools` section
const block = parsed.ast.blocks.find((b) => b.heading === 'Tools');

// after — query by oc-path pattern
import { findOcPaths, parseOcPath } from '@bic/oc-paths-substrate';
const matches = findOcPaths(ast, parseOcPath('oc://TOOLS.md/Tools/*'));
```

## Remaining consumers

19 source files across:
- `@bic/openclaw-policy/src/compile/parse.ts` (and downstream)
- `@bic/claws-sdk/src/workspace/*`
- `@bic/openclaw-guardrails/src/audit/*`
- `@bic/openclaw-snap` (some test fixtures)

Migration is in progress per the policy-package substrate audit.

## What stays in `@bic/openclaw-workspace`

The other subpaths are unaffected by this deprecation:
- `/path` — `oc://` URI scheme + workspace file registry (still live;
  oc-paths-substrate has its own complementary path module)
- `/canonicalize` — RFC 8785 JCS canonicalization
- `/staging` — staging-dir + snapshot helpers
- `/path-canonical` — filesystem-path canonicalizer
- `/lint` — JSONC config lint (the older 13-code surface; pre-dates
  `@bic/oc-paths-lint`)
