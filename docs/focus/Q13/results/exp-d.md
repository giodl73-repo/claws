# exp-d: claws-sdk Package Architecture

**Question**: Q12m — How does claws-sdk compose on top of compiler-sdk + agent-sdk?
**Experiment**: Design the concrete package (package.json, directory structure, module graph, build, test)
**Method**: Design analysis
**Date**: 2026-04-11

---

## Package Identity

```
Name:     @bic/claws-sdk
Version:  0.1.0 (initial)
Type:     ESM (type: "module")
Node:     >=20
License:  MIT (same as Craftworks)
```

claws-sdk is the 10th package in the Craftworks monorepo. It sits alongside the existing 9
packages but has a different dependency shape: it imports from compiler-sdk and agent-sdk
but NOT from craftworks-sdk.

---

## package.json

```json
{
  "name": "@bic/claws-sdk",
  "version": "0.1.0",
  "type": "module",
  "description": "Governance compiler SDK for OpenClaw agents — composition layer over compiler-sdk + agent-sdk",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./compile": {
      "import": "./dist/compile/index.js",
      "types": "./dist/compile/index.d.ts"
    },
    "./emit": {
      "import": "./dist/emit/index.js",
      "types": "./dist/emit/index.d.ts"
    },
    "./emit/ts": {
      "import": "./dist/emit/ts-emitter.js",
      "types": "./dist/emit/ts-emitter.d.ts"
    },
    "./emit/query": {
      "import": "./dist/emit/query-oc-memory.js",
      "types": "./dist/emit/query-oc-memory.d.ts"
    },
    "./analyze": {
      "import": "./dist/analyze/index.js",
      "types": "./dist/analyze/index.d.ts"
    },
    "./optimize": {
      "import": "./dist/optimize/index.js",
      "types": "./dist/optimize/index.d.ts"
    },
    "./adapter": {
      "import": "./dist/adapter/index.js",
      "types": "./dist/adapter/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./*.js": {
      "import": "./dist/*.js",
      "types": "./dist/*.d.ts"
    },
    "./*": {
      "import": "./dist/*.js",
      "types": "./dist/*.d.ts"
    }
  },
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "zod": "^4.3.6",
    "yaml": "^2.8.3"
  },
  "peerDependencies": {
    "@craftworks/compiler-sdk": ">=0.36.0",
    "@craftworks/agent-sdk": ">=0.36.0"
  },
  "devDependencies": {
    "@craftworks/compiler-sdk": "file:../compiler-sdk",
    "@craftworks/agent-sdk": "file:../agent-sdk",
    "@types/node": "^20.0.0",
    "@vitest/coverage-v8": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^4.0.0"
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:unit": "vitest run --project unit --passWithNoTests",
    "test:integration": "vitest run --project integration --passWithNoTests",
    "test:e2e": "vitest run --project e2e --passWithNoTests",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "tsc --noEmit"
  }
}
```

### Key Design Decisions

1. **peerDependencies** on compiler-sdk and agent-sdk (not regular dependencies).
   This means claws-cli (the consumer) must declare both SDKs. Peer deps ensure
   version alignment across the monorepo.

2. **Only 2 runtime dependencies**: zod (schema validation) and yaml (config parsing).
   Everything else comes from peer deps.

3. **No dependency on craftworks-sdk**. This is the critical boundary. See the
   exclusion analysis below.

---

## Directory Structure

