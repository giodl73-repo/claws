# Graduation: Three-Layer Package Architecture

<!-- atom:claws-compiler (C01), atom:three-rings (C09), atom:three-tier-packages (C51) -->

Graduation splits the claws compiler out of its current monolithic dependency on compiler-sdk into a three-layer package model. The layers serve different audiences and carry different licenses, but the core idea is simple: Layer 1 is infrastructure building blocks that Craftworks maintains, Layer 2 is claws's governance-specific composition of those blocks, Layer 3 is the enterprise extension.

## The three layers

```
Layer 1: Building blocks         Layer 2: Governance compiler    Layer 3: Enterprise
@craftworks/* (11 packages)      @claws/compiler                 @claws/enterprise
MIT license                      MIT license                     Proprietary
Neutral infrastructure           Governance-specific             Paid extension
     |                                |                               |
     v                                v                               v
Anyone. Wrap them,               "npm install one thing,         Fleet, compliance,
rebrand them, compose them.      get governance compilation."    SIEM, PRESS, RELAX.
```

Layer 1 packages are neutral infrastructure. They solve general problems (expression engines, audit trails, crypto, code generation) with no governance opinion. Craftworks maintains these blocks. claws composes them into a governance compiler. Customers can also compose them into something entirely different.

## Why three layers

The previous model had `@claws/compiler` as a monolith that internalized everything from compiler-sdk. That couples infrastructure maintenance to governance-specific releases and forces customers to take all or nothing. The three-layer model separates concerns: Craftworks maintains infrastructure, claws composes it for governance, enterprise extends claws for fleet-scale operations.

This also makes the building blocks independently valuable. A customer who wants typed expression evaluation but not governance compilation can install `@craftworks/sift` alone. A customer who wants audit trails for a non-governance use case can install `@craftworks/audit` alone. The blocks are useful beyond claws.

## Layer 1: Building blocks (@craftworks/*)

11 individual MIT-licensed packages. Each is standalone. Each works without claws.

| Package | What it does | Deps |
|---------|-------------|------|
| `@craftworks/readers` | Workspace file reader via WorkspaceReader interface. BOM stripping, LF normalization, sidecar resolution | None |
| `@craftworks/sift` | Typed expression engine. Parse, evaluate, bind. General-purpose -- not governance-specific | None |
| `@craftworks/audit` | Ed25519-signed hash chain. Append-only, tamper-evident, JSON export | `@craftworks/crypto` |
| `@craftworks/crypto` | Ed25519 keypair, HMAC-SHA256, SHA-256. Thin wrapper over Node.js `crypto` | None |
| `@craftworks/emit` | Code generation framework. EmitTarget interface, staging, atomic writes | None |
| `@craftworks/enforce` | Fail-mode enforcement engine. Configurable per risk level | None |
| `@craftworks/security` | Input sanitization, injection defense patterns, credential leak detection | None |
| `@craftworks/schema` | Zod-based config validation framework | None |
| `@craftworks/skill-kit` | `skill()` factory + decorator infrastructure for agent skills | None |
| `@craftworks/test` | Check validator + security scans. Scenario runner framework | `@craftworks/sift`, `@craftworks/schema` |
| `@craftworks/runtime` | Thin runtime helpers (classify, elicit, audit) for skill execution | `@craftworks/audit`, `@craftworks/enforce` |

Every package has its own `package.json`, its own test suite, its own `CHANGELOG.md`. They are published independently to public npm. They carry no `@claws/*` dependency -- the building blocks do not know claws exists.

### Building block dependency graph

```
@craftworks/crypto
    |
    v
@craftworks/audit -------> @craftworks/runtime
    ^                           ^
    |                           |
    |                    @craftworks/enforce
    |
@craftworks/sift -------> @craftworks/test
    ^                          ^
    |                          |
    |                   @craftworks/schema
    |
@craftworks/readers   @craftworks/emit   @craftworks/security   @craftworks/skill-kit
(standalone)          (standalone)       (standalone)           (standalone)
```

8 of 11 packages have zero internal dependencies. The remaining 3 have at most 2. No package depends on `@claws/*`. These are infrastructure blocks, not governance blocks.

## Layer 2: Governance compiler (@claws/compiler)

claws composes the building blocks into a governance-specific compilation pipeline. This is the layer that understands OC workspaces, governance rules, GovernanceIR, and fail-closed enforcement.

