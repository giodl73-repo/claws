# Experiment d: SDK Domain Design

**Method**: design analysis
**Date**: 2026-04-11
**Sources**: SU-01 (thin CLI pattern), CODEBASE.md (SDK owns all business logic), Q12 experiments a-c

---

## Design Principle

From CLAUDE.md: **"All business logic, domain decisions, orchestration, and state transitions live in the SDK packages. CLIs are thin UI adapters."** This means clawsc-cli and clawops-cli parse arguments, call SDK functions, and render results. They never make domain decisions.

The question is: where does the OpenClaw-specific SDK logic live?

---

## Three Options

### Option 1: New package `openclaw-sdk`

```
openclaw-sdk/
  src/
    workspace-detector.ts
    diagnostic-formatter.ts
    ...
```

**Pro**: Clean separation, independent versioning possible.
**Con**: Another package in the monorepo. Violates SU-01's single-package model. Version alignment complexity.

### Option 2: Domain in `craftworks-sdk`

```
craftworks-sdk/
  src/domains/openclaw/
    workspace-detector.ts
    diagnostic-formatter.ts
    ...
```

**Pro**: Follows existing domain pattern (guard, fleet, review, discipline, wave). Same package, same version. SDK owns all logic per CODEBASE.md.
**Con**: craftworks-sdk grows. But it's already the domain SDK — this is where domains go.

### Option 3: Inline in CLI packages

```
clawsc-cli/src/oc-detector.ts
clawops-cli/src/oc-fleet.ts
```

**Pro**: Simplest.
**Con**: Violates "SDK owns all business logic." Two CLI packages would duplicate shared OC logic.

### Verdict: Option 2 — domain in craftworks-sdk

This is the right answer because:
1. Follows the established pattern (`src/domains/guard/`, `src/domains/fleet/`, etc.)
2. Shared between clawsc-cli and clawops-cli without duplication
3. Single version with the rest of the suite
4. SDK owns the logic; CLIs are thin adapters

---

## Module Inventory

### craftworks-sdk/src/domains/openclaw/

| Module | Purpose | Why SDK (not CLI) |
|--------|---------|-------------------|
| **workspace-detector.ts** | Auto-detect OC workspace from SOUL.md, AGENTS.md, USER.md, TOOLS.md, openclaw.json presence | Detection logic is a domain decision (which files signal OC format) |
| **project-resolver.ts** | Resolve detected OC workspace to a `CompilationInput` that the Astro pipeline accepts | Transforms OC layout to compiler input — domain logic |
| **diagnostic-formatter.ts** | Translate ASTRO/GUARD/FORMA diagnostic codes into OC-native terminology | Terminology mapping is a domain decision ("SOUL.md missing" not "CREST boundary absent") |
| **template-mapper.ts** | Map OC workspace concepts to guard policy templates; recommend appropriate template based on workspace content | Policy recommendation is a domain decision |
| **migration-advisor.ts** | Analyze cross-compilation loss matrix and advise on migration paths; explain what's lossy and suggest alternatives | Migration advice is domain knowledge (Spec 103 loss matrix) |
| **quickstart.ts** | Interactive init flow: detect OC workspace → suggest template → scaffold governance → run first check | Orchestration of detection + template + scaffold is domain logic |
| **snapshot-manager.ts** | Workspace-level snapshot lifecycle (save/restore/diff/deploy/prune/verify) with OC-aware naming | Wraps cache-snapshot.ts with OC terminology and defaults |
| **fleet-snapshot.ts** | Fleet-level snapshot coordination (promote workspace → fleet, fleet save/restore, two-level integrity) | Fleet snapshot aggregation is domain logic |
| **push-manager.ts** | Fleet push: compile from fleet snapshot + broadcast artifacts to all workspaces | Orchestrates snapshot → compile → broadcast pipeline |
| **rollback-manager.ts** | Fleet rollback: restore fleet/workspace snapshot + re-deploy with granularity (fleet/team/workspace) | Orchestrates restore → deploy with scope selection |

### What stays in compiler-sdk (already exists)

| Module | Location | Used by |
|--------|----------|---------|
| OpenClaw reader | `compiler-sdk/src/astro/readers/openclaw-reader.ts` | clawsc compile/build (via project-resolver) |
| FORMA primitives (11) | `compiler-sdk/src/astro/forma/primitives/oc-*.ts` | clawsc compile/build |
| OpenClaw emitter | `compiler-sdk/src/astro/emit/platforms/openclaw-emitter.ts` | clawsc build (emit back to OC) |
| Format mappings | `compiler-sdk/src/astro/forma/mappings/openclaw.format.yaml` | FORMA pipeline |
| Dependency graph | `compiler-sdk/src/astro/forma/dependency-graph.ts` | clawsc watch (internal) |
| Amendment pipeline | `compiler-sdk/src/astro/forma/amendment.ts` | clawsc amend |
| Cache snapshot | `compiler-sdk/src/astro/compiler/cache-snapshot.ts` | snapshot-manager.ts |
| Compilation forest | `compiler-sdk/src/astro/compiler/compilation-forest.ts` | clawsc session/watch |
| Compilation host | `compiler-sdk/src/astro/compiler/compilation-host.ts` | clawsc compile (internal) |
| Policy IR + compiler | `compiler-sdk/src/astro/ir/policy/` | clawsc check |
| Audit chain | `compiler-sdk/src/astro/audit/audit-chain.ts` | clawsc audit |

