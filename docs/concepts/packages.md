# Package Model

<!-- atom:claws-compiler (C01), atom:three-tier-packages (C51) -->

claws ships as 5 packages across two tiers: a free tier (MIT, public npm) and a paid tier (proprietary, private registry). The free tier is a fully functional compiler. The paid tier extends it with fleet-scale operations and deep compliance tooling.

## The 5 packages

### Free tier: @claws/* (MIT license)

| Package                | Purpose                                                                                             | Standalone?                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `@claws/compiler`      | Core compilation pipeline: parse 9 OC files, extract intents, analyze 29 rules, emit Gateway plugin | Yes -- zero `@craftworks/*` dependencies |
| `@bic/claws-skill-kit` | `skill()` factory + 6 governance decorators for skill authors                                       | Yes -- works without the compiler        |
| `@bic/claws-test`      | 12-check validator + 16 security scans for governance testing                                       | Yes -- works without the compiler        |

### Paid tier: @craftworks/* (proprietary license)

| Package          | Purpose                                                                                            | Extends           |
| ---------------- | -------------------------------------------------------------------------------------------------- | ----------------- |
| `@bic/claws-sdk` | Enterprise governance SDK: fleet, compliance, SIEM, PRESS, RELAX, identity, budget, LSP, snapshots | `@claws/compiler` |
| `@bic/claws-cli` | Enterprise CLI commands: fleet scan, compliance report, SIEM export                                | `@bic/claws-sdk`  |

## Dependency graph

```
  @claws/compiler (free, MIT)        @bic/claws-skill-kit (free, MIT)
       |                                    |
       | (no cross-dependency)              | (no cross-dependency)
       |                                    |
  @bic/claws-sdk (paid)       @bic/claws-test (free, MIT)
       |
       v
  @bic/claws-cli (paid)
```

Key constraints:

- `@claws/compiler` has zero `@craftworks/*` dependencies
- `@bic/claws-skill-kit` and `@bic/claws-test` are fully standalone -- no compiler dependency
- `@bic/claws-sdk` imports `@claws/compiler` and extends with enterprise modules
- `@bic/claws-cli` imports only from `@bic/claws-sdk` (thin UI adapter)
- No circular dependencies. No cross-tier back-references

## Which package owns which module

### @claws/compiler

| Module                     | What it does                                               |
| -------------------------- | ---------------------------------------------------------- |
| `src/readers/`             | 9-file OC workspace reader via WorkspaceReader interface   |
| `src/readers/normalize.ts` | BOM stripping + CRLF normalization                         |
| `src/sidecar/`             | .claws sidecar resolver + detection heuristics             |
| `src/emit/oc-plugin.ts`    | OpenClaw Gateway plugin emitter                            |
| `src/emit/cc-plugin.ts`    | Claude Code plugin emitter (CLAUDE.md + settings.json)     |
| `src/emit/codegen.ts`      | TypeScript code generation                                 |
| `src/crypto/`              | Ed25519 keypair + HMAC-SHA256 + SHA-256 via Node.js crypto |
| `src/audit/`               | Ed25519-signed audit chain with tamper detection           |
| `src/enforce/`             | R5 fail-closed enforcement                                 |
| `src/test/`                | 12-check validator (subset of @bic/claws-test)             |
| `src/cache/`               | Content-hash cache for incremental recompilation           |
| `src/host/`                | Compilation orchestrator                                   |

### @bic/claws-skill-kit

| Module            | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| `src/skill.ts`    | `skill()` factory function                                                            |
| `src/decorators/` | 6 governance decorators: `@classify`, `@elicit`, `@audit`, `@budget`, `@data`, `@obo` |
| `src/mock.ts`     | Governance mocking for tests                                                          |

### @bic/claws-test

| Module          | What it does                                                 |
| --------------- | ------------------------------------------------------------ |
| `src/checks/`   | 12 governance validation checks                              |
| `src/scans/`    | 16 security scans (supply chain, credential leak, injection) |
| `src/runner.ts` | Scenario runner for governance test suites                   |

