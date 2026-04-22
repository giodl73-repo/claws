# SKI — Subpath imports

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md)

## Allowed import forms

```ts
// ✓ allowed — explicit subpath
import { ... } from '@bic/claws-sdk/api';
import { ... } from '@bic/claws-sdk/compile';   // internal only
import { ... } from '@bic/claws-sdk/fleet';     // internal only
```

```ts
// ✗ disallowed — barrel import
import { ... } from '@bic/claws-sdk';
```

The package.json `exports` field lists every valid subpath
explicitly and does NOT export a root `.` target. Attempting
`@bic/claws-sdk` (no subpath) fails at resolve time with a node.js
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

## No-barrel rule

Barrel imports are banned because:

1. **Tree-shaking friction** — a single `import * as sdk from '@bic/claws-sdk'`
   pulls everything the package exports into the consumer bundle.
   Subpath imports let tree-shaking drop unused features.
2. **Stability contract clarity** — `/api` is stable, `/compile` is
   internal. Barrel imports blur the line.
3. **Circular-import traps** — with subpaths, it's obvious which
   module is loaded when. Barrel imports hide the order.

See [../pitfalls/imports.md](../pitfalls/imports.md) for the
barrel-import failure modes.

## Subpath catalogue

Current subpaths exported by the package:

- `/api` — stable public surface (graduated features only)
- `/compile` — GovernanceIR, 29 G-rules (internal)
- `/fleet` — fleet client (internal)
- `/relax` — relax engine (internal)
- `/compliance` — SOC2/HIPAA/EU AI Act emitters (internal)
- `/siem` — SIEM sinks (internal)
- `/press` — CI output emitters (internal)
- `/context` — context assembler (internal)
- `/snapshot` — snap client library (internal — different from
  `@bic/openclaw-snap` which is the daemon itself)
- `/types` — shared type exports (re-exports from subpaths)

## Internal cross-module imports

Within `packages/claws-sdk/src/`, cross-module references use
RELATIVE paths:

```ts
// inside packages/claws-sdk/src/fleet/resolver.ts
import { compileGovernanceIR } from '../compile/index.js';  // ✓
import { compileGovernanceIR } from '@bic/claws-sdk/compile';  // ✗
```

Self-referential package imports via subpath work but discourage
mental model: "which version is loaded? the dev copy or the
installed copy?". Relative imports are unambiguous.
