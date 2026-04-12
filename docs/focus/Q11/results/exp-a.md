# Experiment a: Module Audit — SDK Classification for claws-runtime

**Question**: Q12k — What Craftworks runtime powers claws-generated skills?
**Method**: Design analysis
**Date**: 2026-04-11

---

## Evaluation Criteria

For each module across all 3 SDKs:

1. **Gateway-safe?** Can it run inside an OC Gateway process? (Node.js, no browser APIs, no CLI dependencies)
2. **Latency** Per-invocation cost (must be <50ms for tool call interception)
3. **Dependencies** What does it pull in? (size budget for generated skills)
4. **Security** Does it expose Craftworks internals?
5. **Classification**: DIRECT-REUSE | COMPILE-TIME-ONLY | NOT-APPLICABLE

---

## agent-sdk Modules

### execute/ (WorkAgentSupervisor, TaskFsm, DelegationGuard, WAL)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **WorkAgentSupervisor** | **DIRECT-REUSE** | Pure in-memory state machine. No CLI deps, no browser APIs, no file I/O. Multi-stage pipeline with gate conditions maps directly to governance classify-elicit-execute-audit workflow. Latency: <1ms per advance/dispatch (in-memory Map lookups). Deps: only agent-sdk types. Security: exposes no Craftworks internals -- generic execution engine. |
| **AgentOrchestrator** | **DIRECT-REUSE** | Wraps WorkAgentSupervisor with concurrency control. Needed for fleet scan skill (parallel workspace scans). Same profile as Supervisor. |
| **TaskFsm** | **DIRECT-REUSE** | Pure state machine, zero deps, zero I/O. 11-state lifecycle tracks individual governance check state. Latency: <0.1ms (array lookup). Size: ~2KB. |
| **DelegationGuard** | **DIRECT-REUSE** | Pure functions (createDelegationContext, decrementDepth, assertCanDelegate). Immutable contexts. Maps directly to A2A depth limiting (G-A2A-ESCALATE). Latency: <0.1ms. Size: <1KB. |
| **WalStore** | **DIRECT-REUSE** (with caveat) | File-based WAL for crash recovery. Uses node:fs/promises and node:path -- both available in Node.js Gateway. Provides crash recovery for in-flight governance decisions. Latency: ~5-15ms per append (filesystem write with advisory lock). Size: ~3KB. Caveat: requires writable .glint/wal/ directory in workspace. |

### govern/ (GovernanceManager, CGR chain, policy walker)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **GovernanceManager** | **DIRECT-REUSE** | Budget enforcement (tokens, calls, duration) and signal rate limiting. Pure in-memory with threshold checks at 80%/95%/100%. Maps to G-BOUND budget enforcement. Latency: <0.5ms. Deps: agent-sdk types only. |
| **CGR chain** (appendEntry, readChain, verifyChain) | **DIRECT-REUSE** | Compliance Governance Record -- append-only chain with hash verification. File-based but simple JSONL. Needed for audit trail in governance skills. Latency: ~5ms per append. |
| **Policy walker** (loadPolicies) | **DIRECT-REUSE** | Reads policy YAML files and merges them. Needed for glint policy resolution at runtime. Latency: ~10ms (file reads, cached after first load). |
| **GovernClient** | **NOT-APPLICABLE** | SDK client for guard CLI. Depends on craftworks-sdk wiring. Generated skills don't call guard CLI. |

### eval/ (Rubric, Judge, Assertions)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **runL0Assertions** | **DIRECT-REUSE** | Pattern-match assertions (regex, contains, starts-with). Zero I/O, pure functions. Powers quality gates in generated skills ("does output contain PII?"). Latency: <1ms. |
| **runL1Assertions** | **DIRECT-REUSE** | Structural assertions (JSON schema, field presence). Zero I/O. Powers structural validation in generated skills. Latency: <2ms. |
| **runL2Judge** / **buildJudgePrompt** | **COMPILE-TIME-ONLY** | Requires LLM provider call. Not suitable for <50ms tool interception. Could be used in async quality gates post-execution, but not in the hot path. |
| **loadRubric** / **loadRubricFromPath** | **DIRECT-REUSE** | Loads rubric YAML for eval criteria. One-time file read at skill startup. Latency: ~5ms (cached). |
| **EvalClient** | **NOT-APPLICABLE** | SDK client for eval CLI. Generated skills don't need eval CLI orchestration. |

