# exp-a: IR Reuse Map

**Question**: Q12m — How does claws-sdk compose on top of compiler-sdk + agent-sdk?
**Experiment**: Classify every IR in compiler-sdk for claws reuse mode
**Method**: Design analysis (read actual IR source files)
**Date**: 2026-04-11

---

## Classification Criteria

| Mode | Definition |
|------|-----------|
| **DIRECT** | claws uses the IR as-is. Imports types, compiler, evaluator unchanged. |
| **EXTEND** | claws adds new emitter, pass, or target to existing IR infrastructure. |
| **INSPIRE** | claws borrows the pattern/architecture but builds its own implementation. |
| **SKIP** | claws doesn't need this IR. Craftworks-internal or wrong abstraction. |

---

## IR Inventory: compiler-sdk/src/astro/ir/

There are 49 IR subdirectories in compiler-sdk. The Q12m working notes listed 12. Here is the
complete classification of every IR subsystem.

### Tier 1: Governance Engine (DIRECT)

These four IRs ARE the governance compilation engine. claws imports them directly.

| IR | Location | Alias | Reuse | claws Pipeline Phase | Import Path |
|----|----------|-------|-------|---------------------|-------------|
| **PolicyIR** | `ir/policy/` | PL | DIRECT | ANALYZE | `@craftworks/compiler-sdk/astro/ir/policy/policy-ir` |
| **GovernanceIR** | `ir/governance/` | GV | DIRECT | ANALYZE | `@craftworks/compiler-sdk/astro/ir/governance/governance-relax-compile` |
| **ToolIR** | `ir/tool/` | RT | DIRECT | EXTRACT | `@craftworks/compiler-sdk/astro/ir/tool/tool-relax-compile` |
| **TierIR** | `ir/tier/` | TI | DIRECT | EXTRACT | `@craftworks/compiler-sdk/astro/ir/tier/tier-relax-compile` |

**Why DIRECT**: These four compile governance constraints, tool authorization, and tier
assignment using RELAX expressions. PolicyIR has 8 rule kinds (model_allowlist, tool_blocklist,
require_section, content_restriction, trust_tier_gate, pii_detection, budget_ceiling,
custom_predicate). GovernanceIR validates constraint/audit/classification consumers. ToolIR
handles authorization/capability-filter/health-gate. TierIR handles assign/promote. All four
use the RELAX type guard system. claws's G-CLASS, G-ELICIT, G-BOUND map directly to these.

**PolicyIR composition algebra**: Later files ADD rules or ESCALATE severity. Rules cannot be
removed by omission. This is exactly the governance layering model claws needs (org policy >
team policy > workspace policy).

### Tier 2: Code Generation Engine (EXTEND)

These IRs need new emitters or passes added by claws-sdk.

| IR | Location | Alias | Reuse | claws Phase | What claws Adds | Import Path |
|----|----------|-------|-------|-------------|----------------|-------------|
| **OperationIR** | `ir/operation/` | OP | EXTEND | EMIT | TypeScript emitter (OperationIR -> .ts file) | `@craftworks/compiler-sdk/astro/ir/operation/lowering` |
| **QueryIR** | `query/` | QC | EXTEND | EMIT | `openclaw-memory` emit target (6th target) | `@craftworks/compiler-sdk/astro/query/emit` |
| **PRESS** | `ir/press/` | DC | EXTEND | OPTIMIZE | `pinch` profile (token -> governance budget) | `@craftworks/compiler-sdk/astro/ir/press/quality-matrix` |
| **SkillIR** | `ir/skill/` | SK | EXTEND | PARSE | OC skill reader (SKILLS.yaml -> SkillIR) | `@craftworks/compiler-sdk/astro/ir/skill/lowering` |

**OperationIR details**: Already has 16 AST node types (read-file, write-file, bash, mcp-call,
llm-call, sequence, parallel, conditional, loop, confirmation, etc.). The lowering pass
(lowering.ts) transforms SkillIR -> OperationIR with tool-to-node mapping, mechanical vs
reasoning classification, dependency graph building, and ConfirmationStep injection for T4
skills. The bundler (bundler.ts) does import resolution, topological sort via Kahn's algorithm,
and tree shaking. The effects system (effects.ts) declares 8 passes: OP1-lower through
OP8-js-emit.