```typescript
// @claws/compiler/src/index.ts — governance composition of Craftworks blocks

// Infrastructure (re-exported from @craftworks/*)
export { WorkspaceReader, NodeFsReader } from '@craftworks/readers';
export { SiftEngine, parseExpression } from '@craftworks/sift';
export { AuditChain, createChain, verifyChain } from '@craftworks/audit';
export { sign, verify, hash, generateKeyPair } from '@craftworks/crypto';
export { EmitTarget, emit } from '@craftworks/emit';
export { FailMode, validateFailModes } from '@craftworks/enforce';

// Governance-specific (unique to claws)
export { GovernanceIR, GovAnalysis, CapabilityManifest } from './ir/index.js';
export { OpenClawTarget, ClaudeCodeTarget } from './targets/index.js';
export { R5_FAIL_CLOSED } from './rules/fail-closed.js';
export { compile, build, CompileOptions, BuildOptions } from './host/index.js';
export { parseOCWorkspace } from './parser/index.js';
export { analyzeRules, GOVERNANCE_RULES } from './rules/index.js';
```

What lives in `@claws/compiler` itself (not re-exported):
- **GovernanceIR** types and serialization (~300 lines)
- **OC parser** that reads 9 specific files and builds a governance AST (~500 lines)
- **29 governance rules** and the rule analyzer (~400 lines)
- **2 governance-specific emit targets**: OpenClaw Gateway plugin, Claude Code plugin (~450 lines)
- **R5 fail-closed** configuration: wires `@craftworks/enforce` with `FailMode<5> = "fail-closed"` (~50 lines)
- **Compilation host** that orchestrates the 5-phase pipeline (~400 lines)

Total governance-specific code: ~2,100 lines. Everything else is composed from Layer 1 building blocks.

`npm install @claws/compiler` installs all 11 building blocks transitively plus the governance layer.

## Layer 3: Enterprise extension (@claws/enterprise)

The paid tier imports `@claws/compiler` and adds enterprise modules:

| Module | What it adds |
|--------|-------------|
| Fleet | Scan, broadcast, drift detection, kill switch, fleet reporting |
| Compliance | SOC2, HIPAA, EU AI Act evidence generation |
| SIEM | CEF, syslog, NDJSON streaming export |
| PRESS | Bipartite compression, cache, profiles, quality |
| RELAX | Policy expression evaluation with full eval engine |
| Identity | OIDC/SAML/RBAC bridge |
| Budget | Tracking + fleet aggregation |
| LSP | claws-lsp language server |
| Snapshots | Save/restore/diff workspace snapshots |
| Multi-platform emit | 5 additional emit targets (Cursor, Windsurf, Bedrock, Vertex, LangGraph) |

Enterprise uses curated re-exports from the compiler -- an explicit symbol list, not `export *`.

## Dependency graph: before and after

**Before graduation** (current state):

```
@bic/claws-sdk
  |
  +---> @craftworks/compiler-sdk        (monolithic)
  |       |
  |       +---> readOCWorkspaceViaFORMA()     (readers)
  |       +---> SiftEngine, parseExpression   (sift)
  |       +---> PlatformRegistry, emitters    (emit)
  |       +---> AES-256-GCM, Ed25519          (crypto)
  |       +---> ContentCache, CompileHost     (cache + host)
  |       |
  |       +---> @craftworks/agent-sdk
  |
  +---> @craftworks/agent-sdk
          |
          +---> hash-chain.ts, verify.ts      (audit)
          +---> rubric.ts, assertions.ts      (eval)
          +---> enforce.ts                    (R5)

Monolithic SDKs. Infrastructure and governance coupled.
```

**After graduation** (three-layer model):

```
Layer 1: 11 infrastructure building blocks (@craftworks/*, MIT, public npm)

  @craftworks/readers    @craftworks/sift      @craftworks/audit
  @craftworks/crypto     @craftworks/emit      @craftworks/enforce
  @craftworks/security   @craftworks/schema    @craftworks/skill-kit
  @craftworks/test       @craftworks/runtime


Layer 2: Governance composition (@claws/compiler, MIT, public npm)

  @claws/compiler
    +---> depends on all 11 @craftworks/* building blocks
    +---> src/ir/       (GovernanceIR — governance-specific)
    +---> src/parser/   (OC workspace parser — governance-specific)
    +---> src/rules/    (29 G-rules — governance-specific)
    +---> src/targets/  (OC + Claude Code emitters — governance-specific)
    +---> src/host/     (compilation orchestrator — governance-specific)


Layer 3: Enterprise extension (@claws/enterprise, proprietary)

  @claws/enterprise
    +---> @claws/compiler                (full governance compiler)
    +---> src/fleet/  src/compliance/  src/siem/  src/identity/
    +---> src/press/  src/relax/       src/budget/ src/lsp/
```

## Three composition scenarios

The building blocks are neutral infrastructure. Here is how different customers use them.

### Scenario 1: Use as-is

A developer who wants compiled governance with no customization.

```bash
npm install @claws/compiler
```