### What stays in craftworks-sdk (already exists)

| Module | Location | Used by |
|--------|----------|---------|
| SIEM emitter | `craftworks-sdk/src/domains/guard/audit/siem-emitter.ts` | clawsc audit export |
| Artifact signer | `craftworks-sdk/src/domains/guard/audit/artifact-signer.ts` | clawsc comply |
| Guard domain | `craftworks-sdk/src/domains/guard/` | clawsc check/comply/assess |
| Fleet domain | `craftworks-sdk/src/domains/fleet/` | clawops scan/drift/broadcast |

### New CLI packages (thin adapters)

| Package | Commands | Pattern |
|---------|----------|---------|
| **clawsc-cli** | 23 commands | Parse args → call `@craftworks/sdk` domains/openclaw + compiler-sdk → render output |
| **clawops-cli** | 17 commands | Parse args → call `@craftworks/sdk` domains/openclaw + fleet → render output |

CLI packages follow the same pattern as guard-cli and fleet-cli:
- Commander.js for argument parsing
- Call SDK functions
- Format output (table, JSON, human-readable)
- Exit codes (0 = clean, 1 = violations found, 2 = usage error)

---

## Dependency Graph

```
clawsc-cli ────────► craftworks-sdk/domains/openclaw/ ────► compiler-sdk/astro/
     │                      │                                     │
     │                      ├── workspace-detector.ts             ├── readers/openclaw-reader.ts
     │                      ├── project-resolver.ts               ├── forma/primitives/oc-*.ts
     │                      ├── diagnostic-formatter.ts           ├── emit/platforms/openclaw-emitter.ts
     │                      ├── template-mapper.ts                ├── ir/policy/policy-compiler.ts
     │                      ├── quickstart.ts                     ├── audit/audit-chain.ts
     │                      └── snapshot-manager.ts               ├── compiler/cache-snapshot.ts
     │                                                            └── compiler/compilation-forest.ts
     │
     └────────────► craftworks-sdk/domains/guard/
                         ├── audit/siem-emitter.ts
                         └── audit/artifact-signer.ts

clawops-cli ───────► craftworks-sdk/domains/openclaw/ ────► compiler-sdk/astro/
     │                      │
     │                      ├── fleet-snapshot.ts
     │                      ├── push-manager.ts
     │                      └── rollback-manager.ts
     │
     └────────────► craftworks-sdk/domains/fleet/
                         ├── policy-broadcast.ts (CP-3)
                         └── drift-detector.ts (CP-3)
```

---

## Diagnostic Formatter Example

The formatter is the most user-visible SDK module. It translates compiler internals to OC language:

| Internal Diagnostic | OC Translation |
|--------------------|---------------|
| `GUARD-POLICY-001: Model not in allowlist` | `Your agent uses a model not approved by your organization's policy. Allowed: claude-sonnet-4-5-20250514, gpt-4o` |
| `GUARD-FENCE-FE5-003: Tool 'shell' requires T3` | `Shell access requires elevated trust (T3). Your workspace is at T2. Add a trust_tier_gate to .craft/policies/ or request elevation.` |
| `FORMA-A-001: Unknown type 'Potion'` | `Unknown concept type 'Potion' in your OpenClaw workspace. Valid types: Skill, Task, Route, Memory, Canvas.` |
| `GUARD-SECRETS-001: Plaintext API key detected` | `Plaintext API key found in TOOLS.md. Use 'clawsc secrets set' to store it in the encrypted vault.` |
| `CRAFT-CACHE-002: Integrity hash mismatch` | `Snapshot 'production' may be corrupted. Run 'clawsc snapshot verify production' to diagnose.` |

The formatter doesn't change severity or suppress diagnostics — it only changes the message text. The diagnostic code is always preserved for cross-reference.

---

## Key Findings

1. **Domain in craftworks-sdk is the right home** — follows existing pattern, shared between both CLIs
2. **10 new SDK modules** needed in `craftworks-sdk/src/domains/openclaw/`
3. **All compiler-sdk modules already exist** — no new compiler code needed for Phase 1
4. **CLI packages are genuinely thin** — Commander.js → SDK call → output formatting
5. **Diagnostic formatter is the highest-impact module** — it's what makes clawsc feel native to OC users
6. **3 modules are new capabilities** (fleet-snapshot, push-manager, rollback-manager) — not in any existing plan
7. **Dependency graph is clean** — no circular deps, clear layer separation