### @bic/claws-sdk

| Module            | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `src/fleet/`      | Scan, broadcast, drift detection, kill switch, reporting |
| `src/compliance/` | SOC2, HIPAA, EU AI Act evidence generation               |
| `src/siem/`       | CEF, syslog, NDJSON streaming export                     |
| `src/press/`      | PRESS compression (bipartite split, cache, profiles)     |
| `src/relax/`      | RELAX policy expression evaluation                       |
| `src/identity/`   | OIDC/SAML/RBAC bridge                                    |
| `src/budget/`     | Budget tracking + fleet aggregation                      |
| `src/lsp/`        | claws-lsp language server                                |
| `src/snapshot/`   | Save/restore/diff workspace snapshots                    |
| `src/context/`    | DAG-based context collections                            |
| `src/serve/`      | SERVE API mode                                           |

## How the paid tier extends the free tier

The paid tier uses curated re-exports -- an explicit symbol list, not `export *`:

```typescript
// @bic/claws-sdk/src/index.ts

// Curated re-exports from the free tier
export {
  GovernanceIR,
  FailMode,
  CapabilityManifest,
  GovAnalysis,
  ConflictReport,
  AuditEvent,
  MechanicalIntent,
  serialize,
  deserialize,
  validateFailModes,
  Platform,
  EnforcementModel,
  PlatformCapability,
} from "@claws/compiler";

// Enterprise extensions (not in free tier)
export { FleetScanner, FleetBroadcaster, DriftDetector } from "./fleet/index.js";
export { SOC2Evidence, HIPAAEvidence, EUAIActEvidence } from "./compliance/index.js";
export { CEFEmitter, SyslogEmitter, NDJSONEmitter } from "./siem/index.js";
// ... etc
```

Why curated, not wildcard:

- `export *` leaks internal symbols across the package boundary
- Breaking-change detection is impossible when the export surface is implicit
- Supply-chain risk: a new internal symbol in `@claws/compiler` silently becomes part of the paid tier's API

Existing `@bic/claws-sdk` users see no change. The SDK re-exports the same symbols they already use. The underlying implementation moves from compiler-sdk to @claws/compiler, but the public API is stable.

## API stability contract

- `@claws/compiler` follows semver strictly. Major = breaking, minor = features, patch = fixes
- `@bic/claws-sdk` pins `@claws/compiler` with exact version + integrity hash:
  ```json
  {
    "@claws/compiler": "1.2.3",
    "@claws/compiler-integrity": "sha512-abc123..."
  }
  ```
- Breaking changes to `@claws/compiler` require a coordinated release of `@bic/claws-sdk`
- Every release runs `publint` (packaging lint) + API diff check against the previous version
- `CHANGELOG.md` in `@claws/compiler` documents every public API change

## Installation

### Free tier (individual developers)

```bash
# Core compiler
npm install @claws/compiler

# Skill development
npm install @bic/claws-skill-kit

# Governance testing
npm install @bic/claws-test
```

All three packages install from public npm. No registry configuration needed. No authentication. No `@craftworks/` dependencies.

### Paid tier (enterprise)

```bash
# Configure private registry (one-time)
npm config set @craftworks:registry https://registry.craftworks.dev
npm login --scope=@craftworks

# Install enterprise SDK
npm install @bic/claws-sdk

# Enterprise CLI (global)
npm install -g @bic/claws-cli
```

`@bic/claws-sdk` automatically installs `@claws/compiler` as a dependency. Enterprise users get both tiers with one install.

## Related

- [Graduation](graduation.md) -- how @claws/compiler becomes standalone
- [Three-Tier Packages](three-tier-packages.md) -- the @openclaw/@claws/@craftworks tier model
- [claws-sdk](claws-sdk.md) -- the SDK architecture
- [Compilation Pipeline](compiler.md) -- what the compiler does