### suite/ (audit, gates, handshake, intervention, projection)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **suite/audit/** | **DIRECT-REUSE** | Hash-chained audit trail (SHA-256, JSONL WAL, verify, prune, query, export). Critical for governance compliance logging. Uses node:crypto (available in Node.js). Latency: ~5ms per event. Security: audit events are customer-scoped (workspace-local). |
| **suite/gates/** | **DIRECT-REUSE** | Gate lifecycle FSM, circuit breaker, auto-approve, timeout, regulatory mapping, batch approve. Powers approval workflows in governance skills. Pure logic + Zod schemas. Latency: <1ms per gate check. |
| **suite/handshake/** | **COMPILE-TIME-ONLY** | H1-H7 lifecycle protocol binds guard/craft/fleet CLIs together. Generated skills don't participate in CLI-to-CLI handshakes; they run inside a single Gateway process. |
| **suite/intervention/** | **DIRECT-REUSE** | Intervention ladder (L0-L5), escalation rules, rate limiting, revocation, confirm tokens, kill flow. Powers G-ELICIT escalation in governance skills. Latency: <1ms per check. |
| **suite/projection/** | **NOT-APPLICABLE** | Model-driven UX projection (column priority, ratio breakpoints, TUI schemas). This is presentation-layer logic for CLI rendering. Generated skills produce data, not TUI. |
| **suite/permission.ts** | **DIRECT-REUSE** | Operator identity schema (Zod). Needed for audit event attribution. Size: <1KB. |
| **suite/budget-tracker.ts** | **DIRECT-REUSE** | Budget tracking utilities. Complements GovernanceManager. |
| **suite/cgr-chain.ts** | **DIRECT-REUSE** | CGR chain operations for suite-level compliance records. |
| **suite/entity-id.ts** | **DIRECT-REUSE** | Entity ID generation. Needed for audit event IDs. |
| **suite/exit-codes.ts** | **NOT-APPLICABLE** | CLI exit codes. Generated skills return structured results, not exit codes. |

### diffgram/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **computeDiff, applyDiff** | **DIRECT-REUSE** | Field-level structural diff computation. Pure functions, zero I/O. Powers drift detection (compare current workspace config vs baseline). Latency: <2ms for typical workspace objects. Size: ~4KB. |
| **detectFieldConflicts** | **DIRECT-REUSE** | Three-way conflict detection (base/master/alternate). Powers fleet-level policy merge. Latency: <2ms. |

### discovery/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **ScoutPipeline** | **DIRECT-REUSE** | Workspace discovery -- scans directories for skill files, classifies tiers, computes hashes. Uses node:fs (available in Gateway). Powers fleet scan skill. Latency: ~50-500ms depending on workspace size (filesystem traversal). |

### sync/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **SyncTransaction** | **DIRECT-REUSE** | Compensation-based transaction for sync operations. Powers fleet policy push with rollback. Pure state tracking. Latency: <1ms. |

### provider/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **AiProvider interface** | **NOT-APPLICABLE** | LLM provider abstraction. Generated skills don't call LLMs directly -- the Gateway handles model interaction. Including providers would expose API keys and increase attack surface. |
| **QueryRuntimeProviderAdapter** | **NOT-APPLICABLE** | Query runtime provider. Wrong abstraction for generated skills. |

### hashing/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **computeHash** | **DIRECT-REUSE** | Deterministic SHA-256 hashing with recursive key sorting. Uses node:crypto. Powers content-addressable audit entries and drift detection. Latency: <1ms. Size: <1KB. |

### core/, types/, schemas/, flash/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **types/** | **DIRECT-REUSE** | Core type definitions (Result<T>, ExecutionStatus, etc.). Zero-cost type-only imports. |
| **schemas/** | **DIRECT-REUSE** | Zod schemas for agent types. Runtime validation. Size: ~5KB. |
| **core/** | **DIRECT-REUSE** | Foundation utilities. Evaluate per-function. |
| **flash/** | **NOT-APPLICABLE** | FLASH entity types (legacy Dataverse sync). Not relevant to governance skills. |

---

## compiler-sdk Modules

### astro/relax/ (RELAX expression engine)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **relax-expr-evaluator** | **DIRECT-REUSE** | Expression evaluation helpers (coercion, division guards). Pure functions. Powers policy rule evaluation at runtime. Latency: <0.5ms per evaluation. Size: ~2KB. |
| **scope-resolver** | **DIRECT-REUSE** | 3-tier scope resolution (local/parent/global) with column-shape validation. Powers RELAX expression binding resolution at runtime. Latency: <1ms. Size: ~3KB. |
| **gate-evaluation** | **DIRECT-REUSE** | Gate evaluation with warning promotion (on_fail: block/warn/skip). Powers compile-time-checked policy gates at runtime. Latency: <0.5ms. |
| **where-compile** | **COMPILE-TIME-ONLY** | Where-clause compilation (RELAX to executable). Used by claws compiler to pre-compile expressions. Output is evaluated at runtime by the evaluator. |
| **push-down-optimizer** | **COMPILE-TIME-ONLY** | Optimizer pass that pushes predicates down to data sources. Compile-time optimization, not needed at runtime. |
| **dependency-map** | **COMPILE-TIME-ONLY** | Tracks expression dependencies for incremental compilation. |
| **hash-join** | **COMPILE-TIME-ONLY** | Hash-join optimization for multi-DataFrame queries. Compile-time optimization. |
| **relax-store** | **COMPILE-TIME-ONLY** | Expression storage/retrieval for the compilation pipeline. |
| **lsp-diagnostic-provider** | **NOT-APPLICABLE** | LSP integration for IDE. Not relevant to runtime. |

### astro/crest/ (CREST parser)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **CREST workspace parser** | **COMPILE-TIME-ONLY** | 13-file workspace parser. Used by claws Phase 1 (PARSE). Not needed at runtime -- workspace is already compiled. |
| **CREST YAML concept readers** | **COMPILE-TIME-ONLY** | Per-concept .md/.yaml dispatch. Compile-time parsing. |

### astro/readers/ (format readers)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **All format readers** (OC, CC, CUR, OAI, CLN, CDX, AGT, GEM) | **COMPILE-TIME-ONLY** | Read workspace files in various formats. Used by claws Phase 1. Not needed at runtime. |

### astro/emitters/ (format emitters)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **All format emitters** | **COMPILE-TIME-ONLY** | Generate output for target platforms. Used by claws Phase 5 (EMIT). Not needed at runtime. |

### astro/meta/ (meta-format adapters)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **readSkillDir, readAgentsMd** | **COMPILE-TIME-ONLY** | SKILL.md and AGENTS.md parsing. Compile-time input. |

### astro/ir/ (PRESS IR, ReportIR, where pipeline)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **PRESS IR** | **COMPILE-TIME-ONLY** | Token optimization (bipartite-split, cache, position optimizer). Compile-time optimization pass. |
| **ReportIR** | **NOT-APPLICABLE** | Report generation IR. Not relevant to governance skills. |
| **where: pipeline** | **COMPILE-TIME-ONLY** | Where-clause compilation pipeline. Compile-time. |

### astro/optimizer/ (13-pass optimization)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **All optimizer passes** | **COMPILE-TIME-ONLY** | Optimization happens at compile time. Generated skills execute pre-optimized code. |

### astro/compiler/ (compilation facade)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **CompilerFacade** | **COMPILE-TIME-ONLY** | Core compilation orchestration. Only runs during `claws build`. |

### astro/diagnostics/, security/, telemetry/, trace/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **diagnostics/** | **COMPILE-TIME-ONLY** | Error codes and reporting for compile-time diagnostics. |
| **security/** | **COMPILE-TIME-ONLY** | Permission checks and data classification at compile time. |
| **telemetry/** | **COMPILE-TIME-ONLY** | Compiler telemetry. Not for runtime governance. |
| **trace/** | **COMPILE-TIME-ONLY** | Compiler distributed tracing. Not for runtime. |

### astro/types/, astro/contract/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **types/** | **COMPILE-TIME-ONLY** | IR type definitions. Only relevant during compilation. |
| **contract/** | **COMPILE-TIME-ONLY** | Contract parser. Compile-time. |

### All remaining compiler-sdk modules

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **astro/formats/** | **COMPILE-TIME-ONLY** | Format detection and routing. Compile-time. |
| **astro/forma/** | **COMPILE-TIME-ONLY** | Format matching utilities. Compile-time. |
| **astro/program-loader/** | **COMPILE-TIME-ONLY** | Program input loading. Compile-time. |
| **astro/task-execution/** | **NOT-APPLICABLE** | Task execution for agent orchestration, not governance. |
| **astro/role-commands/** | **NOT-APPLICABLE** | CLI commands for role management. |
| **astro/agents/** | **COMPILE-TIME-ONLY** | Agent primitives for compilation. |
| **astro/runtime/** | **COMPILE-TIME-ONLY** | Activation matrix and registries for compiler. |
| **astro/workspace/** | **COMPILE-TIME-ONLY** | FRAME workspace type system. Compile-time detection. |
| **astro/space/** | **COMPILE-TIME-ONLY** | Space model. Compile-time topology. |
| **astro/roles/** | **COMPILE-TIME-ONLY** | Role definitions. Compiled into governance rules. |
| **astro/query/** | **NOT-APPLICABLE** | Query IR. Wrong abstraction. |
| **astro/flows/** | **NOT-APPLICABLE** | Flow IR (Power Automate). Wrong domain. |
| **astro/flash/** | **NOT-APPLICABLE** | Dataverse entity sync. Wrong domain. |
| **astro/scout/** | **COMPILE-TIME-ONLY** | Workspace discovery for compiler. Runtime discovery uses agent-sdk/discovery. |
| **astro/forge/** | **NOT-APPLICABLE** | Schema-to-spec pipeline. Wrong domain. |
| **astro/trial/** | **NOT-APPLICABLE** | Integration test generation. |
| **astro/marketplace/** | **NOT-APPLICABLE** | Plugin publishing. |
| **astro/lsp/** | **NOT-APPLICABLE** | Language Server Protocol. |
| **astro/llm/** | **NOT-APPLICABLE** | LLM provider for compiler. |
| **astro/i18n/** | **NOT-APPLICABLE** | Internationalization. |
| **astro/infrastructure/** | **NOT-APPLICABLE** | Infra-as-code generation. |
| **src/operations/** | **NOT-APPLICABLE** | CRUD for artifacts. CLI/editor operations. |
| **src/bulk/** | **NOT-APPLICABLE** | Batch processing for CLI. |
| **src/config/** | **COMPILE-TIME-ONLY** | Compiler configuration. |
| **src/coverage/** | **NOT-APPLICABLE** | Role coverage engine. CLI tooling. |
| **src/events/** | **COMPILE-TIME-ONLY** | Compiler event bus. |
| **src/filter/** | **COMPILE-TIME-ONLY** | Query predicates for compiler. |
| **src/integrity/** | **COMPILE-TIME-ONLY** | Content hashing for compiler artifacts. |
| **src/lock/** | **COMPILE-TIME-ONLY** | File locking for compiler WAL. |
| **src/registry/** | **COMPILE-TIME-ONLY** | Artifact registry for compiler. |
| **src/scaffold/** | **COMPILE-TIME-ONLY** | Template generation. |
| **src/schemas/** | **COMPILE-TIME-ONLY** | Zod schemas for compiler artifacts. |
| **src/skill/** | **COMPILE-TIME-ONLY** | Skill type management for compiler. |
| **src/solutions/** | **NOT-APPLICABLE** | Solution packaging. |
| **src/storage/** | **COMPILE-TIME-ONLY** | Filesystem abstraction for compiler. |
| **src/suite/** | **NOT-APPLICABLE** | Suite SDK clients (CraftClient, etc.). CLI integration. |
| **src/types/** | **COMPILE-TIME-ONLY** | SDK types (Result<T>, SDKError). Already in agent-sdk. |
| **src/versioning/** | **NOT-APPLICABLE** | Semver lifecycle. Not for runtime. |
| **src/wal/** | **COMPILE-TIME-ONLY** | Compiler WAL. Runtime uses agent-sdk WAL. |

---

## craftworks-sdk Modules

### suite/wiring/, suite/config/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **suite/wiring/** (handler-base, sdk-context) | **NOT-APPLICABLE** | Dependency injection for CLI handlers. Generated skills don't use CLI handler patterns. |
| **suite/config/** (config-loader) | **COMPILE-TIME-ONLY** | Config loading for craft/guard/fleet CLIs. claws.json loading is done at compile time or by a thin custom loader in the runtime. |

### governance/ (RELAX evaluator, rule loader)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **governance/evaluateRelaxExpression** | **DIRECT-REUSE** | 9-step RELAX evaluation pipeline. This is the high-level evaluator that wraps the compiler-sdk RELAX primitives. Powers policy rule evaluation. Latency: ~2-5ms per expression. |
| **governance/rule-loader** | **DIRECT-REUSE** | Loads governance rules from policy files. Needed at startup. |
| **governance/composition-algebra** | **DIRECT-REUSE** | AND/OR/NOT composition of governance rules. Powers composite policy evaluation. |

### adapters/ (DataFrame projection adapters)

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **MaterializationRegistry** | **DIRECT-REUSE** | 3-level invalidation, lazy-loaded adapters. Powers structured data access in generated skills. Latency: <5ms per materialization (cached). |
| **Specific adapters** (42+ DataFrames) | **SELECTIVE** | Most are Craftworks-internal (role-capability, memory, expertise). Only governance-relevant adapters should be included: tool classification, A2A trust matrix, audit chain, fleet inventory. Security risk: internal adapters expose Craftworks workspace structure. |

### domains/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **All domains/** | **NOT-APPLICABLE** | Domain logic for CLI commands (wave, review, make, fleet, eval, etc.). Generated skills don't orchestrate CLI domains. |

### handlers/

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **All handlers/** | **NOT-APPLICABLE** | 50+ command handlers. CLI-specific. |

### All remaining craftworks-sdk modules

| Sub-module | Classification | Rationale |
|------------|---------------|-----------|
| **workspace-runtime.ts** | **NOT-APPLICABLE** | CLI boot sequence. |
| **context-assembler.ts** | **NOT-APPLICABLE** | Prompt assembly for CLI agents. |
| **charter-enforcer.ts** | **NOT-APPLICABLE** | Charter constraints for CLI. |
| **policy-engine.ts** | **COMPILE-TIME-ONLY** | Policy evaluation for CLI. Governance skills get pre-compiled policies. |
| **workflow-runner.ts** | **NOT-APPLICABLE** | CLI workflow composition. |
| **audit-trail.ts** | **NOT-APPLICABLE** | CLI audit trail (uses agent-sdk suite/audit directly). |
| **tool-verifier.ts** | **NOT-APPLICABLE** | CLI tool availability verification. |
| **store/** | **NOT-APPLICABLE** | CLI-specific typed stores. |
| **press/** | **COMPILE-TIME-ONLY** | PRESS token optimization. Compile-time. |
| **relax/** | **DIRECT-REUSE** | Shared RELAX evaluator. See governance/ above. |
| **hosts/** | **NOT-APPLICABLE** | ExecHost contract for CLI runtime. |
| **dreaming/** | **NOT-APPLICABLE** | Dreaming maintenance loop. Internal workflow. |
| **maker/** | **NOT-APPLICABLE** | Maker domain. Internal skill creation. |
| **generators/** | **NOT-APPLICABLE** | File generators. CLI tooling. |
| **branch-manager/** | **NOT-APPLICABLE** | Git branch management. |
| **init/** | **NOT-APPLICABLE** | Project initialization. CLI. |
| **middleware/** | **NOT-APPLICABLE** | Request/response pipeline. CLI. |
| **migrate/** | **NOT-APPLICABLE** | Version migration. CLI. |
| **pr/** | **NOT-APPLICABLE** | PR dashboard. CLI. |

---

## Classification Summary

### DIRECT-REUSE (import into generated code): 26 modules

**agent-sdk** (19):
- execute/WorkAgentSupervisor, AgentOrchestrator, TaskFsm, DelegationGuard, WalStore
- govern/GovernanceManager, CGR chain, policy walker
- eval/runL0Assertions, runL1Assertions, loadRubric
- suite/audit/* (hash chain, WAL, verify, prune, query, export)
- suite/gates/* (lifecycle, circuit breaker, auto-approve, timeout, regulatory, batch)
- suite/intervention/* (ladder, escalation, rate limit, revocation, confirm token, kill flow)
- suite/permission, suite/budget-tracker, suite/cgr-chain, suite/entity-id
- diffgram/* (computeDiff, applyDiff, detectFieldConflicts)
- discovery/ScoutPipeline
- sync/SyncTransaction
- hashing/computeHash
- types/*, schemas/*, core/*

**compiler-sdk** (3):
- relax/relax-expr-evaluator
- relax/scope-resolver
- relax/gate-evaluation

**craftworks-sdk** (4):
- governance/evaluateRelaxExpression (9-step pipeline)
- governance/rule-loader
- governance/composition-algebra
- adapters/MaterializationRegistry (selective adapters only)

### COMPILE-TIME-ONLY (used by claws compiler, not in output): 40+ modules

All compiler pipeline modules: CREST parser, format readers, format emitters, meta-format adapters, PRESS IR, optimizer passes, compiler facade, diagnostics, security, telemetry, trace, types/ir, where-compile, push-down optimizer, dependency map, hash-join, relax-store, and all remaining compiler-sdk modules.

### NOT-APPLICABLE (wrong abstraction): 30+ modules

Provider adapters, CLI command handlers, CLI domains, projection engine, workspace runtime, dreaming, maker, generators, branch manager, FLASH, query IR, flow IR, forge, trial, marketplace, LSP, LLM, i18n, infrastructure, task-execution, role-commands, and CLI-specific utilities.

---

## Size Budget Analysis

| Category | Estimated Size | Notes |
|----------|---------------|-------|
| execute/ (Supervisor + FSM + Delegation + WAL) | ~25KB | Core governance workflow engine |
| govern/ (GovernanceManager + CGR + policy) | ~15KB | Budget enforcement + compliance |
| eval/ (L0 + L1 assertions + rubric loader) | ~10KB | Quality gates |
| suite/audit/ | ~20KB | Hash-chained audit trail |
| suite/gates/ | ~15KB | Approval workflows |
| suite/intervention/ | ~12KB | Escalation ladder |
| diffgram/ | ~8KB | Drift detection |
| discovery/ | ~8KB | Workspace enumeration |
| sync/ | ~5KB | Compensation transactions |
| hashing/ | ~2KB | Content hashing |
| RELAX evaluator (compiler-sdk + craftworks-sdk) | ~15KB | Policy expression engine |
| MaterializationRegistry (selective) | ~10KB | DataFrame infrastructure |
| Zod schemas | ~30KB | Runtime validation (largest single item) |
| agent-sdk types | ~10KB | Type definitions |
| **Total** | **~185KB** | Well under 500KB budget |

Tree-shaking will reduce this further -- generated skills only import what they use.

---

## Three-Tier Package Model (Revised)

The module audit above classifies what CAN run at runtime. But the question of how it
appears in generated code requires a three-tier model:

### Tier 1: @openclaw/* (contributed upstream per Q12b)

Craftworks contributes 5 packages to OpenClaw. These are OC-native packages with
Craftworks-quality internals that OC developers use directly:

| Package | Powered by (internal) | OC developer sees |
|---------|----------------------|-------------------|
| `@openclaw/audit-chain` | suite/audit hash chain, WAL, verify, prune, query, export | `AuditChain.append()`, `AuditChain.verify()` |
| `@openclaw/budget-meter` | govern/GovernanceManager, budget thresholds | `BudgetMeter.check()`, `BudgetMeter.record()` |
| `@openclaw/identity-bridge` | suite/permission, entity-id | `IdentityBridge.resolve()`, `OperatorIdentity` |
| `@openclaw/siem-emitter` | suite/audit/export (SARIF, CEF, JSON, syslog) | `SiemEmitter.emit()`, `SiemEmitter.format()` |
| `@openclaw/secret-scanner` | hashing/computeHash, pattern detection | `SecretScanner.scan()`, `SecretScanner.redact()` |

### Tier 2: @claws/runtime (governance-specific helpers)

Thin utility functions that compose Tier 1 packages into governance workflows.
NOT a framework. Exported functions, not classes:

| Function | Powered by (internal) | Purpose |
|----------|----------------------|---------|
| `classify()` | RELAX evaluator + gate evaluation | Tool risk classification |
| `elicit()` | intervention ladder + confirm token | HITL approval flow |
| `audit()` | @openclaw/audit-chain composition | Governance event recording |
| `checkA2A()` | DelegationGuard | A2A delegation depth check |
| `checkBudget()` | @openclaw/budget-meter composition | Budget enforcement |
| `evaluatePolicy()` | RELAX expr-evaluator + scope-resolver | Pre-compiled policy evaluation |

### Tier 3: @craftworks/* (compiler internal only, NEVER in generated output)

Full SDKs used by the claws compiler during `claws build`:

- WorkAgentSupervisor -- orchestrates the compilation pipeline
- RELAX full engine -- compiles policy expressions
- DataFrames/MaterializationRegistry -- provides compilation context
- All COMPILE-TIME-ONLY modules from the audit above

**The generated code test**: "Would an OC developer reading this generated code understand
it without knowing Craftworks exists?" Generated code imports from Tiers 1 and 2 only.

---

## Security Assessment

| Risk | Mitigation |
|------|-----------|
| Craftworks workspace structure exposed via DataFrame adapters | Only include governance-specific adapters (tool classification, A2A trust, audit chain, fleet inventory). Exclude all internal adapters (role-capability, memory, expertise, etc.). |
| Internal error codes leak implementation details | RELAX diagnostics and gate results use generic codes (EVAL-COERCE-NAN, SC-KIND-MISMATCH). No Craftworks-specific codes in runtime modules. |
| File paths in WAL/audit expose workspace layout | WAL paths are configurable (.glint/wal/). Audit paths use workspace-relative paths. Customer controls directory structure. |
| Hash chain reveals audit event schema | Audit events use standard fields (id, timestamp, action, target, outcome). No proprietary schema. |
| GovernanceManager budget thresholds are hardcoded | 80%/95%/100% thresholds are industry-standard. Not competitively sensitive. |

**Verdict**: DIRECT-REUSE modules are safe for deployment in customer OC Gateways. The only risk is DataFrame adapter selection -- solved by selective bundling.
