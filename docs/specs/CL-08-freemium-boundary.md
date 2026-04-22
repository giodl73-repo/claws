# CL-08: Package Architecture and Graduation Model

> **Status: Retired** — Succeeded by the per-package spec scheme in
> `c:\src\claws\docs\`. Successor: `sdk/specs/SK-sdk.md` (see pulse
> 74.6) + per-package primary specs. Graduation model lives in
> `upstream/specs/UG-upstream.md`. Content preserved for historical
> reference. Do not amend.

**Version**: 1.2
**Source**: claws-sdk-graduation plan, R1 review (5 roles, 46 findings), package-extraction plan R2 review (10+7 model locked)
**Reviewers**: claws:founder, claws:ciso, craft:architect

---

## Overview

This spec defines the three-layer package architecture that governs the claws graduation. The three layers are:

1. **Building Blocks** (`@craftworks/*` packages, MIT) -- 10 core infrastructure packages + 7 per-platform emitter plugins extracted from compiler-sdk and agent-sdk. Craftworks maintains them. Anyone can use them. A competitor could compose these same blocks into a different governance compiler.
2. **Governance Compiler** (`@claws/*` packages, MIT) -- composes a subset of Craftworks building blocks into a governance compiler for OpenClaw. claws adds intent extraction, 29 G-rules, GovernanceIR, R5 fail-closed enforcement, and emit. This is the product layer.
3. **Enterprise Services** (`@bic/claws-sdk`, proprietary) -- extends the claws compiler with fleet, compliance, SIEM, PRESS, and other scale/depth features, pulling in additional building blocks.

The key insight: **Craftworks maintains both the bottom and the top**. The building blocks are Craftworks infrastructure. The enterprise tier is Craftworks revenue. claws is the composition layer in between -- it takes general-purpose building blocks and assembles a governance compiler. Another team could use the same `@craftworks/forma` and `@craftworks/crypto` to build something entirely different.

This is not a freemium split. It is a supply chain: Craftworks infrastructure -> claws composition -> Craftworks enterprise.

## Scope

**In scope**:
- Three-layer architecture (blocks, compiler, enterprise)
- 10 core + 7 emitter building block packages extracted from compiler-sdk/agent-sdk
- 3 claws packages that compose a subset of the blocks
- Enterprise extension contract
- Compatibility manifest (`@craftworks/platform`)
- Inter-package dependency graph across all three layers
- Per-package API stability contract
- Migration from monolith into standalone building blocks
- Equivalence testing (block output matches compiler-sdk originals)
- Composition scenarios (claws and hypothetical alternatives)
- Ownership model (who maintains what, who supports what)

**Out of scope**:
- Pricing model, subscription tiers, billing
- npm scope registration (prerequisite, not this spec)
- Licensing legal review
- Marketing, landing pages
- CI/CD infrastructure for publishing packages

**Depends on**: CL-04 (compilation pipeline), CL-07 (deep integration), graduation plan

## Design

### Three-Layer Architecture

```
Layer 3: Enterprise Services (Craftworks maintains, proprietary)
+-----------------------------------------------------------------------+
|  @bic/claws-sdk                                                |
|                                                                       |
|  Fleet    Compliance   SIEM      PRESS      Identity   SERVE          |
|  Audit-ext    LSP       Snapshots    Ontology    CI/CD                |
|  + 5 more emitter plugins (cursor, copilot, bedrock, langgraph,       |
|    crewai) via @craftworks/emit-* from Layer 1                        |
|  + additional Layer 1 blocks: relax, context, governance, execution,  |
|    eval                                                               |
|                                                                       |
+----------------------------+------------------------------------------+
                             | extends (never forks)
                             v
Layer 2: Governance Compiler (claws composes, MIT)
+-----------------------------------------------------------------------+
|  @claws/compiler                                                      |
|                                                                       |
|  Composes a SUBSET of @craftworks/* blocks:                           |
|    forma, crypto, workspace, codegen + emit-oc + emit-cc              |
|  + Intent extraction from 9 OC workspace files                        |
|  + 29 G-rules (G01-G29) with extensible registry                     |
|  + GovernanceIR (types, serialization, validation, FailMode<R>)       |
|  + R5 fail-closed enforcement (non-negotiable)                        |
|  + Compile orchestrator (PARSE -> EXTRACT -> ANALYZE -> OPTIMIZE)     |
|  + 2 emit targets (OC Gateway plugin + Claude Code)                   |
|  + CLI (compile, pinch, build, init, new, annotate)                   |
|                                                                       |
|  Also: @bic/claws-skill-kit, @bic/claws-test (standalone)                    |
|                                                                       |
+----------------------------+------------------------------------------+
                             | composes (selects subset)
                             v
Layer 1: Building Blocks (Craftworks maintains, MIT)
+-----------------------------------------------------------------------+
|  @craftworks/* (extracted from compiler-sdk + agent-sdk)              |
|                                                                       |
|  10 CORE:  forma      workspace   crypto      governance              |
|            codegen    relax       context     execution               |
|            eval       input                                           |
|                                                                       |
|  7 EMITTERS: emit-oc  emit-cc   emit-cursor  emit-copilot            |
|              emit-bedrock  emit-langgraph  emit-crewai                |
|                                                                       |
|  + @craftworks/platform (compatibility manifest, no code)             |
|                                                                       |
|  General-purpose. Not claws-specific. Anyone can compose them.        |
|  A competitor could build a different governance tool from these.      |
+-----------------------------------------------------------------------+
```

### Layer 1: Building Blocks

Building blocks are 10 core packages + 7 per-platform emitter plugins extracted from compiler-sdk and agent-sdk. They are general-purpose infrastructure -- not governance-specific, not claws-specific. Craftworks maintains them as public MIT packages.

The 10+7 model was established by the package-extraction plan R1/R2 reviews (5 roles, 56 findings, unanimous consensus). Domain-based merges (not 1:1 with dialect areas) reduce version management complexity while preserving targeted install sizes.

#### @craftworks/forma

Reads 9 OpenClaw workspace files and provides typed IR. Merges the former oc-readers + oc-ir.

| Responsibility | Detail |
|---------------|--------|
| Reading | 9 OC files: SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, USER.md, BOOTSTRAP.md, HEARTBEAT.md, openclaw.json, canvas/ |
| AST | `OCWorkspaceAST` -- typed AST with one node per file |
| IR | `OCWorkspaceIR`, `SoulIR`, `AgentsIR`, `ToolsIR`, etc. |
| Serialization | `serialize()` / `deserialize()` with round-trip guarantee |
| Parsing | Frontmatter extraction, markdown section parsing, JSON/YAML, Zod validation |
| Encoding | BOM/CRLF handling (internalized from normalize) |

```typescript
interface WorkspaceReader {
  read(root: string): Promise<OCWorkspaceAST>;
  readFile(root: string, file: OCFileType): Promise<FileAST>;
}
```

**Dependencies**: `@craftworks/crypto` (for IR hashing)
**Lines (est.)**: ~2000
**Extracted from**: `readOCWorkspaceViaFORMA()`, oc-*.ts files, FormaIR OC subset in compiler-sdk
**Strategy**: Rewrite -- simplified 9-file reader with integrated IR types, WorkspaceReader interface (R1 M-01)

#### @craftworks/workspace

Platform detection, workspace discovery, and text normalization. Merges platform-detect + workspace-discovery + normalize.

| Responsibility | Detail |
|---------------|--------|
| Detection | Scan directory for platform marker files (7 platforms) |
| Discovery | Enumerate workspaces in a directory tree |
| Normalize | BOM stripping, CRLF normalization, encoding detection |
| Platforms | OpenClaw, Claude Code, Cursor, Windsurf, Cline, Roo, Aider |

**Dependencies**: none (leaf package)
**Lines (est.)**: ~1400
**Extracted from**: Platform detection + workspace discovery in compiler-sdk, normalize is new code (R1 M-03)
**Strategy**: Extract + new -- detection is mostly standalone, normalize built from 40+ scenario findings

#### @craftworks/crypto

Cryptographic primitives + hash-chained audit trail. Merges crypto + audit-chain into one package.

| Responsibility | Detail |
|---------------|--------|
| Ed25519 | Keypair generation, sign, verify |
| HMAC-SHA256 | Message authentication codes |
| SHA-256 | Content hashing for cache keys and chain links |
| Key management | Generate, export, import Ed25519 keypairs |
| Audit chain | Append-only JSONL with hash links, Ed25519 signed |
| Verification | Full-chain and single-entry verification |

```typescript
interface AuditChain<E> {
  append(event: E): Promise<ChainEntry<E>>;
  verify(): Promise<VerificationResult>;
  export(format: 'jsonl'): AsyncIterable<string>;
  readonly head: ChainEntry<E> | null;
  readonly length: number;
}
```

Note: `AuditChain<E>` is generic. claws instantiates it as `AuditChain<AuditEvent>` where `AuditEvent` is a claws-defined type. Other consumers can use `AuditChain<T>` for any event type.

**Dependencies**: none (leaf package, uses Node.js `crypto`)
**Lines (est.)**: ~800
**Extracted from**: integrity/crypto modules in compiler-sdk, `hash-chain.ts` + `verify.ts` in agent-sdk
**Strategy**: Rewrite -- thin wrappers over Node.js `crypto` + Ed25519-signed chain

#### @craftworks/governance

Policy walker, gates, runtime enforcement, and budget tracking. Merges governance-primitives + governance-runtime + budget-tracker.

| Responsibility | Detail |
|---------------|--------|
| Policy types | Risk levels, gate types, fail-mode policy definitions |
| Policy walker | Traverse and evaluate governance policy trees |
| Runtime gates | Before-tool-call enforcement, blocking decisions |
| Budget tracking | Token counting, fleet budget aggregation, charter enforcement |

**Dependencies**: `@craftworks/crypto`
**Lines (est.)**: ~2200
**Extracted from**: governance/, security/, govern/, suite/budget/ across compiler-sdk and agent-sdk
**Strategy**: Extract + merge -- one domain with two layers; split caused version mismatch risk (R1 C05)

#### @craftworks/codegen

Emit framework: platform registry, emitter base classes, TS codegen utilities. This is the framework; per-platform emitters are plugins.

| Responsibility | Detail |
|---------------|--------|
| EmitRegistry | Register and discover emitter plugins |
| EmitTarget | Base class for platform-specific emitters |
| TS codegen | Shared TypeScript code generation utilities |

**Dependencies**: `@craftworks/forma`
**Lines (est.)**: ~1500
**Extracted from**: emit/ (framework, base classes) in compiler-sdk
**Strategy**: Extract -- separate framework from per-platform plugins

#### @craftworks/relax

RELAX expression parser and evaluator. Standalone, no merges.

| Responsibility | Detail |
|---------------|--------|
| Parser | RELAX expression grammar |
| Evaluator | Typed expression evaluation, tiered bindings |
| Fill | RELAX template fill (variable substitution) |

**Dependencies**: none (leaf package)
**Lines (est.)**: ~2000
**Extracted from**: relax/, relax-fill/ in compiler-sdk
**Strategy**: Extract -- already mostly standalone

#### @craftworks/context

Context collections and DAG operations. Renamed from context-dag.

| Responsibility | Detail |
|---------------|--------|
| Collections | Compiled context collections |
| DAG ops | Directed acyclic graph operations |
| Sharing | Structural sharing for context trees |

**Dependencies**: `@craftworks/crypto`
**Lines (est.)**: ~1500
**Extracted from**: context/ in compiler-sdk
**Strategy**: Extract + rename

#### @craftworks/execution

Stage-task graph execution with quality gates and skill discovery. Merges execution-engine + skill-resolver.

| Responsibility | Detail |
|---------------|--------|
| Task graph | Stage-task dependency resolution and execution |
| Quality gates | Pass/fail gate evaluation between stages |
| Skill resolver | Skill discovery, ASP resolution |

**Dependencies**: `@craftworks/governance`
**Lines (est.)**: ~2800
**Extracted from**: task-execution/, quest/, dependency/ in compiler-sdk
**Strategy**: Merge -- skill resolution is consumed by execution; split causes unwanted dep pull (R2 N13 monitor)

#### @craftworks/eval

Rubric evaluation, assertions, and judging. Renamed from eval-framework.

| Responsibility | Detail |
|---------------|--------|
| Rubric | Evaluation rubric definition and parsing |
| Assertions | Test assertions for governance properties |
| Judge | Automated judging with pass^k support |

**Dependencies**: none (leaf package)
**Lines (est.)**: ~1200
**Extracted from**: eval/ in compiler-sdk
**Strategy**: Extract + rename

#### @craftworks/input

File, package, and URL resolution with provenance tracking. Renamed from input-resolver.

| Responsibility | Detail |
|---------------|--------|
| Resolution | File path, npm package, and URL input resolution |
| Provenance | Track origin and trust level of resolved inputs |
| Caching | Cache resolved inputs for repeated compilation |

**Dependencies**: none (leaf package)
**Lines (est.)**: ~800
**Extracted from**: input/, read/ in compiler-sdk
**Strategy**: Extract + rename

#### 7 Per-Platform Emitter Plugins

Each emitter depends on `@craftworks/codegen` and installs independently. Consumers cherry-pick their platform.

| Plugin | Lines (est.) | Who installs it |
|--------|-------------|----------------|
| **@craftworks/emit-oc** | ~500 | OpenClaw developers |
| **@craftworks/emit-cc** | ~400 | Claude Code users |
| **@craftworks/emit-cursor** | ~300 | Cursor users |
| **@craftworks/emit-copilot** | ~300 | GitHub Copilot users |
| **@craftworks/emit-bedrock** | ~400 | AWS Bedrock customers |
| **@craftworks/emit-langgraph** | ~400 | LangGraph/Python teams |
| **@craftworks/emit-crewai** | ~400 | CrewAI teams |

**Dependencies**: `@craftworks/codegen` (each)
**Extracted from**: emit/platforms/ in compiler-sdk
**Strategy**: Extract -- each platform directory becomes a plugin package

#### @craftworks/platform (compatibility manifest)

No-code manifest declaring tested-together version combinations for the 17 packages. Used by `claws drift` and fleet operations. See extraction plan for manifest format.

### Inter-Package Dependency Graph

```
Layer 1: Building Blocks (@craftworks/*)

  LEAF (no @craftworks/ deps)           MID-TIER
  +--------------------+                +---------------------+
  | @craftworks/       |                | @craftworks/        |
  |   crypto           |--depends-on-->|   forma             |
  |   workspace        |                |     depends on:     |
  |   relax            |                |     crypto          |
  |   eval             |                +---------------------+
  |   input            |                +---------------------+
  +--------------------+                | @craftworks/        |
         |                              |   governance        |
         +--depends-on---------------->|     depends on:     |
         |                              |     crypto          |
         |                              +---------------------+
         |                              +---------------------+
         +--depends-on---------------->| @craftworks/        |
                                        |   context           |
                                        |     depends on:     |
                                        |     crypto          |
                                        +---------------------+

  FRAMEWORK (depend on mid-tier)
  +---------------------+  +---------------------+
  | @craftworks/        |  | @craftworks/        |
  |   codegen           |  |   execution         |
  |     depends on:     |  |     depends on:     |
  |     forma           |  |     governance      |
  +---------------------+  +---------------------+

  EMITTER PLUGINS (each depends on @craftworks/codegen)
  emit-oc  emit-cc  emit-cursor  emit-copilot
  emit-bedrock  emit-langgraph  emit-crewai

Layer 2: Governance Compiler (@claws/*)

  +-----------------------------------------------------------+
  | @claws/compiler                                           |
  |   depends on (subset of Layer 1):                         |
  |     @craftworks/forma                                     |
  |     @craftworks/crypto                                    |
  |     @craftworks/workspace                                 |
  |     @craftworks/codegen                                   |
  |     @craftworks/emit-oc                                   |
  |     @craftworks/emit-cc                                   |
  +-----------------------------------------------------------+
  +---------------------+  +---------------------+
  | @bic/claws-skill-kit    |  | @bic/claws-test         |
  |   (standalone,      |  |   depends on:       |
  |    no @craftworks/)  |  |   @claws/compiler   |
  +---------------------+  +---------------------+

Layer 3: Enterprise (@bic/claws-sdk)

  +-----------------------------------------------------------+
  | @bic/claws-sdk                                     |
  |   depends on:                                             |
  |     @claws/compiler                                       |
  |     @craftworks/relax, context, governance, execution,    |
  |       eval (additional Layer 1 blocks)                    |
  |     @craftworks/emit-cursor, emit-copilot, emit-bedrock,  |
  |       emit-langgraph, emit-crewai (5 more emitters)       |
  +-----------------------------------------------------------+
```

**Dependency rules**:

1. Building blocks depend only on other building blocks. No `@claws/*` imports in Layer 1.
2. `@claws/compiler` depends on a **subset** of Layer 1 (4 core + 2 emitters). This is the composition seam.
3. `@bic/claws-skill-kit` has zero dependencies (already standalone).
4. `@bic/claws-test` depends on `@claws/compiler`.
5. `@bic/claws-sdk` depends on `@claws/compiler` plus additional Layer 1 blocks for enterprise features.
6. No circular dependencies. The graph is a DAG verified in CI.
7. Layer 1 has no knowledge of Layer 2 or Layer 3. The blocks are claws-agnostic.

### Layer 2: Governance Compiler

`@claws/compiler` is the composition layer. It imports Craftworks building blocks and adds governance-specific logic to produce a governance compiler.

#### What claws adds on top of building blocks

| Addition | Detail |
|----------|--------|
| Intent extraction | Parses OCWorkspaceAST (from `@craftworks/forma`) into `CapabilityManifest` -- mechanical intents, tool classifications, delegation graphs, trust tiers |
| 29 G-rules | G01-G29 governance rules with extensible `RuleRegistry`. Each rule checks a `CapabilityManifest` and produces findings |
| GovernanceIR | The claws-specific IR: `GovernanceIR`, `FailMode<R>`, `GovAnalysis`, `ConflictReport`, `AuditEvent`, `MechanicalIntent`. Serializable, inspectable, diffable |
| R5 fail-closed gate | Non-negotiable enforcement. The compiler refuses to emit R5 fail-open code. Not configurable |
| Compile orchestrator | Sequences PARSE -> EXTRACT -> ANALYZE -> OPTIMIZE -> EMIT across building blocks + claws modules |
| OC Gateway emitter | Produces `plugins/claws-governance/index.ts` -- executable TypeScript for the OC Gateway |
| Claude Code emitter | Produces `CLAUDE.md` + `.claude/settings.json` governance output (R1 C4) |
| .claws sidecar | Sidecar directory layout resolver, cache, staging (R1 M-02) |
| CLI | `claws compile`, `claws pinch`, `claws build`, `claws init`, `claws new`, `claws annotate` |

```typescript
// @claws/compiler/src/index.ts

// Re-export building block types that claws consumers need
export type { OCWorkspaceAST, FileAST, OCFileType, OCWorkspaceIR } from '@craftworks/forma';
export type { Platform } from '@craftworks/workspace';
export type { AuditChain, ChainEntry } from '@craftworks/crypto';

// claws's own types and functions
export {
  type GovernanceIR, type FailMode, type CapabilityManifest,
  type GovAnalysis, type ConflictReport, type AuditEvent,
  type MechanicalIntent,
  serialize, deserialize, validateFailModes, validateIR,
} from './ir/index.js';

export {
  type Rule, type RuleRegistry, type RuleCategory, type Severity,
  createRuleRegistry, builtinRules,
} from './rules/index.js';

export {
  type EmitTarget, type EmitOptions, type Artifact,
  type ValidationResult, EmitRegistry,
  createOCEmitter, createClaudeCodeEmitter,
} from './emit/index.js';

export { compile, pinch, build } from './orchestrator.js';
export { detectPlatforms, normalize } from '@craftworks/workspace';
```

#### What belongs WHERE

This is the critical design decision: what lives in `@craftworks/*` blocks vs what lives in `@claws/compiler`.

| Capability | Lives in | Rationale |
|-----------|----------|-----------|
| Read 9 OC files + IR types | `@craftworks/forma` | General-purpose OC infrastructure; anyone reading OC workspaces needs this |
| Ed25519, SHA-256, audit chain | `@craftworks/crypto` | General-purpose crypto + tamper-evident audit; could be used for build logs, deployment records |
| Platform detection, discovery, normalize | `@craftworks/workspace` | General-purpose; any tool that targets multiple AI platforms needs this |
| Policy walker, gates, budget | `@craftworks/governance` | General-purpose enforcement framework; not governance-rule-specific |
| Emit framework + base classes | `@craftworks/codegen` | General-purpose TS codegen; emitters are plugins |
| RELAX expressions | `@craftworks/relax` | General-purpose expression evaluator |
| Context DAG | `@craftworks/context` | General-purpose DAG operations |
| Task graph + skill resolver | `@craftworks/execution` | General-purpose execution engine |
| Rubric + assertions | `@craftworks/eval` | General-purpose evaluation framework |
| Input resolution | `@craftworks/input` | General-purpose file/URL resolution |
| Per-platform emitters | `@craftworks/emit-*` (7) | Each platform's codegen, installable independently |
| 29 governance rules | `@claws/compiler` | Governance-specific; the rules ARE the claws product |
| GovernanceIR | `@claws/compiler` | Governance-specific IR; only meaningful in a governance context |
| R5 fail-closed | `@claws/compiler` | Governance policy decision; the blocks have no opinion on policy |
| Intent extraction | `@claws/compiler` | Governance-specific interpretation of workspace content |
| Compile orchestrator | `@claws/compiler` | Sequences claws-specific phases |
| .claws sidecar layout | `@claws/compiler` | claws-specific directory structure |

**The litmus test**: Could a non-governance tool use this? If yes, it belongs in `@craftworks/*`. If it only makes sense in a governance context, it belongs in `@claws/compiler`.

#### @bic/claws-skill-kit

Already standalone. Skill decorators, factory, mock gateway. No `@craftworks/*` dependencies. No changes needed.

#### @bic/claws-test

12 governance checks (G0-G1) and 16 security scans. Depends on `@claws/compiler` for GovernanceIR types and rule execution.

### Layer 3: Enterprise Services

`@bic/claws-sdk` extends `@claws/compiler` with enterprise-scale features. Craftworks maintains this. It imports from `@claws/compiler`, never from the building blocks directly.

#### Scale Modules

| Module | Description |
|--------|-------------|
| `fleet/` | Scan, broadcast, drift detection, kill, report across workspaces |
| `compliance/` | SOC2, HIPAA, EU AI Act evidence generation |
| `siem/` | CEF, syslog, NDJSON streaming to enterprise SIEM |
| `budget/` | Token tracking, fleet budget aggregation, charter enforcement |
| `audit-ext/` | RFC3161 timestamps, fleet-wide audit aggregation, legal evidence |
| `ci-cd/` | GitHub Actions / CI pipeline integration |

#### Depth Modules

| Module | Description |
|--------|-------------|
| `press/` | PRESS compression (bipartite split, cache, profiles, quality, rewrite) |
| `relax/` | RELAX policy evaluation (typed expressions, tiered bindings) |
| `lsp/` | claws-lsp language server (document cache, project index) |
| `snapshots/` | Save, restore, diff, promote governance snapshots |
| `context/` | Context DAG (compiled context collections) |
| `serve/` | SERVE API mode (HTTP server for governance queries) |
| `identity/` | OIDC/SAML/RBAC identity bridge |
| `ontology/` | OntologyIR (compliance ontology types) |

#### Additional Emit Targets

Enterprise pulls in 5 additional emitter plugins from Layer 1 and registers them:

```typescript
import { EmitRegistry } from '@claws/compiler';
// These are Layer 1 building blocks — @craftworks/emit-* packages
import { CursorEmitTarget } from '@craftworks/emit-cursor';
import { CopilotEmitTarget } from '@craftworks/emit-copilot';
import { BedrockEmitTarget } from '@craftworks/emit-bedrock';
import { LangGraphEmitTarget } from '@craftworks/emit-langgraph';
import { CrewAIEmitTarget } from '@craftworks/emit-crewai';

EmitRegistry.register(new CursorEmitTarget());
EmitRegistry.register(new CopilotEmitTarget());
EmitRegistry.register(new BedrockEmitTarget());
EmitRegistry.register(new LangGraphEmitTarget());
EmitRegistry.register(new CrewAIEmitTarget());
```

### Extension Contract (Layer 3 -> Layer 2)

```
  @bic/claws-sdk
  +--------------------------------------------------------------+
  |                                                              |
  |  RULE 1: Import only from @claws/compiler                   |
  |          Never from @craftworks/forma directly                |
  |          The compiler's re-exports are the API surface       |
  |                                                              |
  |  RULE 2: Extend, never fork                                 |
  |          FleetAuditChain wraps AuditChain                    |
  |          Enterprise emitters implement EmitTarget            |
  |          Compliance pulls from GovernanceIR                  |
  |          Zero source duplication                             |
  |                                                              |
  |  RULE 3: Register, never monkey-patch                       |
  |          EmitRegistry.register() for new targets             |
  |          RuleRegistry.register() for enterprise rules        |
  |          No prototype mutation, no module replacement        |
  |                                                              |
  |  RULE 4: Curated re-exports, never wildcard                 |
  |          NEVER: export * from '@claws/compiler'              |
  |          Every re-exported symbol is listed explicitly       |
  |                                                              |
  +--------------------------------------------------------------+
```

### Ownership Model

```
  Craftworks maintains:          claws team maintains:
  +------------------------+     +------------------------+
  | @craftworks/forma      |     | @claws/compiler        |
  | @craftworks/workspace  |     | @bic/claws-skill-kit       |
  | @craftworks/crypto     |     | @bic/claws-test            |
  | @craftworks/governance |     |                        |
  | @craftworks/codegen    |     +------------------------+
  | @craftworks/relax      |
  | @craftworks/context    |     Craftworks ALSO maintains:
  | @craftworks/execution  |     +------------------------+
  | @craftworks/eval       |     | @bic/claws-sdk  |
  | @craftworks/input      |     +------------------------+
  | @craftworks/emit-*  x7 |
  | @craftworks/platform   |
  +------------------------+
```

**Craftworks maintains both ends of the stack**:
- Layer 1 building blocks (10 core + 7 emitters + manifest): general-purpose infrastructure, published as MIT
- Layer 3 enterprise: proprietary extensions, the revenue layer

**The claws team maintains the middle**:
- Layer 2 governance compiler: the composition that makes building blocks into a governance product

**Why this matters for competition**: A competitor could import `@craftworks/forma`, `@craftworks/crypto`, and `@craftworks/codegen` to build a totally different tool. Craftworks benefits because the building blocks get wider adoption, more bug reports, and more ecosystem gravity. The moat is claws's governance rules, GovernanceIR, and the enterprise tier -- not the infrastructure.

#### Support Boundaries

| Package | Maintained by | Bug reports to | SLA |
|---------|--------------|---------------|-----|
| `@craftworks/*` (10 core) | Craftworks | craftworks GitHub | Community (MIT) |
| `@craftworks/emit-*` (7 emitters) | Craftworks | craftworks GitHub | Community (MIT) |
| `@craftworks/platform` (manifest) | Craftworks | craftworks GitHub | Community (MIT) |
| `@claws/compiler` | claws team | claws GitHub | Community (MIT) |
| `@bic/claws-skill-kit` | claws team | claws GitHub | Community (MIT) |
| `@bic/claws-test` | claws team | claws GitHub | Community (MIT) |
| `@bic/claws-sdk` | Craftworks | Craftworks support | Enterprise SLA |

### API Stability Contract

#### Layer 1: Building Blocks

Each package follows semver independently. `@craftworks/platform` manifest declares tested-together versions.

| Package | Stability | Rationale |
|---------|-----------|-----------|
| `@craftworks/forma` | Medium | IR types + readers; AST may evolve as OC workspace format evolves |
| `@craftworks/crypto` | High (rare majors) | Crypto must be stable for audit chain compatibility; chain format changes break verification |
| `@craftworks/workspace` | Low (frequent minors) | New platforms = minor; removed platform = major |
| `@craftworks/governance` | High (rare majors) | Policy types consumed by execution and all downstream |
| `@craftworks/codegen` | Medium | Emit framework may add new base methods as platforms evolve |
| `@craftworks/relax` | High (rare majors) | Expression grammar must be stable for policy portability |
| `@craftworks/context` | High (rare majors) | DAG format consumed by context collections |
| `@craftworks/execution` | Medium | Task graph may evolve with new gate types |
| `@craftworks/eval` | Medium | Rubric format may add new assertion types |
| `@craftworks/input` | High (rare majors) | Resolution protocol is a stable contract |
| `@craftworks/emit-*` (7) | Low (frequent minors) | Platform-specific; updates when target platform changes |

Every package publishes: `publint` validation, API diff check, `CHANGELOG.md`, TypeScript `.d.ts` declarations.

#### Layer 2: Governance Compiler

`@claws/compiler` pins its Layer 1 dependencies to exact versions:

```json
{
  "dependencies": {
    "@craftworks/forma": "1.2.3",
    "@craftworks/crypto": "1.0.0",
    "@craftworks/workspace": "1.3.0",
    "@craftworks/codegen": "1.1.0",
    "@craftworks/emit-oc": "1.0.0",
    "@craftworks/emit-cc": "1.0.0"
  }
}
```

Compiler semver:
- If any dependency ships a **major**, the compiler ships a **major**
- If any dependency ships a **minor**, the compiler ships at least a **minor**
- Compiler-only changes (rules, GovernanceIR) follow their own semver

#### Layer 3: Enterprise

`@bic/claws-sdk` pins `@claws/compiler` to an exact version and its additional Layer 1 dependencies to exact versions. Curated re-export list is the contract surface.

### Migration Architecture

The graduation extracts code from compiler-sdk and agent-sdk into Layer 1 building blocks. This is the critical path -- every building block must produce equivalent output to the original.

#### Extraction Map

```
compiler-sdk                          @craftworks/* building blocks
+----------------------------------+  +----------------------------------+
| readOCWorkspaceViaFORMA()        |  | @craftworks/forma                |
| oc-soul.ts .. oc-lobster.ts      |->|   WorkspaceReader + IR types     |
| FormaIR OC subset, Zod schemas   |  |   own parse utilities            |
+----------------------------------+  +----------------------------------+
| AES-256-GCM, HMAC, SHA-256,     |  | @craftworks/crypto               |
| Ed25519, hash-chain.ts, verify.ts|->|   crypto + audit chain combined  |
+----------------------------------+  +----------------------------------+
| Platform registry, detection,    |  | @craftworks/workspace            |
| workspace discovery              |->|   detect + discover + normalize  |
+----------------------------------+  +----------------------------------+
| governance/, security/,          |  | @craftworks/governance           |
| govern/, suite/budget/           |->|   primitives + runtime + budget  |
+----------------------------------+  +----------------------------------+
| emit/ (framework, base classes)  |  | @craftworks/codegen              |
|                                  |->|   emit framework only            |
+----------------------------------+  +----------------------------------+
| emit/platforms/ (7 dirs)         |  | @craftworks/emit-* (7 plugins)   |
|                                  |->|   one package per platform       |
+----------------------------------+  +----------------------------------+
| relax/, relax-fill/              |->| @craftworks/relax                |
| context/                         |->| @craftworks/context              |
| task-execution/, quest/          |->| @craftworks/execution            |
| eval/                            |->| @craftworks/eval                 |
| input/, read/                    |->| @craftworks/input                |
+----------------------------------+  +----------------------------------+

**What stays in compiler-sdk**: FORMA format registry, multi-format routing, CREST parsing, FormaIR full type system, PRESS, LSP patterns, compilation-host orchestration wiring -- all remain in compiler-sdk for the craft plugin and other Craftworks tools.

**What stays in agent-sdk**: SIEM export, GovernanceManager, runtime wiring -- enterprise features that are not general-purpose building blocks.

#### What FORMA provided that building blocks replace

| FORMA capability | Building block replacement | Lost? |
|-----------------|---------------------------|-------|
| Format detection via registry | `@craftworks/forma` detects OC format directly | No |
| Multi-format routing | Not replaced; blocks read OC only | Yes (acceptable: claws is OC-only) |
| `readOCWorkspaceViaFORMA()` | `@craftworks/forma` WorkspaceReader | No -- equivalent |
| `projectFormaToOCWorkspace()` | Not needed; direct parsing eliminates adapter | Yes (acceptable) |
| Heuristic shadow comparison | Not replaced | Yes (acceptable: diagnostic only) |
| Shared Zod schemas | `@craftworks/forma` owns its own schemas (~150 lines) | No -- maintained independently |
| `extractFrontmatter()` | `@craftworks/forma` owns its own (~80 lines) | No -- maintained independently |
| Sidecar resolution via layout | `@claws/compiler` hardcodes `.claws/` layout | No -- simplified |
| Multi-workspace nesting | Not replaced; fleet scanning is Layer 3 | Yes (acceptable) |

**Net loss**: Multi-format breadth (CREST, astro formats). **Net gain**: Zero coupling to compiler-sdk at runtime, smaller install, faster cold start.

#### Extraction Order

Blocks are extracted in dependency order. Each phase is independently testable.

```
Phase 1: Leaf packages (no @craftworks/ deps)
  @craftworks/crypto          -- crypto + audit chain
  @craftworks/workspace       -- detect + discover + normalize
  @craftworks/relax           -- expression parser + evaluator
  @craftworks/eval            -- rubric + assertions
  @craftworks/input           -- file/URL resolution

Phase 2: Mid-tier packages (depend on Phase 1)
  @craftworks/forma           -- readers + IR (depends on crypto)
  @craftworks/governance      -- primitives + runtime + budget (depends on crypto)
  @craftworks/context         -- context DAG (depends on crypto)

Phase 3: Framework packages (depend on Phase 2)
  @craftworks/codegen         -- emit framework (depends on forma)
  @craftworks/execution       -- task graph + skills (depends on governance)

Phase 4: Emitter plugins (depend on codegen)
  @craftworks/emit-oc, emit-cc, emit-cursor, emit-copilot,
  emit-bedrock, emit-langgraph, emit-crewai

Phase 5: Composition + manifest
  @claws/compiler             -- composes subset of blocks + governance logic
  @craftworks/platform        -- compatibility manifest
  Remove compiler-sdk from @claws/compiler's dependencies
  Remove agent-sdk from @claws/compiler's dependencies
```

#### Divergence Prevention

Three layers prevent extracted code from silently diverging from the originals:

**Canary tests.** CI runs building blocks against compiler-sdk test fixtures. Upstream behavior changes fail canary tests before the block ships.

```
canary-tests/
  fixtures/              -- shared with compiler-sdk
  reader-canary.ts       -- parse fixtures with @craftworks/forma
  ir-canary.ts           -- serialize/deserialize round-trip
  crypto-canary.ts       -- signature cross-verification
  audit-canary.ts        -- chain cross-verification
```

**IR schema versioning.** `@craftworks/forma` IR carries a `version` field. `@claws/compiler`'s GovernanceIR carries its own `version`. Version mismatch between layers fails fast.

**Upstream changelog watch.** When compiler-sdk or agent-sdk ships a breaking change to a module that was extracted, evaluate whether the building block needs a corresponding update. Process gate, not automated -- some upstream changes are irrelevant to the OC-only subset.

### Equivalence Testing Strategy

Extraction must prove that building blocks produce identical output to the compiler-sdk originals.

#### Reader Equivalence

```
  Fixture workspace (9 OC files)
       |                    |
       v                    v
  FORMA path            Block path
  (compiler-sdk)        (@craftworks/forma)
       |                    |
       v                    v
  OCWorkspaceIR         OCWorkspaceAST
       |                    |
       +--------+-----------+
                |
                v
          deep-equal assertion
          (structural, field-by-field)
```

**Fixture set**: 20+ workspaces -- minimal, full, BOM-prefixed, CRLF, large (100+ tools), empty/missing/malformed files.

**Diff format**: Structural JSON diff on failure.

**Serialization round-trip**: Both paths survive `JSON.parse(JSON.stringify(ir))` with zero field loss.

#### Crypto Cross-Verification

| Property | Test |
|----------|------|
| Ed25519 signatures | Signed by `@craftworks/crypto`, verified by compiler-sdk (and vice versa) |
| HMAC-SHA256 | Identical MACs for identical inputs |
| SHA-256 | Identical hashes for identical inputs |
| Audit chain format | `@craftworks/crypto` chain JSONL parseable by agent-sdk `verify()` |
| Chain continuity | Chain started by agent-sdk can be continued by `@craftworks/crypto` (and vice versa) |
| Tamper detection | Modified entry detected by both implementations |

#### Full Pipeline Equivalence

End-to-end: same workspace -> same GovernanceIR -> same emit artifacts.

```
  Fixture workspace
       |                          |
       v                          v
  Pre-graduation path          Post-graduation path
  (compiler-sdk readers        (@craftworks/forma
   + claws rules/emit)          + @claws/compiler rules/emit)
       |                          |
       v                          v
  GovernanceIR                 GovernanceIR
       |                          |
       v                          v
  plugins/index.ts             plugins/index.ts
  CLAUDE.md                    CLAUDE.md
       |                          |
       +----------+---------------+
                  |
                  v
            byte-level comparison
            (stripping timestamps)
```

#### Equivalence Test Coverage

| Category | Count | Tier |
|----------|-------|------|
| Reader equivalence (20 fixtures) | 20 | L1 integration |
| Crypto cross-verification | 10 | L0 unit |
| Audit chain cross-verification | 5 | L1 integration |
| BOM/CRLF normalization parity | 15 | L0 unit |
| Full pipeline GovernanceIR diff | 20 | L1 integration |
| Emit-oc output comparison | 10 | L1 integration |
| Emit-cc output comparison | 10 | L1 integration |
| **Total** | **90** | |

### Composition Scenarios

The building blocks are general-purpose. claws is one composition. Others are possible.

#### Scenario A: claws (the default composition)

```bash
npm install @claws/compiler    # pulls all @craftworks/* blocks
claws pinch
```

This is the standard path. The claws compiler is the product.

#### Scenario B: Competitor builds alternative governance tool

A competitor uses Craftworks blocks to build "GuardianAI":

```typescript
import { createReader } from '@craftworks/forma';
import { AuditChain } from '@craftworks/crypto';
import { detectPlatforms } from '@craftworks/workspace';

// GuardianAI's own rules, IR, and emit logic
const ast = await createReader().read(workspaceRoot);
const platforms = detectPlatforms(workspaceRoot);
const chain = new AuditChain<GuardianEvent>(keyPair);

// Totally different governance approach
const guardianResult = guardianAnalyze(ast, platforms);
await chain.append({ type: 'guardian-compile', result: guardianResult });
```

Craftworks benefits: wider block adoption, more bug reports. The moat remains claws's 29 G-rules, GovernanceIR, and the enterprise tier.

#### Scenario C: Enterprise customer uses blocks directly

An enterprise wants OC workspace reading for their internal tooling, not governance:

```bash
npm install @craftworks/forma
```

```typescript
import { createReader } from '@craftworks/forma';

// Read workspaces for their own compliance dashboard
const ast = await createReader().read('/org/agent-workspace');
const tools = ast.tools.declarations;
// Feed into their own compliance system -- no claws involved
```

#### Scenario D: Full stack (blocks + compiler + enterprise)

```bash
npm install @bic/claws-sdk
# Installs @claws/compiler which installs all @craftworks/* blocks
```

```typescript
import { compile } from '@claws/compiler';
import { FleetScanner, SOC2Evidence } from '@bic/claws-sdk';

const ir = await compile('./workspace');
const fleet = new FleetScanner();
const workspaces = await fleet.scan('/org');
const evidence = SOC2Evidence.generate(ir);
```

### Tier Detection and Command Gating

```typescript
export type Tier = 'blocks' | 'compiler' | 'enterprise';

export function detectTier(): Tier {
  try {
    require.resolve('@bic/claws-sdk');
    return 'enterprise';
  } catch {
    try {
      require.resolve('@claws/compiler');
      return 'compiler';
    } catch {
      return 'blocks';
    }
  }
}
```

At `blocks` tier, the CLI is not available -- blocks are libraries. At `compiler` tier, core CLI commands work. At `enterprise` tier, fleet/compliance/SIEM commands are additionally available.

No phone-home. No license keys. No degraded mode. Detection is local `require.resolve`.

### Rollback Strategy

Extraction proceeds with a parallel-path feature flag during migration:

```
  claws.json
  { "reader": "standalone" }     // "monolith" | "standalone"

  @claws/compiler internally:
       |
       +--- "monolith" ----> compiler-sdk readOCWorkspaceViaFORMA()
       |
       +--- "standalone" --> @craftworks/forma
       |
       v
  (rest of pipeline identical)
```

**Rollback triggers**: equivalence test failure (high), user-reported parse error (high), >2x perf regression (medium), crypto signature mismatch (critical).

**Point of no return**: Dependencies removed only when:
1. All 90 equivalence tests pass for 2+ weeks
2. Zero user-reported errors on standalone path
3. Performance within 1.5x of monolith path
4. Flag set to `"standalone"` for all internal users for 2+ weeks

## Constraints

1. **C1: No source duplication.** Zero source files duplicated across any layer.

2. **C2: No wildcard re-exports.** Layer 2 and Layer 3 use curated re-export lists. `export *` is prohibited (R1 C2).

3. **C3: Identical core output.** `claws pinch` produces byte-identical GovernanceIR regardless of whether enterprise tier is installed.

4. **C4: Blocks are claws-agnostic.** No `@craftworks/*` building block may reference `@claws/*`, governance rules, GovernanceIR, or any claws concept.

5. **C5: R5 fail-closed non-negotiable.** Lives in `@claws/compiler`, not in blocks. The building blocks have no opinion on governance policy.

6. **C6: Ed25519 in blocks.** Cryptographic signing and audit chain ship in `@craftworks/crypto`. HMAC-only is insufficient (R1 C6).

7. **C7: No phone-home.** Tier detection is local. No external server contact.

8. **C8: No degraded mode.** Every layer works at full capability independently.

9. **C9: Blocks are neutral.** No `@craftworks/*` building block may contain claws branding, upsell messages, or references to governance.

10. **C10: DAG dependency graph.** No circular dependencies. Verified in CI.

11. **C11: Per-package testing.** Each package (block, compiler, enterprise) has its own test suite and CI job.

12. **C12: Downgrade is clean.** Removing any layer leaves lower layers functional. No orphaned state.

## Scenario Amendments

**Source**: 70 package acceptance scenarios across 20 series, 414 major+warning findings synthesized into per-package and cross-cutting constraints.

### Per-Package Constraints

#### @craftworks/forma

13. **C13: Type self-ownership.** forma must define all its own types (OCWorkspaceAST, OCWorkspaceIR, FileAST, etc.) in its own source. Zero re-exports of types originating in compiler-sdk. TypeScript .d.ts files must not reference compiler-sdk paths. (forma/S01 F01)

14. **C14: Internal import audit.** Before publish, all internal imports from compiler-sdk (static and dynamic) must be eliminated. No `import()` or `require()` referencing compiler-sdk may survive extraction. CI must scan for both static and dynamic imports. (forma/S01 F02, F07)

15. **C15: Transitive dependency audit.** `npm ls --all` for any Layer 1 package must show zero transitive dependency on compiler-sdk or agent-sdk. CI job per package. (forma/S01 F06)

16. **C16: Deterministic serialization.** `serialize()` must use canonical JSON (sorted keys, no extra whitespace). Round-trip hash stability must be platform-independent. Canvas entries sorted by filename. Empty collections serialize as `[]`, never `null` or omitted. (forma/S02 F02, F05, F08)

17. **C17: Public IR field contract.** CL-08 must define which IR fields are part of the public API surface. Compiler-internal fields (prefixed `_`) are excluded from equivalence comparisons. Forward compatibility: unknown fields are ignored on deserialization, not rejected. (forma/S02 F01, F09)

18. **C18: Encoding normalization.** forma normalizes BOM and CRLF to LF-only UTF-8-no-BOM in the IR before parsing and hashing. Original files are never modified (lossless guarantee). Source location offsets are BOM-exclusive. IR hash field must document whether it represents raw-bytes or normalized-content. (forma/S03 F01-F03)

#### @craftworks/workspace

19. **C19: Per-marker confidence rules.** Platform detection must use per-marker-combination confidence rules, not just presence/absence. Aider detection requires `.aider.conf.yml` for medium confidence; `CONVENTIONS.md` alone is low. Partial marker presence (e.g., only SOUL.md for OpenClaw) has defined behavior per platform. (workspace/S01 F01, F07)

20. **C20: Case-insensitive marker matching.** Marker file detection must use case-insensitive matching or document canonical casing requirements. Marker type (file vs directory) must be annotated in the platform registry. (workspace/S01 F02, F03)

21. **C21: Data-driven platform registry.** The 7-platform list must be a data-driven registry (JSON/YAML), not a hardcoded enum. Adding a platform should not require code changes to the detection algorithm. (workspace/S01 F04)

22. **C22: Multi-platform detection.** `detectPlatforms()` must return an array of ALL detected platforms, not just the primary. Result ordering must be deterministic (sorted by platform name). Symlink resolution via `fs.stat()` with Windows EPERM fallback. (workspace/S01 F05, F06; fleet/S02 F01)

#### @craftworks/crypto

23. **C23: Standard Ed25519 (RFC 8032).** Must use standard Ed25519, not ctx/ph variants. Key format: raw 32-byte seed (private) + 32-byte public. `sign()` and `verify()` accept `Buffer` only, not strings. No message normalization — sign exact bytes provided. (crypto/S01 F01-F04)

24. **C24: Canonical chain format.** Audit chain JSONL: sorted keys, LF line endings, no trailing newline. Hash link computation: buffer concat with no separator. Timestamp format: ISO 8601 UTC with millisecond precision. Genesis entry prev_hash: 64-byte zero sentinel. (crypto/S02 F01, F02, F06)

25. **C25: Multi-signer chain support.** Each chain entry includes the signer's public key. `verify()` supports per-entry signer keys, not single-signer assumption. Chain import validates all entries before accepting. (crypto/S02 F04, F07)

26. **C26: Freeze chain format before extraction.** The audit chain JSONL format must be frozen before extraction. Any format changes require a version bump and migration tool. Streaming verification for chains >10K entries. (crypto/S02 F09; backward-compat/S03 F01)

27. **C27: Permanent cross-verification regression test.** Ed25519 cross-verification between @craftworks/crypto and compiler-sdk must be a permanent regression test, not a one-time migration check. (crypto/S01 F07)

#### @craftworks/governance

28. **C28: Re-export ordering and collision audit.** Re-exports must be ordered: primitives before runtime before budget. All exported names must be audited for collisions across the three merged packages before publish. Named re-exports only (no default namespace export) for tree-shaking. (governance/S01 F01-F03)

29. **C29: No module-level side effects.** governance index.ts must have zero top-level initialization code. All initialization deferred to constructors or factory functions. Importing BudgetTracker must not trigger PolicyWalker initialization. (governance/S03 F01, F02)

30. **C30: BudgetTracker standalone operation.** BudgetTracker must be independently constructable with only a budget limit and optional crypto keypair. Signing is optional. Charter parsing lives in BudgetTracker, not PolicyWalker. Pluggable cost function for token models. (governance/S03 F01, F03, F06, F07)

31. **C31: Internal module boundaries.** Even within the merged package, internal module boundaries between primitives, runtime, and budget must be preserved (no cross-imports that did not exist pre-merge). Subpath exports alongside root re-exports for size-sensitive consumers. (governance/S01 F04, F05)

32. **C32: Fleet aggregation interface.** Fleet budget aggregation uses a generic `BudgetSource[]` interface, not types from @bic/claws-sdk. No upward dependency on Layer 3. (governance/S03 F04)

#### @craftworks/codegen

33. **C33: Zero emitter dependencies.** codegen package.json must not list any emit-* package as a dependency or peerDependency. Plugin discovery is import-based after registration, not dependency-based. (codegen/S03 F01)

34. **C34: EmitRegistry validation contract.** `register()` must validate plugin descriptors (name, platform, emitter class). Platform names normalized to lowercase on register and get. EmitTarget subclass validation at registration time. (codegen/S01 F01, F02, F09)

35. **C35: Registry isolation and neutrality.** EmitRegistry must be empty on import (zero side effects). Must support creating isolated instances for test contexts. `list()` returns a defensive copy. Platform-neutral public API surface — no GovernanceIR or claws-specific types. (codegen/S01 F03, F07, F08; codegen/S03 F06, F07)

36. **C36: Graceful missing-emitter handling.** Compile pipeline with no emitter returns `CompileResult` with status `emit-skipped` and human-readable diagnostic. First `get()` failure emits a one-time console hint about missing emit-* plugins. TS codegen utilities exported as top-level functions, not locked behind EmitTarget. (codegen/S03 F02, F03, F05)

#### @craftworks/execution

37. **C37: Stable topological sort.** Tasks at the same depth level must be sorted alphabetically for deterministic ordering. Parallel eligibility determined by reachability analysis, not just direct edges. (execution/S01 F01, F02)

38. **C38: Partial failure isolation.** Failed tasks block their dependents but do not cancel independent branches. Global halt is separate from per-task failure. Domain-specific error types (TaskCycleError, not CycleDetectedError from context). (execution/S01 F04, F06)

39. **C39: Dry-run mode.** Execution must support dry-run: compute ordering and parallel groups without executing tasks. Zero side effects. Returns same ordering that actual execution would use. (execution/S01 F09)

40. **C40: Skill resolution decoupled from scheduling.** Task graph API must be free of skill-resolver types. Skills resolved before task graph construction; resolved skills passed as task metadata. Subpath exports: `@craftworks/execution` for tasks, `@craftworks/execution/skills` for resolution. ESM build with tree-shakeable entry points. (execution/S01 F08; execution/S03 F01-F03)

#### @craftworks/eval, @craftworks/relax, @craftworks/context, @craftworks/input

41. **C41: Leaf package isolation.** Each leaf package (eval, relax, input) must remain zero-dependency. If @craftworks/context adds dependencies beyond crypto, they must be declared and the dependency graph impact assessed. Each package must have its own strict tsconfig.json. (forma/S01 F05; cross-package/S01 F10)

### Emitter Isolation Constraints

These apply to ALL 7 emitter plugins (@craftworks/emit-oc, emit-cc, emit-cursor, emit-copilot, emit-bedrock, emit-langgraph, emit-crewai):

42. **C42: Zero @craftworks/ references in output.** Emitted artifacts must contain zero references to `@craftworks/` or `craftworks-` package names. Governance rule IDs expanded to natural language. Configuration mapped to platform-native keys. Provenance headers use product name "claws", not npm package name. Build-environment paths must not leak through template interpolation. (emit-cc/S02 F01-F05)

43. **C43: Platform marker alignment.** Each emitter must produce markers detectable by @craftworks/workspace for the corresponding platform. Dual-marker strategy where applicable (e.g., CLAUDE.md comment + settings.json metadata key for Claude Code). Marker version in semver format. Markers must not interfere with platform parser behavior. (emit-cc/S03 F01-F05)

44. **C44: Emitter dependency boundary.** Emitters depend only on @craftworks/codegen. Additional Layer 1 dependencies require a spec amendment. Emitter plugin version field required at registration for manifest compatibility tracking. (cross-package/S01 F07; codegen/S01 F04)

45. **C45: Emitter output path anchoring.** All path computation in emitted artifacts must be workspace-root-relative, not package-installation-relative. No emitter may reference its own node_modules path in output. (cross-package/S03 F08)

### Fleet Operations Constraints

46. **C46: Platform manifest format.** @craftworks/platform must define a JSON schema for the compatibility manifest with semver range syntax. Manifest supports known-breaking annotations for specific version pairs to override the semver severity heuristic. (fleet/S01 F01, F07)

47. **C47: Resolved version comparison.** Drift detection must compare resolved versions (from lock files), not declared ranges (from package.json). Must support npm, pnpm, and yarn PnP layouts via package manager CLI, not node_modules traversal. Distinguish "not installed" from "wrong version". (fleet/S01 F02-F04)

48. **C48: Per-workspace manifest pinning.** Support per-workspace manifest version pinning for split-version fleet states. Detect which manifest version each workspace targets and compare against the correct baseline. (fleet/S01 F05; fleet/S03 F06)

49. **C49: Pre-upgrade dry-run.** Fleet upgrade must run a dry-run phase across all workspaces before any actual upgrades to surface predictable failures (peer dep conflicts, missing versions). Snapshot package-lock.json before upgrade; restore on failure. (fleet/S03 F01, F02)

50. **C50: Partial failure resilience.** Fleet upgrade supports partial success: failed workspaces roll back, successful workspaces keep the upgrade. Rollback failures escalated as critical (workspace marked "corrupted"). Classify failures as transient (retry-eligible) vs permanent. Idempotent retry: re-running skips already-upgraded workspaces. (fleet/S03 F03-F05, F12)

51. **C51: Targeted broadcast isolation.** Emitter broadcast must use `--save-exact` to prevent dependency cascade through shared @craftworks/codegen. Per-workspace lock to prevent concurrent modification. Support both platform-marker and installed-package filtering. Include commit/PR strategy, not leave uncommitted changes. (fleet/S02 F02, F05-F07)

52. **C52: Fleet exit codes and reporting.** Fleet commands exit 0 on partial success (with structured report); `--strict` flag for all-or-nothing. Drift report in json|table|csv via `--format` flag. Broadcast exit code reflects actual upgrade success. Post-upgrade verification pass across all successful workspaces. (fleet/S03 F08; fleet/S01 F08; fleet/S02 F10; fleet/S03 F11)

### Backward Compatibility Constraints

53. **C53: Re-export name preservation.** compiler-sdk re-exports must preserve old function names (e.g., `readOCWorkspaceViaFORMA`) pointing to new implementations. Compatibility shims wrap changed APIs. All re-exported packages must be regular dependencies of compiler-sdk, not devDependencies. (backward-compat/S01 F01, F02)

54. **C54: Transitively exposed type audit.** API audit must identify all transitively exposed types in .d.ts (not just explicit exports). Class re-exports must be pass-through (preserve instanceof). No wildcard re-exports in the compat layer (Extension Contract Rule 4 applies). (backward-compat/S01 F03, F05, F06)

55. **C55: Subpath export stability.** All subpath exports from compiler-sdk must be validated against actual dist/ files in CI. Subpath shims must use explicit entries (no wildcards). Shims must use targeted subpath imports from @craftworks/*, not barrel imports. Physical dist/ shims needed alongside exports map for legacy TS moduleResolution. (backward-compat/S02 F01, F02, F04, F05, F07)

56. **C56: Bidirectional codemod.** Provide a jscodeshift codemod for both upgrade (compiler-sdk -> @craftworks/*) and downgrade (@craftworks/* -> compiler-sdk). Codemod must cover src/, test/, and config files. Downgrade script must include npm prune and TS build cache cleanup. (backward-compat/S03 F02, F06, F07)

57. **C57: Compat layer lifecycle.** Define removal milestone for compiler-sdk compat re-exports (e.g., compiler-sdk 3.0.0). Deprecation via JSDoc @deprecated, not runtime console.warn(). CI job compares old vs new export lists to prevent accidental symbol drops. (backward-compat/S01 F07-F09)

58. **C58: Downgrade scope clarification.** C12 downgrade guarantee covers Layer 1 equivalence only. Layer 2/3 features are lost on downgrade. Layer 3 (enterprise) has no monolith downgrade path. New capabilities in extracted packages that have no monolith equivalent must be documented. (backward-compat/S03 F03, F05, F09)

### Cross-Package Constraints

59. **C59: CI cycle detection on .ts source.** madge --circular must scan .ts source files (not compiled .js) with per-package tsconfig.json for correct path resolution. CI must detect new inter-package edges, not just cycles. Ban or declare dynamic cross-package imports. (cross-package/S01 F01, F04, F05)

60. **C60: Version-coherence check.** When both @bic/claws-sdk and @claws/compiler depend on the same Layer 1 block through different paths, a version-coherence check must verify they pin compatible versions. This is separate from cycle detection. (cross-package/S01 F03)

61. **C61: Equivalence test rigor.** Full pipeline equivalence must compare ASTs before GovernanceIR (to isolate divergence point), define expected-change zones (import paths) vs invariant zones (logic) in emit output, and use schema-derived normalization for non-deterministic fields. Reference workspace must include all 9 file types plus canvas/. (cross-package/S03 F01, F03, F09, F11)

62. **C62: Dual-path CI until deprecation.** A dual-path CI job compiling the reference workspace through both monolith and extracted paths must run until the monolith path is officially deprecated. Document every normalization pass FORMA applies that WorkspaceReader must replicate. (cross-package/S03 F01, F10)

## Open Questions

1. **OQ-1: Block dependency pinning.** Should `@claws/compiler` pin blocks as `dependencies` (locked) or `peerDependencies` (user manages)? Locked prevents drift; peer allows sharing with other consumers. `@craftworks/platform` manifest mitigates either way.

2. **OQ-2: Enterprise module granularity.** Single `@bic/claws-sdk` or split into `@craftworks/claws-fleet`, `@craftworks/claws-compliance`, etc.?

3. **OQ-3: Block publishing cadence.** Can blocks release independently of `@claws/compiler`? Independent is faster but creates version matrix. Coordinated is slower but safer. The compiler's exact pinning + `@craftworks/platform` manifest mitigate either way.

4. **OQ-4: Monorepo for blocks.** Should the 17 packages live in the claws repo (alongside compiler-sdk) or a separate monorepo? Same repo simplifies canary tests. Separate repo isolates release cycles.

5. **OQ-5: Audit chain generic vs typed.** `@craftworks/crypto` exports `AuditChain<E>` (generic). Should it also export a concrete `AuditChain<Record<string, unknown>>` for untyped consumers, or force every consumer to specify their event type?

6. **OQ-6: Workspace package scope.** Should `@craftworks/workspace` detect only AI coding platforms, or also CI environments, container runtimes, and cloud shells? Broader scope = more users, but feature creep risk.

7. **OQ-7: Execution + skill-resolver coupling.** (R2 N13) If `claws skills` needs skill resolution but not the full execution engine, consider splitting skill-resolver back out. Monitor during implementation.

8. **OQ-8: RELAX standalone viability.** (R2 N12) If zero standalone RELAX consumers after 6 months post-launch, merge into eval. Monitor at post-Phase-5 review.

9. **OQ-9: RELAX in Layer 2 vs Layer 3.** @claws/compiler does not depend on @craftworks/relax (relax is enterprise-tier per CL-08 line 365-369). If OC workspaces contain RELAX expressions, can @claws/compiler evaluate them or must it defer to the enterprise tier? This affects full-pipeline equivalence testing — workspaces with RELAX must either be excluded or the compiler must include RELAX evaluation. (cross-package/S03 F06)

10. **OQ-10: IR hash semantics — raw vs normalized.** forma's IR hash field: should it represent the hash of raw file bytes or normalized content (BOM-stripped, LF-only)? Downstream tools (claws diff, audit chain) must agree. If raw-bytes, hashes differ across platforms for the same logical content. If normalized, hashes differ from raw file checksums. One answer must be chosen and documented. (forma/S03 F02)

11. **OQ-11: GovernanceIR versioning for mixed-version fleets.** After a partial fleet upgrade, some workspaces produce GovernanceIR v1 and others v2. Fleet-wide audit aggregation must handle both schema versions. Should GovernanceIR carry a schema version field, and must aggregation tools support N-1 compatibility? (fleet/S03 F03)

12. **OQ-12: Audit chain event ordering.** The monolith may interleave PARSE and EXTRACT audit events while the extracted path completes PARSE before starting EXTRACT. This changes chain hash links. Should audit events follow a canonical ordering (one phase fully completes before the next) or is set-based (order-independent) comparison acceptable for equivalence testing? (cross-package/S03 F07)

13. **OQ-13: Backport policy during compat window.** When fixes land in extracted packages after extraction, must they be backported to the pre-extraction compiler-sdk maintenance branch? If yes, for how long? If no, the downgrade path accepts known regressions. Define the policy and its expiration. (backward-compat/S03 F04)

## Research References

| Source | What it contributed |
|--------|-------------------|
| Graduation plan (`claws-sdk-graduation.md`) | Module inventory, effort estimates, internalization strategies |
| R1 review (5 roles, 46 findings) | 6 consensus findings: R5 in free tier, no export *, scope revision, 2nd emit target, API contract, Ed25519 in free tier |
| R1 Architect amendments (M-01 to M-03) | WorkspaceReader interface, detection heuristics split, BOM/CRLF normalization |
| Package-extraction plan R1 (5 roles, 41 findings) | Consensus: 10-12 packages, not 25; domain-based merges |
| Package-extraction plan R2 (3 roles, 15 findings) | Affirmed 10+7 model; 6 must-address for plan consistency |
| CL-04 Compilation Pipeline | 5-phase pipeline, GovernanceIR as stable pivot, emit 4-artifact model |
| CL-07 Deep Integration | FORMA sidecar, atom reuse, eval framework, contribute/keep boundary |
| CL-06 Platform Ecosystem | 7-platform detection, multi-platform emit, package ecosystem |

---

## v1.1 Amendment (Horus wave, 2026-04-16)

**Supersedes**: §Overview Layer-3 proprietary tier classification for `@bic/claws-sdk`.

Per `contract-seams.md` S1 (Horus wave 260416+horus-the-heir+claws-migration) and CL-13 §1:

- **All claws packages — including the `claws-sdk` paid extension — move to `bic/claws` during Horus** and publish as `@bic/claws-*` on GitHub Packages (GPR).
- The **freemium packaging decision is deferred to a post-Horus wave**: which packages ship under commercial terms vs MIT at public launch is an open question.
- During Horus and the ~2-month Horus-to-public-launch window, packages are effectively private (GitHub-auth-gated GPR install).
- The original §Overview Layer-3 classification is retained for historical context but no longer governs package location. Version bumped to v1.1.

This spec remains Draft. A follow-up amendment or successor spec will close the freemium decision at public-launch time.

---

## v1.2 Amendment (bic pivot, 2026-04-16)

**Supersedes**: §v1.1 "freemium packaging deferred to post-Horus" framing.

Horus relocated claws from `github.com/gim-home/claws` to `microsoft.ghe.com/bic/claws`. Consequences for CL-08:

- **claws is Microsoft-internal during Horus and the foreseeable post-Horus period.** Freemium commercial-tiering (MIT vs proprietary, Layer 1/2/3 split, enterprise-SKU framing) is only meaningful if/when claws ships publicly.
- **This spec is effectively paused**, not deferred. The freemium decision is not on any roadmap during Horus. A future "public distribution" wave (if ever) would re-open CL-08.
- **Source license posture**: claws source remains MIT-licensed at the file level (`LICENSE`), which preserves option value for any future re-licensing or redistribution decision without contractual friction.
- **Layer-3 `@craftworks/*` tier classification** (from §Overview) is now moot: no Horus packages carry `@craftworks/*`; everything is `@bic/*`.

Version bumped to 1.2. Retain v1.1 for historical context.