```
claws-sdk/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  src/
    index.ts                    # Barrel: re-exports public API
    types/
      index.ts                  # claws-specific type definitions
      governance-ast.ts         # GovernanceAST (parsed OC workspace)
      capability-manifest.ts    # CapabilityManifest (extracted intents)
      gov-analysis.ts           # GovAnalysis (governance rule application)
      claws-config.ts           # claws.json schema (Zod)
    compile/
      index.ts                  # Compilation orchestrator (5-phase pipeline)
      parse.ts                  # Phase 1: PARSE (OC workspace -> GovernanceAST)
      extract.ts                # Phase 2: EXTRACT (GovernanceAST -> CapabilityManifest)
      analyze.ts                # Phase 3: ANALYZE (rules -> GovAnalysis)
      optimize.ts               # Phase 4: OPTIMIZE (dead-code eliminate, materialize)
      emit.ts                   # Phase 5: EMIT (dispatch to emitters)
    analyze/
      index.ts                  # Governance analysis orchestrator
      rule-engine.ts            # Rule evaluation (uses PolicyIR + GovernanceIR)
      conflict-detect.ts        # Cross-file conflict detection
      risk-classify.ts          # Tool risk classification (uses ToolIR)
      tier-assign.ts            # Tier assignment (uses TierIR)
      budget-check.ts           # Budget enforcement (uses GovernanceManager)
    emit/
      index.ts                  # Emission orchestrator
      ts-emitter.ts             # OperationIR -> TypeScript emitter (exp-b)
      ts-codegen.ts             # TypeScript code generation helpers
      ts-elicit-gate.ts         # ConfirmationStep -> elicitation gate
      ts-audit-chain.ts         # Effect -> audit chain append
      ts-oc-adapter.ts          # OC API adapter mapping
      query-oc-memory.ts        # QueryIR -> openclaw-memory emitter (exp-c)
      skill-emitter.ts          # SkillIR -> OC skill file emitter
      manifest-emitter.ts       # Package manifest emitter
    optimize/
      index.ts                  # Optimization orchestrator
      pinch.ts                  # PRESS -> pinch profile (governance budgets)
      materialize.ts            # DataFrame -> const materialization
      dead-code.ts              # Dead rule elimination
    adapter/
      index.ts                  # Adapter barrel
      oc-data-adapter.ts        # OC-native data adapter interface
      oc-memory-adapter.ts      # memory.search() adapter
      oc-config-adapter.ts      # config.get() adapter
      oc-skills-adapter.ts      # skills.list() adapter
  tests/
    unit/
      compile/
        parse.unit.test.ts
        extract.unit.test.ts
        analyze.unit.test.ts
        optimize.unit.test.ts
        emit.unit.test.ts
      analyze/
        rule-engine.unit.test.ts
        conflict-detect.unit.test.ts
        risk-classify.unit.test.ts
      emit/
        ts-emitter.unit.test.ts
        query-oc-memory.unit.test.ts
        ts-elicit-gate.unit.test.ts
      optimize/
        pinch.unit.test.ts
        materialize.unit.test.ts
      adapter/
        oc-data-adapter.unit.test.ts
    integration/
      pipeline.integration.test.ts    # Full 5-phase pipeline
      oc-workspace.integration.test.ts # OC workspace -> generated skills
    fixtures/
      workspaces/
        minimal/                # Minimal OC workspace (SOUL.md + TOOLS.md)
        email-agent/            # Email agent with R5 tools (from exp-b)
        fleet-scan/             # Fleet scan agent
      expected/
        email-agent/            # Expected generated TypeScript output
        fleet-scan/             # Expected generated TypeScript output
```

---

## Module Graph: claws-sdk -> compiler-sdk

Every import from compiler-sdk with its EXACT subpath:

### IR Types (for type definitions)

```typescript
import type { OperationIR, OperationNode } from '@craftworks/compiler-sdk/astro/types/operation-ir';
import type { QueryIR, QueryNode, QueryResult, QueryTarget, FilterNode, ProjectionNode, AggregationNode, NavigationNode, SortNode, PaginationNode } from '@craftworks/compiler-sdk/astro/types/query-ir';
import type { SkillIR, SkillSet, SkillToolGrant, SkillSection } from '@craftworks/compiler-sdk/astro/types/skill-ir';
import type { PolicyRule, PolicySet, PolicyCompilationResult } from '@craftworks/compiler-sdk/astro/ir/policy/policy-ir';
import type { DiagnosticSink, SourceSpan } from '@craftworks/compiler-sdk/astro/types/language-services';
import type { PassEffect } from '@craftworks/compiler-sdk/astro/types/effects';
import type { DensityLevel, TaskType } from '@craftworks/compiler-sdk/astro/ir/press/types';
import type { OCWorkspaceIR } from '@craftworks/compiler-sdk/astro/readers/openclaw-reader';
```