claws extends this by adding a new pass after OP8: **OP9-ts-emit** — emit OperationIR as
executable TypeScript. The existing ConfirmationStep node type maps directly to G-ELICIT.
claws changes the trigger: inject confirmation for ANY R5 tool, not just T4 skills.

**QueryIR details**: 10 node types (filter, projection, aggregation, navigation, pagination,
sort, compute, search, cast, logical), 5 emit targets (odata, sql, graphql, fetchxml,
flash-local). Pure function: `(QueryIR, QueryTarget) -> QueryResult`.

claws adds target #6: `openclaw-memory`. FilterNode -> `memory.search()` query parameters,
ProjectionNode -> field selection, AggregationNode -> client-side aggregation (OC memory
doesn't do server-side), NavigationNode -> multi-query traversal.

**PRESS details**: Quality matrix (5 task types x 6 density levels), bipartite split
(routing vs body phases), cache contract, position optimizer, rewrite rules, token counter.
DensityLevel = 0-5.

claws reuses the bipartite split and quality matrix patterns but applies them to governance
budgets instead of token budgets: governance rule density levels, enforcement priority
allocation.

**SkillIR details**: ProgramIR -> SkillIR lowering with frontmatter expansion, parameter
injection, cost profiles, boosting. The synthesis pipeline (synthesizer, batcher, validator,
prompt builders) generates skill bodies via LLM.

claws uses SkillIR as input (OC workspace skills -> SkillIR) and as output (generated
governance skills emitted as SkillIR -> Markdown).

### Tier 3: Report & Schema (INSPIRE)

These IRs have patterns claws borrows but the implementations are Craftworks-specific.

| IR | Location | Alias | Reuse | Why INSPIRE |
|----|----------|-------|-------|-------------|
| **ReportIR** | `ir/report/` | RP | INSPIRE | Section model, RELAX builtins, dependency graph, layout renderer, theme registry -- claws builds `@claws/report` from this pattern. 25 files in ir/report/ including relax-parser, relax-pushdown, relax-typecheck, scope-provider, filter-capability-map. |
| **SchemaIR** | `ir/schema/` | SH | INSPIRE | 3-pass pipeline (parse/resolve/emit) pattern. claws validates config schemas but doesn't need entity-oriented compilation. |
| **ContextIR** | `ir/context/` | CX | INSPIRE | ProgramIR -> ContextIR lowering, renderer, differ patterns. claws builds governance context from OC workspace but doesn't need the identity-section/routing-table node types. |
| **RubricIR** | `ir/rubric/` | RB | INSPIRE | Compile/runtime-bridge/tuning-signal patterns useful for claws's evaluation framework, but rubric evaluation is OC-native. |
| **MemoryIR** | `ir/memory/` | ME | INSPIRE | 6-pass pipeline (parse/scope-resolve/budget/projection/governance/emit). claws manages OC memory.search() at a different level but borrows the scope-hierarchy pattern. |

**ReportIR is the richest INSPIRE source**: 25 files implementing a full domain compiler with
FormaIR -> ProgramIR -> ReportIR pipeline, RELAX expression integration (5 files: relax-ast,
relax-parser, relax-pushdown, relax-typecheck, relax-eval), section model with dependency
graph, layout renderer, theme registry, scope provider/resolver, filter capability map,
semantic tokens. `@claws/report` will follow this architecture for governance reports.

### Tier 4: Craftworks-Internal (SKIP)

These IRs serve Craftworks-specific needs that don't apply to claws.

| IR | Location | Alias | Reuse | Why SKIP |
|----|----------|-------|-------|----------|
| **ProgramIR** | `ir/program/` | PG | SKIP | Craftworks program model (plugin metadata, state schema, commands). claws has its own GovernanceAST. |
| **StageTaskIR** | `ir/stage-task/` | ST | SKIP | Pipeline stage/task orchestration. claws doesn't have stages. |
| **RoleIR** | `ir/role/` | RO | SKIP | Craftworks role system (alias-resolve, tension-inherit, companion-resolve, OLE). OC has its own roles. |
| **ActivationIR** | `ir/activation/` | AC | SKIP | Craftworks activation matrix (detect/plan/execute). Not relevant to OC. |
| **QualityGateIR** | `ir/quality-gate/` | QG | SKIP | Craftworks quality gates (compile/emit/freshness/sixq). OC gates are different. |
| **TraceIR** | `ir/trace/` | TR | SKIP | Distributed tracing (annotate/otel-map/scaffold). OC has its own tracing. |
| **EntityIR** | `ir/entity/` | EN | SKIP | Dataverse entity compilation. OC uses different entity model. |
| **WhereIR** | `ir/where/` | WH | SKIP | where: clause compilation (alias/define/vars/computed-field resolvers). Craftworks-specific. |
| **AmendmentIR** | `ir/amendment/` | AM | SKIP | Spec amendment processing. Craftworks-internal. |
| **BoostIR** | `ir/boost/` | BO | SKIP | Optimizer boost passes. Craftworks compilation. |
| **CgrIR** | `ir/cgr/` | CG | SKIP | Compliance Governance Record specific to Craftworks. |
| **CharterIR** | `ir/charter/` | CH | SKIP | Workspace charter compilation. Craftworks concept. |
| **CommandIR** | `ir/command/` | CM | SKIP | CLI command IR. Not applicable. |
| **ConnectionIR** | `ir/connection/` | CN | SKIP | Provider connections. Not applicable. |
| **CriteriaIR** | `ir/criteria/` | CR | SKIP | Evaluation criteria. Craftworks-specific. |
| **DiagnosticIR** | `ir/diagnostic/` | DI | SKIP | Diagnostic processing. Internal. |
| **EmitIR** | `ir/emit/` | EM | SKIP | Emission infrastructure. Internal. |
| **ErrorIR** | `ir/error/` | ER | SKIP | Error type compilation. Internal. |
| **ExpertiseIR** | `ir/expertise/` | EX | SKIP | Role expertise compilation. Craftworks-specific. |
| **HookIR** | `ir/hook/` | HK | SKIP | Lifecycle hooks. Not applicable. |
| **InputIR** | `ir/input/` | IN | SKIP | Input parameter compilation. Internal. |
| **McpServerIR** | `ir/mcp-server/` | MS | SKIP | MCP server compilation. Internal. |
| **NotificationIR** | `ir/notification/` | NF | SKIP | Notification compilation. Internal. |
| **OntologyIR** | `ir/ontology/` | OT | SKIP | Entity ontology linking. Not applicable. |
| **OutputIR** | `ir/output/` | OU | SKIP | Output schema compilation. Internal. |
| **PackageIR** | `ir/package/` | PK | SKIP | Package compilation. Internal. |
| **ParameterIR** | `ir/parameter/` | PM | SKIP | Parameter compilation. Internal. |
| **PassIR** | `ir/pass/` | PA | SKIP | Pass infrastructure. Internal. |
| **PipelineIR** | `ir/pipeline/` | PI | SKIP | Pipeline compilation. Internal. |
| **PluginIR** | `ir/plugin/` | PU | SKIP | Plugin compilation. Internal. |
| **ProviderIR** | `ir/provider/` | PV | SKIP | Provider compilation. Internal. |
| **QuestIR** | `ir/quest/` | QU | SKIP | Quest evaluation. Craftworks-specific. |
| **RouteIR** | `ir/route/` | RT | SKIP | Command routing. Internal. |
| **SpaceIR** | `ir/space/` | SP | SKIP | Space topology. Internal. |
| **StateIR** | `ir/state/` | SA | SKIP | State schema compilation. Internal. |
| **TimeoutIR** | `ir/timeout/` | TO | SKIP | Timeout configuration. Internal. |
| **WishIR** | `ir/wish/` | WI | SKIP | Wish list compilation. Internal. |
| **WorkerIR** | `ir/worker/` | WK | SKIP | Worker orchestration. Internal. |

---

## Non-IR compiler-sdk Modules

Beyond ir/, claws also imports from these compiler-sdk modules:

| Module | Location | Reuse | Import Path |
|--------|----------|-------|-------------|
| **RELAX** | `relax/` | DIRECT | `@craftworks/compiler-sdk/astro/relax/relax-expr-evaluator` |
| **OC Reader** | `readers/openclaw-reader` | DIRECT | `@craftworks/compiler-sdk/astro/readers/openclaw-reader` |
| **OC Emitter** | `emit/platforms/openclaw-emitter` | DIRECT | `@craftworks/compiler-sdk/astro/emit/platforms/openclaw-emitter` |
| **Type definitions** | `types/` | DIRECT | `@craftworks/compiler-sdk/astro/types/operation-ir`, `query-ir`, `skill-ir`, etc. |
| **Diagnostics** | `diagnostics/` | DIRECT | `@craftworks/compiler-sdk/astro/diagnostics/*` |
| **Format detection** | `formats/` | EXTEND | Add OC workspace file detection |

---

## agent-sdk Modules for claws

| Module | Location | Reuse | Import Path |
|--------|----------|-------|-------------|
| **GovernanceManager** | `govern/` | DIRECT | `@craftworks/agent-sdk/govern` |
| **CGR chain** | `govern/cgr-chain` | DIRECT | `@craftworks/agent-sdk/govern/cgr-chain` |
| **Policy walker** | `govern/policy-walker` | DIRECT | `@craftworks/agent-sdk/govern/policy-walker` |
| **Audit trail** | `suite/audit/` | DIRECT | `@craftworks/agent-sdk/suite/audit` |
| **Gate system** | `suite/gates/` | DIRECT | `@craftworks/agent-sdk/suite/gates` |
| **Hashing** | `hashing/` | DIRECT | `@craftworks/agent-sdk/hashing` |
| **Eval framework** | `eval/` | EXTEND | Add OC-native judge adapters |

---

## Pipeline Phase Mapping

Each IR maps to the claws 5-phase compilation pipeline (from Q12j):

```
PARSE ──→ EXTRACT ──→ ANALYZE ──→ OPTIMIZE ──→ EMIT
  │          │           │            │           │
  │          │           │            │           ├─ OperationIR (OP9-ts-emit)
  │          │           │            │           ├─ QueryIR (openclaw-memory target)
  │          │           │            │           └─ SkillIR (emit as OC skill)
  │          │           │            │
  │          │           │            └─ PRESS (pinch profile)
  │          │           │
  │          │           ├─ PolicyIR (rule compilation + composition)
  │          │           ├─ GovernanceIR (constraint validation)
  │          │           └─ GovernanceManager (budget enforcement)
  │          │
  │          ├─ ToolIR (tool classification via RELAX)
  │          ├─ TierIR (tier assignment via RELAX)
  │          └─ SkillIR (OC skills parsed to IR)
  │
  └─ OC Reader (openclaw-reader.ts)
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total IR subdirectories in compiler-sdk | 49 |
| DIRECT | 4 (PolicyIR, GovernanceIR, ToolIR, TierIR) |
| EXTEND | 4 (OperationIR, QueryIR, PRESS, SkillIR) |
| INSPIRE | 5 (ReportIR, SchemaIR, ContextIR, RubricIR, MemoryIR) |
| SKIP | 36 |
| Non-IR DIRECT imports (compiler-sdk) | 5 (RELAX, OC reader, OC emitter, types, diagnostics) |
| agent-sdk DIRECT imports | 7 (govern, CGR, policy-walker, audit, gates, hashing, eval) |

## Key Insight

claws-sdk touches **13 modules** across compiler-sdk and agent-sdk. The 36 SKIP IRs are
entirely Craftworks-internal (plugin system, command routing, workspace management, etc.).
This validates the composition architecture: claws-sdk is a thin composition layer that
cherry-picks the governance and code-generation modules without pulling in the full
Craftworks domain model.