They get the full compilation pipeline. `claws compile` reads 9 files, analyzes 29 rules, emits a Gateway plugin. The `@craftworks/*` blocks are transitive dependencies -- the developer never interacts with them directly.

### Scenario 2: Wrap with branding

A consulting firm builds "AcmeSafe" -- their own governance product for their clients. They compose the Craftworks building blocks directly, bypassing claws entirely.

```bash
npm install @craftworks/readers @craftworks/sift @craftworks/enforce @craftworks/emit
```

```typescript
// acmesafe-compiler/src/index.ts
import { NodeFsReader } from '@craftworks/readers';
import { SiftEngine } from '@craftworks/sift';
import { validateFailModes } from '@craftworks/enforce';
import { EmitTarget } from '@craftworks/emit';

export async function acmesafeCompile(workspace: string) {
  const reader = new NodeFsReader(workspace);
  // AcmeSafe's own rules, own IR, own emit targets
  // No @claws/* dependency. No governance opinion from claws.
}
```

AcmeSafe can add their own rules, their own IR types, their own CLI. The Craftworks blocks do the infrastructure work. AcmeSafe owns the product. Craftworks supports the blocks. claws is not involved at all.

### Scenario 3: Cherry-pick

A platform team only needs audit trails and expression evaluation -- no compiler, no governance, no emit.

```bash
npm install @craftworks/audit @craftworks/sift
```

```typescript
import { createChain } from '@craftworks/audit';
import { parseExpression, SiftEngine } from '@craftworks/sift';

// Use audit chains for their own agent monitoring (nothing to do with governance)
const chain = createChain({ keyPair: await generateKeyPair() });

// Use sift for their own policy rules (nothing to do with OC)
const expr = parseExpression('cost > 10 AND region == "eu-west"');
```

Two packages, ~40KB total, zero governance opinions, zero `@claws/*` dependencies. The building blocks are useful far beyond governance compilation.

## What Craftworks supports vs what is customer-owned

| | Craftworks supports | Customer owns |
|---|---|---|
| **Bug in @craftworks/sift** | Fix it, release patch | -- |
| **Bug in customer's composition** | -- | Customer debugs their own wiring |
| **New emit target request** | Evaluate, maybe add to @craftworks/emit | Customer can implement EmitTarget now |
| **Security vulnerability in @craftworks/crypto** | CVE, patch, advisory | -- |
| **Customer's branded compiler crashes** | -- | Customer's product, customer's support |
| **Bug in @claws/compiler governance rules** | Fix it, release patch | -- |
| **Customer wants different governance rules** | -- | Compose @craftworks/* blocks with their own rules |
| **@claws/enterprise features** | Full support, SLA, dedicated channel | -- |

The boundary: Craftworks maintains the infrastructure blocks. claws maintains the governance composition. Customers own anything they build on top of either layer. We never support someone's custom composition, but we always support the blocks and the compiler they used to build it.

### What this means for generated output

No generated artifact (SKILL.md, plugin TypeScript, exec-approvals.json) contains internal infrastructure references. Generated code references `@claws/*` packages (the governance layer) that the developer can inspect, understand, and replace.

## API stability contract

- All Layer 1 packages follow semver strictly
- `@claws/compiler` (Layer 2) pins Layer 1 packages with exact versions + integrity hashes
- `@claws/enterprise` (Layer 3) pins `@claws/compiler` with exact version + integrity hash
- Every release runs `publint` + API diff against previous version
- Each package has its own `CHANGELOG.md`
- Breaking changes to Layer 1 require coordinated releases up through Layer 2 and Layer 3

## Security invariants (all layers)

These hold regardless of which layer or composition a customer uses:

- **R5 fail-closed**: `@craftworks/enforce` provides the engine; `@claws/compiler` wires it to `FailMode<5> = "fail-closed"`. Non-negotiable in the governance layer. Customers composing their own system can configure enforce differently
- **Ed25519 audit chain**: `@craftworks/audit` signs locally with tamper detection
- **Lossless roundtrip**: `@craftworks/readers` never writes to the workspace
- **No internal leaks in output**: Generated code contains zero internal infrastructure references

## Timeline

Post-Thoth, ~10 weeks total:
- Phase 1 (8 weeks): Extract 11 building blocks from compiler-sdk and agent-sdk into `@craftworks/*` packages
- Phase 2 (2 weeks): Wire `@claws/compiler` composition layer, publish all packages, migration guide

Prerequisite: all 3 claws waves (Ptah, Anubis, Thoth) must ship first.

## Related

- [Package Model](packages.md) -- package map (needs update for three-layer model)
- [Three-Tier Packages](three-tier-packages.md) -- the @openclaw/@claws/@craftworks tier model
- [Compilation Pipeline](compiler.md) -- what the compiler does
- [claws-sdk](claws-sdk.md) -- the SDK architecture