### IR Compilers (for governance analysis — Phase 3 ANALYZE)

```typescript
import { compilePolicies, compilePoliciesFromDir, parsePolicyFile } from '@craftworks/compiler-sdk/astro/ir/policy/policy-compiler';
import { compileGovernanceRelax } from '@craftworks/compiler-sdk/astro/ir/governance/governance-relax-compile';
import { compileToolRelax } from '@craftworks/compiler-sdk/astro/ir/tool/tool-relax-compile';
import { compileTierRelax } from '@craftworks/compiler-sdk/astro/ir/tier/tier-relax-compile';
```

### Operation IR (for code generation — Phase 5 EMIT)

```typescript
import { lowerSkillToOperationIR, lowerSkillSetsToOperationIRs, classifySkill, buildDependencyGraph } from '@craftworks/compiler-sdk/astro/ir/operation/lowering';
import { bundle, resolveImports, topologicalSort, treeShake } from '@craftworks/compiler-sdk/astro/ir/operation/bundler';
import { OPERATION_PASS_EFFECTS, OPERATION_PASS_ORDER } from '@craftworks/compiler-sdk/astro/ir/operation/effects';
import type { BundledOutput, ImportEdge } from '@craftworks/compiler-sdk/astro/ir/operation/bundler';
```

### Query IR (for data query emission — Phase 5 EMIT)

```typescript
import { emitQuery } from '@craftworks/compiler-sdk/astro/query/emit';
// claws-sdk extends with its own emitOCMemory() — same interface
```

### RELAX Expression Engine (for rule evaluation)

```typescript
import { coerceStringToNumber, guardDivisionByZero } from '@craftworks/compiler-sdk/astro/relax/relax-expr-evaluator';
```

### OC Reader + Emitter (for workspace I/O)

```typescript
import { readOCWorkspace } from '@craftworks/compiler-sdk/astro/readers/openclaw-reader';
import { emitOCWorkspace } from '@craftworks/compiler-sdk/astro/emit/platforms/openclaw-emitter';
```

### PRESS (for optimization — Phase 4 OPTIMIZE)

```typescript
import { getQuality, getQualityWithPenalty, QUALITY_MATRIX } from '@craftworks/compiler-sdk/astro/ir/press/quality-matrix';
import { splitBipartite } from '@craftworks/compiler-sdk/astro/ir/press/bipartite-split';
```

### Diagnostics

```typescript
import { ArrayDiagnosticSink } from '@craftworks/compiler-sdk/astro/types/language-services';
```

**Total: ~15 distinct import paths from compiler-sdk.**

---

## Module Graph: claws-sdk -> agent-sdk

Every import from agent-sdk with its EXACT subpath:

### Governance (budget enforcement, CGR, policies)

```typescript
import { GovernanceManager } from '@craftworks/agent-sdk/govern';
import { appendEntry, readChain, verifyChain } from '@craftworks/agent-sdk/govern';
import { loadPolicies } from '@craftworks/agent-sdk/govern';
import type { CgrEntry } from '@craftworks/agent-sdk/govern';
import type { BudgetConfig, SignalConfig } from '@craftworks/agent-sdk/types';
```

### Audit Trail (hash-chained event log)

```typescript
import type { AuditEvent, WALEntry } from '@craftworks/agent-sdk/suite/audit';
import { createAuditEvent, verifyAuditChain } from '@craftworks/agent-sdk/suite/audit';
```

### Gates (approval checkpoints)

```typescript
import type { GateType, GateLifecycle, GateEvent, GateConfig, GateOutcome } from '@craftworks/agent-sdk/suite/gates';
import { createMandatoryGateCriterion } from '@craftworks/agent-sdk/suite/gates';
```

### Hashing (deterministic SHA-256)

```typescript
import { contentHash } from '@craftworks/agent-sdk/hashing';
```

### Eval (for quality gate compilation)

```typescript
import type { Rubric, Judge } from '@craftworks/agent-sdk/eval';
```

**Total: ~5 distinct import paths from agent-sdk.**

---

## What claws-sdk Does NOT Import from craftworks-sdk (and Why)

