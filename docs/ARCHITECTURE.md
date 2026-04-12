# claws Architecture — Implementation Guide

**Version**: 1.0
**Status**: Draft
**Purpose**: Guide the implementation of claws packages in the Craftworks monorepo. Defines package structure, dependency rules, and the boundary between claws and Craftworks.

---

## Package Map

```
                  agent-sdk              compiler-sdk
                  (runtime)        <--   (compiler, IRs, RELAX,
                  No internal deps       readers, emitters, PRESS)
                        ↑                       ↑
                        └───────┬───────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
            craftworks-sdk   claws-sdk     (future SDKs)
            (craft/guard/    (governance    
             fleet domains)   compiler,     
                              OC adapters)  
                  │             │
                  │        ┌────┼────────────────────┐
                  │        │    │            │        │
            shared-cli   claws-base-cli   claws-     claws-test
            (TUI, output, (output, SARIF,  skill-kit  (test harness
             Craftworks    progress,       (decorators, for governance
             branding)     claws branding)  annotations) skills)
                  │             │
            ┌─────┤        ┌────┼────┐
            │     │        │    │    │
         craft  guard    claws  claws-lsp  claws-serve
         -cli   -cli     -cli  (VS Code)  (HTTP API)
         fleet  forge
         -cli   -cli
```

### Hard Rules

