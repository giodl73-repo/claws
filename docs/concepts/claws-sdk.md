# claws-sdk

The governance SDK -- a sibling to craftworks-sdk that provides programmatic access to the claws compilation and enforcement pipeline.

## Overview

`claws-sdk` is the TypeScript SDK for governance operations. Just as `craftworks-sdk` provides programmatic access to workspace compilation, `claws-sdk` provides programmatic access to governance compilation, policy evaluation, and compliance verification. It is the foundation that the `claws` CLI, `claws-lsp`, and `@bic/claws-action` all build on.

## SDK Surface

```typescript
import { compile, verify, assess } from '@bic/claws-sdk';

// Compile governance
const result = await compile({ workspace: '/path/to/workspace' });

// Verify compliance
const report = await verify({ workspace: '/path/to/workspace', framework: 'soc2' });

// Assess risk
const risk = await assess({ workspace: '/path/to/workspace' });
```

## Architecture

```
  claws CLI ──────────┐
  claws-lsp ──────────┤
  claws-action ───────┤──► claws-sdk ──► GovernanceIR
  Custom integrations ┘
```

All consumers go through the SDK. The SDK owns all governance business logic: policy parsing, rule evaluation, GovernanceIR compilation, and compliance checking. No consumer implements governance logic directly.

## Relationship to craftworks-sdk

claws-sdk depends on craftworks-sdk for workspace primitives (ProgramIR, entity schemas, data classification). It does not duplicate those types -- it imports them via subpath imports.

## Related

- [SDK Architecture](../../craft/concepts/sdk-architecture.md) -- the three-layer SDK model
- [GovernanceIR](governance-ir.md) -- the compiled output
- `design/claws/ATOMS.md` -- C50 `atom:claws-sdk`