| craftworks-sdk Module | Why Excluded |
|----------------------|-------------|
| `src/handlers/` | Command handlers — CLI concern, not SDK |
| `src/domains/` | Craftworks workflow domains (wave, review, discipline, make, test). Not applicable to OC governance. |
| `src/suite/wiring/` | CLI dependency injection (handler-base, sdk-context). claws-sdk has its own composition. |
| `src/suite/config/` | Craftworks config-loader reads craft.json. claws reads claws.json with its own loader. |
| `src/adapters/` | 42+ DataFrame projection adapters for Craftworks domain model (role capability, memory, entity diff, CGRs, plugins, etc.). claws has 4 OC-native adapters instead. |
| `src/press/` | Craftworks PRESS runtime (calibration, fingerprint, history, quality floors, role density). claws uses compiler-sdk's PRESS IR directly for the pinch profile. |
| `src/where/` | where: runtime evaluation. Craftworks-specific. |
| `src/relax/` | Craftworks shared RELAX evaluator with CLI diagnostic codes. claws uses compiler-sdk's RELAX directly. |
| `src/hosts/` | ExecHost + LocalExecHost + WorkIQ adapter. Craftworks execution model. |
| `src/governance/` | Craftworks governance composition algebra. claws composes governance through compiler-sdk's PolicyIR. |
| `src/maker/` | Dreaming/maker system. Craftworks-internal. |
| `src/dreaming/` | Dreaming maintenance loop. Craftworks-internal. |
| `src/store/` | Craftworks typed store engine. Not applicable. |
| `src/workspace-runtime.ts` | Craftworks boot sequence. claws has its own entry point. |
| `src/context-assembler.ts` | Craftworks prompt assembly. claws doesn't assemble prompts. |
| `src/charter-enforcer.ts` | Workspace charter enforcement. Craftworks concept. |
| `src/policy-engine.ts` | Craftworks policy rule evaluation. claws uses compiler-sdk's PolicyIR. |
| `src/workflow-runner.ts` | Workflow/pipeline composition. Not applicable. |

**The pattern**: craftworks-sdk is the "glue" layer that connects compiler-sdk + agent-sdk
to the Craftworks domain model (waves, plans, reviews, disciplines). claws-sdk is a
DIFFERENT glue layer that connects compiler-sdk + agent-sdk to the OC governance domain.
They are siblings, not parent-child.

```
                compiler-sdk + agent-sdk
                   /              \
            craftworks-sdk      claws-sdk
            (Craftworks glue)   (OC governance glue)
               /    \                \
        craft-cli  guard-cli      claws-cli
```

---

## How @claws/* Published Packages Are Built from claws-sdk

claws-sdk is the INTERNAL monorepo package. Published npm packages for OC users are
built from it via subpath exports:

| Published Package | What It Contains | Built From |
|------------------|-----------------|-----------|
| `@claws/sdk` | Core compilation API | claws-sdk/src/compile/ + types/ |
| `@claws/runtime` | Thin OC helper library (<50KB) | Separate package (not from claws-sdk) |
| `@claws/report` | Governance report generation | claws-sdk/src/emit/ report subset |
| `@claws/cli` | The claws CLI (35 commands) | claws-cli/ (separate package) |

The build strategy:

1. **@claws/sdk** is built by tsup from claws-sdk/src/ with tree-shaking. Only the
   public compilation API is included. compiler-sdk and agent-sdk are externalized
   (not bundled).

2. **@claws/runtime** is a SEPARATE tiny package (~7 functions, <50KB) that OC
   developers install. It does NOT depend on compiler-sdk or agent-sdk. It contains
   only the thin runtime helpers that generated skills import. See Q12k exp-b.

3. **@claws/report** uses the ReportIR-inspired architecture from compiler-sdk
   but is built as an independent module.

4. **@claws/cli** is the thin CLI layer (like craft-cli). It imports from claws-sdk.

---

## Build System