1. **claws-sdk does NOT import craftworks-sdk.** Ever. They are siblings.
2. **claws-base-cli does NOT import shared-cli.** They are siblings. Shared utilities (if any) live in a new common package or are duplicated.
3. **claws-cli is thin.** Command registration + argument parsing + imports from claws-sdk. No business logic.
4. **No @craftworks/ in generated output.** Generated OC plugins/skills import from @openclaw/* and @claws/* only.
5. **No npx in production code or generated output.** npx is acceptable for development tooling (vitest, tsc).

---

## Package Details

### claws-sdk — The Governance Compiler Engine

The core SDK. Contains the 5-phase compilation pipeline, governance analysis, OC adapters, and the code generator that emits Gateway plugins.

```
claws-sdk/
├── src/
│   ├── compile/                    ← Phase 1-3: PARSE, EXTRACT, ANALYZE
│   │   ├── parse.ts                   Read 9 OC files → GovernanceAST
│   │   ├── extract.ts                 AST → CapabilityManifest
│   │   ├── analyze.ts                 Manifest + rules → GovAnalysis
│   │   ├── conflict-detect.ts         7 cross-file conflict categories
│   │   └── intent/                    Per-file intent extractors
│   │       ├── soul-intent.ts            SOUL.md → DenyIntent, RequireIntent
│   │       ├── tools-intent.ts           TOOLS.md → ToolManifestEntry (R1-R5)
│   │       ├── agents-intent.ts          AGENTS.md → DelegationIntent
│   │       ├── identity-intent.ts        IDENTITY.md → IdentityIntent
│   │       ├── user-intent.ts            USER.md → AuthorityIntent
│   │       ├── memory-intent.ts          MEMORY.md → MemoryIntent
│   │       ├── heartbeat-intent.ts       HEARTBEAT.md → ScheduleIntent
│   │       ├── skill-intent.ts           skills/ → SkillIntent
│   │       └── workflow-intent.ts        lobster.yaml → WorkflowIntent
│   │
│   ├── optimize/                   ← Phase 4: OPTIMIZE
│   │   ├── dead-code.ts               Remove inapplicable rules
│   │   ├── merge-checks.ts            Combine redundant checks
│   │   ├── pinch/                     PRESS→pinch governance budget optimization
│   │   │   ├── pinch-profile.ts          Governance density levels (G0-G4)
│   │   │   ├── risk-matrix.ts            Quality matrix for governance (from PRESS)
│   │   │   └── fix-rules.ts             Rewrite rules for auto-fix (from PRESS)
│   │   └── materialize.ts            DataFrame → const objects for generated code
│   │
│   ├── emit/                       ← Phase 5: EMIT (4 artifacts per CL-04)
│   │   ├── emit-skill.ts             → SKILL.md (advisory, PRESS-compressed)
│   │   ├── emit-plugin.ts            → Gateway plugin TypeScript module
│   │   ├── emit-exec-approvals.ts    → exec-approvals.json
│   │   ├── emit-workflow.ts          → lobster.compiled.yaml (workflow inversion)
│   │   └── templates/                Code templates for generated TS
│   │       ├── plugin-handler.ts.tmpl
│   │       ├── before-tool-call.ts.tmpl
│   │       ├── a2a-firewall.ts.tmpl
│   │       └── elicitation-gate.ts.tmpl
│   │
│   ├── maker/                      ← Phase 2: Maker workflow (CL-05/CL-06 scope)
│   │   └── emit-package.ts           → Complete installable skill package
│   │
│   ├── governance/                 ← The 29 governance rules
│   │   ├── rules/                     One file per rule group
│   │   │   ├── g-class.ts               R1-R5 classification
│   │   │   ├── g-perm.ts                Capability permissions
│   │   │   ├── g-data.ts                Data sensitivity labels
│   │   │   ├── g-a2a.ts                 5 A2A rules + FE6
│   │   │   ├── g-input.ts               4 input validation rules
│   │   │   ├── g-context.ts             4 context isolation rules
│   │   │   ├── g-output.ts              4 output guard rules
│   │   │   ├── g-bound.ts               4 bounded reasoning rules
│   │   │   ├── g-elicit.ts              4 elicitation rules
│   │   │   └── g-supply.ts              Supply chain rule
│   │   └── rule-registry.ts           Rule registry (all 29 rules)
│   │
│   ├── ir/                         ← GovernanceIR types
│   │   ├── governance-ir.ts           The stable pivot IR
│   │   ├── capability-manifest.ts     What the agent CAN do
│   │   ├── gov-analysis.ts            What the rules SAY about it
│   │   ├── mechanical-intent.ts       Typed intents from workspace files
│   │   └── fail-mode.ts              FailMode<R> type-level constraint (shapes IR)
│   │
│   ├── adapter/                    ← OC Gateway integration
│   │   ├── oc-data-adapter.ts         DataFrame inversion (OC memory, config)
│   │   ├── governance-host.ts         GovernanceHost 6-facet interface
│   │   └── hook-registry.ts           OC hook name mapping
│   │
│   ├── compliance/                 ← Compliance artifact generation
│   │   ├── soc2.ts                    SOC2 Type II evidence schema
│   │   ├── hipaa.ts                   HIPAA Security Rule schema
│   │   ├── eu-ai-act.ts              EU AI Act assessment schema
│   │   └── artifact-signer.ts        Ed25519 + HMAC + RFC 3161
│   │
│   ├── context/                    ← Context DAG for structural sharing
│   │   ├── context-dag.ts             Governance context subgraphs
│   │   └── context-press.ts           PRESS compression for context
│   │
│   └── types/                      ← Shared types
│       ├── config.ts                  ClawsConfig (claws.json v2 schema)
│       ├── platform.ts                Platform detection types
│       └── index.ts                   Re-exports
│
├── tests/
│   ├── compile/
│   ├── optimize/
│   ├── emit/
│   ├── governance/
│   └── fixtures/                   ← OC workspace fixtures for testing
│       ├── minimal/                   Minimal workspace (4-line claws.json)
│       ├── soc2/                      SOC2 template workspace
│       └── multi-agent/               Workspace with subagents (A2A)
│
├── package.json
├── tsconfig.json
└── vitest.config.ts

IMPORTS FROM:
  compiler-sdk: readers/oc-*.ts, relax/, ir/policy/, ir/governance/,
                ir/tool/, ir/tier/, ir/operation/, ir/press/,
                emit/platforms/, emit/reports/, meta/, audit/,
                cache/, diagnostics/, crypto.ts, scout/
  agent-sdk:    govern/, execute/delegation-guard.ts, hashing/,
                eval/, suite/audit/, suite/gates/, discovery/

DOES NOT IMPORT: craftworks-sdk, shared-cli, any CLI package
```

### claws-base-cli — CLI Foundation

Equivalent of shared-cli but for the claws product line. Contains output formatting, terminal utilities, progress indicators, and claws branding. Does NOT import shared-cli — they are siblings.

```
claws-base-cli/
├── src/
│   ├── output/                     ← Output formatting
│   │   ├── format-default.ts          Human-readable terminal output
│   │   ├── format-json.ts             JSON output mode (--json)
│   │   ├── format-sarif.ts            SARIF output for CI (--format sarif)
│   │   ├── format-csv.ts              CSV for fleet reports
│   │   ├── color.ts                   Risk-level coloring (R1=green → R5=red)
│   │   ├── table.ts                   Table rendering
│   │   └── render.ts                  Output dispatcher
│   │
│   ├── terminal/                   ← Terminal utilities
│   │   ├── progress.ts                Progress bar for fleet operations
│   │   ├── spinner.ts                 Spinner for compilation
│   │   ├── banner.ts                  claws branding banner
│   │   └── errors.ts                  Error message contract (WHAT + HOW + WHERE)
│   │
│   ├── core/                       ← Shared utilities
│   │   ├── logger.ts                  Structured logging
│   │   ├── config-loader.ts           claws.json loading + validation
│   │   ├── platform-detect.ts         Auto-detect OC workspace
│   │   └── bypass.ts                  CLAWS_BYPASS=1 handling
│   │
│   └── types/
│       └── index.ts
│
├── package.json
├── tsconfig.json
└── vitest.config.ts

IMPORTS FROM: claws-sdk (types only — ClawsConfig, Platform, GovAnalysis)
  Enforced by: ESLint @typescript-eslint/consistent-type-imports requires
  `import type` for all claws-sdk imports. Combined with no-restricted-imports
  to block non-type imports from claws-sdk (e.g., `import { compile }` is
  rejected; only `import type { GovAnalysis }` is allowed).
DOES NOT IMPORT: shared-cli, craftworks-sdk
```

### claws-cli — The Main Binary

The `claws` command. Thin: argument parsing + command registration + imports from claws-sdk and claws-base-cli. Same pattern as craft-cli.

```
claws-cli/
├── src/
│   ├── index.ts                    ← Entry point (#!/usr/bin/env node)
│   ├── cli.ts                      ← Commander.js setup, 40 commands
│   │
│   ├── commands/                   ← One file per COMMAND-MAP group (10 files = 10 groups)
│   │   ├── build.ts                   init, build, compile, optimize, test, diff,
│   │   │                              import, inspect, doctor
│   │   ├── pinch.ts                   pinch (+ --fix, --watch, --staged, --fleet)
│   │   ├── comply.ts                  comply, assess
│   │   ├── audit.ts                   audit, audit verify, audit export, audit history
│   │   ├── snap.ts                    snap save, restore, diff, promote
│   │   ├── fleet.ts                   scan, broadcast, drift, report, push, kill
│   │   ├── protect.ts                 budget, secrets, identity
│   │   ├── live.ts                    watch, session, amend (LIVE group)
│   │   ├── maker.ts                   new skill, publish, annotate, import skill
│   │   └── meta.ts                    uninstall
│   │
│   └── hooks/                      ← CLI lifecycle hooks
│       ├── pre-command.ts             Load claws.json, detect platform, check bypass
│       └── post-command.ts            Audit trail append, cleanup
│
├── bin/
│   └── claws.js                    ← Bin entry (package.json "bin": {"claws": ...})
│
├── package.json
├── tsconfig.json
└── vitest.config.ts

IMPORTS FROM: claws-sdk (all business logic), claws-base-cli (output, terminal)
DOES NOT IMPORT: craftworks-sdk, shared-cli, craft-cli, guard-cli, fleet-cli
```

### claws-lsp — Language Server (Future)

Separate binary for VS Code extension. Communicates via LSP protocol. Embeds a CompilationHost with cached GovernanceIR.

```
claws-lsp/
├── src/
│   ├── server.ts                   ← LSP server entry
│   ├── compilation-host.ts         ← Cached GovernanceIR, incremental recompile
│   ├── providers/
│   │   ├── diagnostic.ts              Governance violation diagnostics
│   │   ├── completion.ts             RELAX + policy template completion
│   │   ├── hover.ts                   Risk classification on hover
│   │   ├── code-action.ts            Fix violations
│   │   ├── semantic-tokens.ts        Risk-level coloring
│   │   └── code-lens.ts              Aggregate governance summaries
│   └── tension/
│       └── cross-file.ts             Cross-file tension detection
│
├── package.json
└── tsconfig.json

IMPORTS FROM: claws-sdk (compilation pipeline, governance rules)
DOES NOT IMPORT: claws-base-cli (no terminal output in LSP)
```

### claws-serve — HTTP API Daemon (Future)

The `claws serve` command starts this daemon. Exposes GovernanceIR via HTTP for CI/CD, Gateway hot-reload, and custom tooling.

```
claws-serve/
├── src/
│   ├── server.ts                   ← HTTP + WebSocket server
│   ├── routes/
│   │   ├── compile.ts                 POST /compile
│   │   ├── status.ts                  GET /status
│   │   ├── diagnostics.ts            GET /diagnostics
│   │   ├── tensions.ts               GET /tensions
│   │   ├── classify.ts               GET /classify/:tool
│   │   ├── ir.ts                      GET /ir
│   │   ├── snapshot.ts               POST /snapshot, GET /diff
│   │   └── health.ts                 GET /health
│   └── ws/
│       └── events.ts                 WebSocket governance event stream
│
├── package.json
└── tsconfig.json

IMPORTS FROM: claws-sdk, claws-base-cli (output formatting for responses)
```

### @bic/claws-skill-kit — Skill Author Entry Point

The skill author's primary npm dependency. Provides decorators, governance annotations, and RELAX bindings for building governance-aware OC skills. This is the community funnel: `npm install @bic/claws-skill-kit` is the first step for adoption Tier 1 (3 YAML lines).

```
claws-skill-kit/
├── src/
│   ├── decorators/                 ← Skill decorators
│   │   ├── governance.ts              @Governance, @RiskLevel, @FailMode
│   │   ├── capability.ts             @Capability, @RequireApproval
│   │   └── compliance.ts             @SOC2, @HIPAA, @EUAIAct
│   │
│   ├── annotations/                ← Governance annotations for skill metadata
│   │   ├── risk-class.ts              R1-R5 classification annotations
│   │   └── policy-ref.ts             Policy reference annotations
│   │
│   ├── relax/                      ← RELAX bindings for skill authors
│   │   └── relax-helpers.ts           Compile-time RELAX expression helpers
│   │
│   └── types/
│       └── index.ts                   Re-exports for skill authors
│
├── package.json
├── tsconfig.json
└── vitest.config.ts

IMPORTS FROM: claws-sdk (types only — GovernanceIR, FailMode, RiskLevel)
DOES NOT IMPORT: claws-base-cli, claws-cli, any CLI package
```

### @bic/claws-test — Governance Skill Test Harness

Test utilities for skill authors. Provides mock governance hosts, fixture builders, and assertion helpers for testing governance-annotated skills against compiled policies.

```
claws-test/
├── src/
│   ├── harness/                    ← Test harness
│   │   ├── mock-governance-host.ts    Mock GovernanceHost for unit tests
│   │   ├── fixture-builder.ts         Build OC workspace fixtures programmatically
│   │   └── policy-stub.ts             Stub compiled policies for testing
│   │
│   ├── assertions/                 ← Custom assertions
│   │   ├── governance-matchers.ts     Vitest matchers for governance results
│   │   └── compliance-matchers.ts     Vitest matchers for compliance artifacts
│   │
│   └── types/
│       └── index.ts
│
├── package.json
├── tsconfig.json
└── vitest.config.ts

IMPORTS FROM: claws-sdk (types + test utilities)
DOES NOT IMPORT: claws-base-cli, claws-cli, any CLI package
```

---

## Dependency Rules (Enforced by Build)

```
ALLOWED IMPORTS:
  claws-sdk       → compiler-sdk, agent-sdk
  claws-base-cli  → claws-sdk (types only, enforced by ESLint consistent-type-imports)
  claws-skill-kit → claws-sdk (types only)
  claws-test      → claws-sdk (types + test utilities)
  claws-cli       → claws-sdk, claws-base-cli
  claws-lsp       → claws-sdk
  claws-serve     → claws-sdk, claws-base-cli

FORBIDDEN IMPORTS (enforced by lint rule):
  claws-*         → craftworks-sdk     (sibling boundary)
  claws-*         → shared-cli         (sibling boundary)
  claws-*         → craft-cli          (no cross-CLI)
  claws-*         → guard-cli          (no cross-CLI)
  claws-*         → fleet-cli          (no cross-CLI)
  claws-*         → forge-cli          (no cross-CLI)
```

These rules are enforced by:
1. **tsconfig.json paths** — no path aliases for forbidden packages
2. **ESLint no-restricted-imports** — explicit deny list
3. **CI check** — `madge --circular --no-color claws-sdk/src/` to detect import cycles via dependency graph analysis (structural, not grep-based)

---

## What claws-base-cli Duplicates from shared-cli

shared-cli is 7,487 lines. claws-base-cli needs a SUBSET, adapted for claws branding:

| shared-cli module | claws-base-cli equivalent | Rewrite or duplicate? |
|-------------------|--------------------------|----------------------|
| `output/format-json.ts` | `output/format-json.ts` | Duplicate (identical pattern) |
| `output/format-sarif.ts` | `output/format-sarif.ts` | Duplicate (identical SARIF schema) |
| `output/format-csv.ts` | `output/format-csv.ts` | Duplicate (trivial) |
| `output/format-default.ts` | `output/format-default.ts` | Rewrite (claws-specific formatting) |
| `output/color.ts` | `output/color.ts` | Rewrite (R1-R5 risk colors) |
| `output/table.ts` | `output/table.ts` | Duplicate (generic table renderer) |
| `output/progress.ts` | `terminal/progress.ts` | Duplicate (progress bar) |
| `core/errors.ts` | `terminal/errors.ts` | Rewrite (WHAT + HOW + WHERE contract) |
| `core/logger.ts` | `core/logger.ts` | Duplicate (structured logging) |
| `splash/banner.ts` | `terminal/banner.ts` | Rewrite (claws branding, not craft) |
| `tui/*` | NOT included | claws v1 has no TUI — terminal output only |

**Estimated size**: ~2,000 lines (vs shared-cli's 7,487). No TUI, no wallboard, no Ink rendering.

> **Duplication trade-off (M-02)**: We choose duplication for Phase 1 to maintain the sibling boundary and independent versioning. A common `cli-foundation` package extraction (table renderer, JSON/SARIF/CSV formatters, progress bar, logger) is planned for Phase 3 if shared-cli and claws-base-cli prove to diverge less than 20%. The 20% threshold is measured by diffstat: if more than 80% of lines in the 6 duplicated modules remain identical after Phase 2 ships, extraction is warranted. If divergence exceeds 20%, the duplication is justified and no extraction occurs. This decision is visible and reversible.

---

## TypeScript Like TypeScript

The user noted: "just like TypeScript has multiple commands." TypeScript ships:

| Binary | What it does |
|--------|-------------|
| `tsc` | The compiler |
| `tsserver` | Language server for editors |

claws mirrors this:

| Binary | Package | What it does |
|--------|---------|-------------|
| `claws` | claws-cli | The governance compiler (40 commands) |
| `claws-lsp` | claws-lsp | Language server for VS Code |
| `claws-serve` | claws-serve | HTTP API daemon for CI/CD + Gateway |

All three share `claws-sdk` as the engine. claws-cli and claws-serve also share `claws-base-cli` for output formatting. claws-lsp does NOT use claws-base-cli (no terminal output in a language server).

---

## Monorepo Integration

### package.json (root)

```json
{
  "workspaces": [
    "agent-sdk",
    "compiler-sdk",
    "craftworks-sdk",
    "shared-cli",
    "craft-cli",
    "guard-cli",
    "fleet-cli",
    "forge-cli",
    "claws-sdk",
    "claws-base-cli",
    "claws-skill-kit",
    "claws-test",
    "claws-cli",
    "claws-lsp",
    "claws-serve",
    "craftworks"
  ]
}
```

### Build Order

```
agent-sdk           (0 deps)
    ↓
compiler-sdk        (depends on agent-sdk)
    ↓
┌───┴───┐
│       │
craftworks-sdk    claws-sdk          (siblings, parallel build)
│                 │
│            ┌────┼────────────┐
│            │    │            │
shared-cli  claws-base-cli  claws-skill-kit  claws-test   (parallel, all depend on claws-sdk types)
│            │
4 craft CLIs claws-cli          (parallel build)
             claws-lsp
             claws-serve
```

### Test Tiers

Each claws package follows the Craftworks test convention:

| Suffix | Tier | What it tests |
|--------|------|--------------|
| `.unit.test.ts` | L0 | Pure functions, no I/O |
| `.integration.test.ts` | L1/L2 | Multi-module, cross-package |
| `.e2e.test.ts` | L2+ | Full pipeline (parse → emit) |

Run per-package: `cd claws-sdk && vitest run`
Run all claws: `vitest run --project claws-sdk claws-base-cli claws-cli`

---

## Implementation Phases

| Phase | Packages | What ships |
|-------|----------|-----------|
| **1** | claws-sdk (compile + governance + emit) + claws-cli (minimal inline output) | `claws compile`, `claws pinch`, `claws build` |
| **2** | claws-base-cli (extracted from Phase 1 inline output) + claws-skill-kit + claws-test | Full 40-command CLI, skill author SDK |
| **3** | claws-sdk (compliance + context) | `claws comply`, `claws audit`, fleet commands |
| **4** | claws-lsp | VS Code extension |
| **5** | claws-serve | HTTP API daemon |

Phase 1 is the MVP: compile OC workspace files, run governance checks, emit a Gateway plugin. Everything else builds on that foundation.

> **M-01 Note**: claws-base-cli is a Phase 2 package. Phase 1 inlines the minimal output formatting needed for `claws compile` and `claws pinch` directly into claws-cli (format-json.ts, format-sarif.ts, color.ts). This reduces the Phase 1 package count from 5 to 2 (claws-sdk + claws-cli). claws-base-cli is extracted in Phase 2 when the full CLI ships, at which point the inlined modules are deleted from claws-cli and replaced with imports from claws-base-cli.

---

## Key Files to Create First

In priority order for Phase 1:

1. `claws-sdk/src/ir/governance-ir.ts` — the stable pivot
2. `claws-sdk/src/ir/fail-mode.ts` — FailMode<R> type constraint (shapes the IR)
3. `claws-sdk/src/compile/parse.ts` — read 9 OC files (reuse compiler-sdk readers)
4. `claws-sdk/src/compile/extract.ts` — intent extraction
5. `claws-sdk/src/governance/rules/g-class.ts` — R1-R5 classification
6. `claws-sdk/src/compile/analyze.ts` — apply rules to manifest
7. `claws-sdk/src/emit/emit-plugin.ts` — generate Gateway plugin TypeScript
8. `claws-sdk/src/adapter/governance-host.ts` — GovernanceHost 6-facet interface (required by emit-plugin.ts)
9. `claws-sdk/src/adapter/hook-registry.ts` — OC hook name mapping (required by emit-plugin.ts)
10. `claws-sdk/src/adapter/oc-data-adapter.ts` — DataFrame inversion (required by emit-plugin.ts)
11. `claws-sdk/src/emit/emit-skill.ts` — generate advisory SKILL.md
12. `claws-sdk/src/types/config.ts` — ClawsConfig (claws.json v2)
13. `claws-sdk/tests/fixtures/minimal/` — minimal OC workspace for testing

---

## Scenario-Driven Design Evolution

Across three phases (Ptah, Anubis, Thoth), 18 scenario series produced 198+ scenarios and ~2,452 findings that were applied back into specs, plans, pitfalls, and guides. This section summarizes the cumulative impact.

### Phase 1: Ptah (Foundation) — 133 scenarios, 1,056 findings
- 5 scenario series: compile-pipeline, governance-rules, fail-mode, emit-artifacts, cross-file-conflicts
- Plus 4 coverage/validation series: pitfall-coverage-1, pitfall-coverage-2, spec-constraint-validation, pitfall-final-1, pitfall-final-2
- CL-02 received 291 amendments (A1-A291)
- 161 pitfalls cataloged (P-001 through P-161)

### Phase 2: Anubis (Operations) — 35 scenarios, ~280 findings
- 3 series: three-rings (6), fleet-operations (10), snapshot-lifecycle (6)
- Plus 35 pitfall scenarios (pitfall-anubis)
- Key design areas: ring coordination, fleet scan/broadcast/drift/kill, snapshot save/restore/diff/promote

### Phase 3: Thoth (Ecosystem) — 30 scenarios, ~362 findings
- 7 series: obo-elicitation (8), a2a-governance (6), injection-defense (6), compliance-evidence (6), skill-lifecycle (5), lossless-roundtrip (5), platform-detection (7)
- Plus 53 pitfall scenarios (pitfall-thoth-1, pitfall-thoth-2)
- Key design areas: OBO boundary, A2A trust, injection defense, compliance evidence, skill lifecycle, lossless guarantee, 7-platform detection

### Cumulative Impact

| Metric | Ptah | Anubis+Thoth | Total |
|--------|------|-------------|-------|
| Regular scenarios | 70+ | 65 | 135+ |
| Pitfall scenarios | 62 | 88 | 150 |
| Total findings | 1,056 | ~1,396 | ~2,452 |
| Spec amendments | 291 (CL-02) | ~620 (all specs) | ~911 |
| Pitfalls | P-001–P-161 | P-162–P-249 | 249 |
| Plans updated | — | 15 | 15 |
| Guides updated/created | — | ~52 | ~52 |

### Spec Amendment Summary

| Spec | Amendments | Key areas |
|------|-----------|-----------|
| CL-01 | 35 | Platform detection matrix, claws.json v2, standing approvals |
| CL-02 | 488 (A1-A488) | G-ELICIT, G-A2A-*, G-INPUT/CONTEXT/OUTPUT/BOUND, compliance |
| CL-03 | 62 | Runtime enforcement, TOCTOU, lateral movement, WAL, chain validation |
| CL-04 | 79 | Lossless pipeline, BOM/CRLF, deterministic serialization, platform codegen |
| CL-05 | 235 | Three-rings, fleet ops, snapshots, skill lifecycle, maker experience |
| CL-06 | 12 | Python guard package, ClawHub marketplace, fleet governance |