### tsconfig.json

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "node16",
    "module": "node16",
    "target": "es2022",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@craftworks/compiler-sdk/*": ["../compiler-sdk/src/*"],
      "@craftworks/agent-sdk/*": ["../agent-sdk/src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "references": [
    { "path": "../compiler-sdk" },
    { "path": "../agent-sdk" }
  ]
}
```

### Monorepo Integration

Add to root `package.json` workspaces:

```json
{
  "workspaces": [
    "craftworks-sdk",
    "agent-sdk",
    "compiler-sdk",
    "shared-cli",
    "craft-cli",
    "guard-cli",
    "fleet-cli",
    "forge-cli",
    "craftworks",
    "claws-sdk"       // NEW
  ]
}
```

Build order: `agent-sdk -> compiler-sdk -> claws-sdk` (parallel with craftworks-sdk).

The root build script adds:

```json
{
  "build": "npm run build -w agent-sdk && npm run build -w compiler-sdk && npm run build -w craftworks-sdk && npm run build -w claws-sdk && npm run build -w shared-cli && ..."
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/compile/index.ts',
    'src/emit/index.ts',
    'src/emit/ts-emitter.ts',
    'src/emit/query-oc-memory.ts',
    'src/analyze/index.ts',
    'src/optimize/index.ts',
    'src/adapter/index.ts',
    'src/types/index.ts',
  ],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@craftworks/compiler-sdk',
    '@craftworks/agent-sdk',
  ],
});
```

---

## Testing

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 95,
        lines: 95,
        functions: 95,
        branches: 90,
      },
    },
  },
});
```

### Test Strategy

| Test Type | Location | What It Tests | Fixtures |
|-----------|----------|--------------|----------|
| Unit | `tests/unit/` | Individual functions in isolation | Inline fixtures |
| Integration | `tests/integration/` | Full 5-phase pipeline end-to-end | `tests/fixtures/workspaces/` |

### Fixtures Needed

1. **Minimal OC workspace**: SOUL.md + TOOLS.md (2 files). Tests the PARSE phase.
2. **Email agent workspace**: Full workspace with R5 tool. Tests ConfirmationStep -> elicitation gate.
3. **Fleet scan workspace**: Workspace with memory queries. Tests QueryIR -> openclaw-memory.
4. **Expected outputs**: Generated TypeScript files for each fixture. Tests EMIT phase.

### Running Tests

```bash
# From package directory
cd claws-sdk && npx vitest run

# By tier
cd claws-sdk && npx vitest run --project unit
cd claws-sdk && npx vitest run --project integration

# From repo root (via workspaces)
npm test -w claws-sdk
```

---

## Dependency Graph Visualization

```
  @craftworks/agent-sdk (0 deps)
         |
         v
  @craftworks/compiler-sdk (depends on agent-sdk)
         |
    +----+----+
    |         |
    v         v
  @craftworks/    @craftworks/
  craftworks-sdk  claws-sdk        <-- SIBLINGS, not parent-child
  (depends on     (depends on
   compiler-sdk    compiler-sdk
   + agent-sdk)    + agent-sdk)
    |                  |
    v                  v
  craft-cli         claws-cli      <-- Each CLI is thin
  guard-cli
  fleet-cli
  forge-cli
```

**The critical insight**: claws-sdk and craftworks-sdk are at the SAME level in the
dependency graph. They both compose on compiler-sdk + agent-sdk. They never import
from each other. This makes the architecture clean: no circular dependencies, no
extraction needed, just a new composition layer.

---

## Summary

claws-sdk is a focused package with:
- **~20 source files** across 5 directories (compile, analyze, emit, optimize, adapter)
- **~15 imports from compiler-sdk** (PolicyIR, GovernanceIR, ToolIR, TierIR, OperationIR, QueryIR, PRESS, RELAX, OC reader/emitter, types, diagnostics)
- **~5 imports from agent-sdk** (GovernanceManager, CGR chain, audit trail, gates, hashing)
- **0 imports from craftworks-sdk** (by design)
- **2 runtime dependencies** (zod, yaml)
- **Standard monorepo integration** (npm workspaces, tsup build, vitest tests, project references)

The package is small because it is a composition layer, not a reimplementation. The heavy
lifting is in compiler-sdk (IRs, RELAX, readers, emitters) and agent-sdk (governance,
audit, gates). claws-sdk adds the OC-specific compilation pipeline that wires these
pieces together for the governance domain.
