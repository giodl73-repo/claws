# Atoms Audit for claws Reuse

## Summary

- Total atoms reviewed: 163 (120 active + 28 folded + 15 platform format variants treated as one group)
- REUSE: 48 (maps directly to claws)
- INVESTIGATE: 32 (needs deeper research for OC)
- SKIP: 83 (Craftworks-internal)

---

## REUSE — Direct mapping to claws

### Compiler Pipeline IRs

These are the core intermediate representations that claws-sdk imports from compiler-sdk. They form the backbone of the claws compilation pipeline.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A71 | `atom:program-ir` | Program IR (Stage 20 — master compilation IR) | `@claws/compiler` — the root IR that claws extends for OC workspace compilation. All 9 OC workspace files compile into ProgramIR. |
| A134 | `atom:forma-ir` | FormaIR (format-faithful first IR from parsing) | `@claws/compiler` — FormaIR is the parse output from OC workspace files before lowering to ProgramIR. Direct reuse. |
| A79 | `atom:operation-ir` | Operation IR (Stages 70-78, native execution) | `@claws/compiler` — EXTEND with TypeScript emitter for generating executable governance skills that run in OC Gateway. |
| A34 | `atom:query-ir` | QueryIR (Q0-Q3 query compilation) | `@claws/compiler` — EXTEND with openclaw-memory target for OC memory queries. |
| A72 | `atom:skill-ir` | Skill IR (Stages 30-39) | `@claws/compiler` — direct reuse for compiling OC skill definitions from AGENTS.md + skill files. |
| A74 | `atom:role-ir` | Role IR (R1-R10, Spec 93) | `@claws/compiler` — compiles OC SOUL.md role definitions into enforceable role constraints. |
| A142 | `atom:tool-ir` | Tool IR (MCP servers, env vars, capabilities) | `@claws/compiler` — DIRECT reuse for compiling OC TOOLS.md into ToolIR for gateway enforcement. |
| A73 | `atom:context-ir` | Context IR (Stages 50-63, 13 passes) | `@claws/compiler` — context assembly for OC agent prompts, reused as-is. |
| A76 | `atom:stagetask-ir` | StageTask IR (ST1-ST10, Spec 98) | `@claws/compiler` — task composition model reused for OC workflow compilation. |
| A77 | `atom:memory-ir` | Memory IR (M0-M6) | `@claws/compiler` — reused for OC MEMORY.md file compilation. |
| A78 | `atom:quality-gate-ir` | QualityGateIR (I1-I5) | `@claws/compiler` — reused for OC quality gates and rubrics in governance rules. |
| A169 | `atom:ir-registry` | IR slug registry (stable slug-to-type mapping) | `@claws/compiler` — single source of truth for all IR types, extended with claws-specific IRs. |
| A254 | `atom:report-ir` | ReportIR (domain IR #12, section model) | `@claws/report` — INSPIRE pattern for OC governance reporting. |
| A70 | `atom:contract-ir` | Contract IR (absorbed into FORMA format system) | `@claws/compiler` — OC workspace contract definitions reuse this format system. |

### FORMA Parser Framework

The declarative parser that reads workspace files into IR. claws reads 9 OC files — FORMA is the engine.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A133 | `atom:forma` | FORMA declarative parser (format-agnostic parse framework) | `@claws/compiler` — the parser engine that reads OC workspace files (SOUL.md, AGENTS.md, etc.) into FormaIR. Direct reuse. |
| A135 | `atom:format-mapping` | FORMA declarative mapping schema (format.yaml files) | `@claws/compiler` — claws defines its own format.yaml mappings for OC's 9 file types. Direct extension. |
| A170 | `atom:forma-emit` | FORMA bidirectional emit (FormaIR to workspace files) | `@claws/compiler` — emit compiled governance back to OC workspace format. |
| A176 | `atom:amendment-pipeline` | Amendment SDK pipeline (validate, emit, re-lower, re-render) | `@claws/compiler` — hot-reload governance amendments without full recompile. |
| A191 | `atom:peg-grammar` | PEG grammar specifications for FORMA primitives | `@claws/compiler` — grammar reuse for parsing OC workspace file syntax. |

### Governance & Policy Enforcement

The governance engine is the heart of claws. These atoms map directly to claws's 4 security layers and runtime enforcement.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A148 | `atom:policy` | Policy (governance rules with severity, PolicyEngine, fail-closed) | `@claws/governance` — the core policy engine. Direct reuse for OC Gateway policy enforcement. |
| A43 | `atom:cgr` | CGR (Compile Governance Record) | `@claws/governance` — governance audit record emitted during compilation. Maps to claws's compliance output. |
| A45 | `atom:guard` | Guard (G1-G4 governance layers) | `@claws/governance` — the 4-layer security model maps directly to claws's 4 security layers. |
| A141 | `atom:charter` | Charter (workspace purpose, constraints, kill-switches, classification ceilings) | `@claws/governance` — OC SOUL.md constraints compile to CharterIR. Kill-switches and classification ceilings are core OC governance. |
| A47 | `atom:audit` | Audit (layout conformance) | `claws audit` CLI command — validates OC workspace layout conformance. |
| A197 | `atom:guardian-preamble` | Guardian preamble (governance block injected into compiled output) | `@claws/compiler` — security boundary preamble injected into compiled OC agent skills. |
| A198 | `atom:program-governance` | Program governance (providers, conventions, bindings) | `@claws/compiler` — provider declarations for OC Gateway runtime. |
| A275 | `atom:governance-composition` | Governance composition algebra (RELAX predicates over policy/charter/budget) | `@claws/governance` — composable governance rules for OC workspaces using RELAX. |
| A153 | `atom:audit-trail` | Audit Trail (two-event pattern, HMAC hash chain, tamper detection) | `@claws/governance` — tamper-evident audit trail for OC Gateway operations. Critical for enterprise compliance. |
| A179 | `atom:budget` | Budget enforcement engine (APPROVED/THROTTLE/DENIED) | `@claws/governance` — token/cost budget enforcement for OC agents in gateway. |
| A180 | `atom:gate` | Gate evaluator (hold/skip/retry actions) | `@claws/governance` — runtime gate evaluation at OC's 5 insertion points. |
| A68 | `atom:permission-tier` | Permission Tiers (T0-T4) | `@claws/governance` — OC agent permission model. Maps to claws's security layers. |

### RELAX Expression Language

RELAX powers policy expressions in claws — the `where:` keyword for governance rules.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A248 | `atom:relax` | RELAX expression language (PEG grammar, 14 AST nodes, sandbox-enforced) | `@claws/sift` — powers all policy expressions in OC governance rules. Direct reuse from compiler-sdk. |
| A249 | `atom:relax-ast` | RELAX AST (14 node kinds) | `@claws/sift` — the AST that claws compiles policy expressions into. |
| A250 | `atom:relax-sandbox` | RELAX sandbox (function allowlist, deep-frozen DataFrames, prototype denylist) | `@claws/sift` — security sandbox for OC policy expression evaluation. Critical for gateway safety. |
| A260 | `atom:relax-type-guard` | Shared RELAX type guard (validates return types for gates, rubrics, policies) | `@claws/sift` — compile-time type checking for OC governance expressions. |
| A271 | `atom:relax-safety-guard` | RELAX safety guards (memory/CPU limits, complexity ceiling, timeout) | `@claws/sift` — runtime safety for policy evaluation in OC Gateway. |

### PRESS Optimization

Token-budget optimization — becomes "pinch" in claws.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A274 | `atom:press` | PRESS token-budget optimization (MCKP, stop words, rewrite rules, profiles) | `@claws/pinch` — EXTEND as "pinch" governance optimization for OC agent prompt budgets. |

### Workspace Reading & Emitting

Format reader/emitter infrastructure reused for OC workspace parsing.

| Atom | Slug | What it is | claws component it powers |
|------|------|-----------|--------------------------|
| A82 | `atom:workspace-format` | Workspace Format Conformance (master concept) | `@claws/compiler` — OC is one of the target workspace formats. Direct reuse of conformance framework. |
| A83 | `atom:workspace-reader` | Workspace Reader (Format to IR input phase) | `@claws/compiler` — reads OC's 9 workspace files into FormaIR. |
| A84 | `atom:workspace-emitter` | Workspace Emitter (IR to format output phase) | `@claws/compiler` — emits compiled governance as TypeScript skills for OC Gateway. |

---

## INVESTIGATE — Needs deeper research for OC value

### Compilation Host & Session Management

Could claws benefit from a long-lived compilation daemon for interactive governance development?

| Atom | Slug | What it is | Investigation question | Why it matters for claws |
|------|------|-----------|----------------------|------------------------|
| A185 | `atom:compilation-host` | CompilationHost — per-process singleton with cached ProgramIR, invalidation, AbortSignal | Could claws use a compilation host daemon for `claws watch` (live governance recompilation on workspace file changes)? | OC developers editing SOUL.md or AGENTS.md would get instant feedback on governance rule validity. Would power a `claws dev` inner loop. |
| A186 | `atom:compilation-snapshot` | CompilationSnapshot — frozen ProgramIR + compile receipt | Would governance snapshots enable claws rollback/diff between governance versions? | Enterprise governance needs version comparison: "what changed between v1.2 and v1.3 of our agent's policy set?" |
| A187 | `atom:dependency-graph` | File dependency graph from FORMA assembly | Can claws use dependency graphs to implement targeted recompilation when only one OC file changes? | Editing TOOLS.md should not force recompiling SOUL.md. Incremental compilation for large OC workspaces. |
| A189 | `atom:language-service` | Language service — diagnostics, code actions, go-to-definition via source spans | Should claws ship a VS Code extension with IntelliSense for OC workspace files? | OC developers writing SOUL.md or policy rules in AGENTS.md would get real-time diagnostics, completion, hover docs. Major DX improvement. |
| A205 | `atom:forest-session` | Forest session — long-lived handle for iterative recompilation | Could `claws serve` use forest sessions for a live governance API that recompiles on demand? | Gateway integration: a running claws server that hot-reloads governance rules when OC workspace files change. |
| A202 | `atom:compilation-forest` | CompilationForest — multi-workspace coordination above CompilationHost | Could claws manage governance across multiple OC workspaces (e.g., org-level policies composed with team-level)? | Enterprise OC deployments with shared governance libraries across multiple agent workspaces. |

### CREST Input Model Extensions for OC

OC has 9 workspace files. CREST has 13. How much overlap and what's OC-specific?

| Atom | Slug | What it is | Investigation question | Why it matters for claws |
|------|------|-----------|----------------------|------------------------|
| A110 | `atom:crest-ir` | CREST IR (13-file workspace representation) | Which CREST files map 1:1 to OC's 9 files (SOUL.md, AGENTS.md, TOOLS.md, etc.) and which need new readers? | Determines how much CREST reader code is reusable vs. how many new OC-specific readers claws needs. |
| A111 | `atom:crest-compact` | CREST Compact Format (single-file CREST.md) | Should claws support a single-file OC workspace format (e.g., OPENCLAW.md) for simple agents? | Small OC agents with 2-3 tools and simple policies shouldn't need 9 separate files. DX improvement for quick-start. |
| A131 | `atom:crest-yaml-reader` | CREST YAML Reader (mixed MD/YAML per-concept dispatch) | Can OC workspace files use YAML as an alternative to Markdown for machine-authored governance rules? | CI/CD pipelines generating governance rules would prefer YAML over Markdown. Enables `claws generate` from templates. |
| A126 | `atom:body-file` | body_file (external file reference in YAML/manifest) | Should OC workspace files support body_file references for large policy definitions? | Enterprise governance policies may be too large for inline Markdown. External file references enable modular policy authoring. |
| A161 | `atom:task-md-reader` | TASK.md file parser | Can the TASK.md reader be adapted for OC's WORKFLOWS.md file parsing? | OC workflow definitions may share structure with CREST TASK.md. Reuse saves parser development time. |
| A162 | `atom:role-md-reader` | ROLE.md file parser | Can the ROLE.md reader be adapted for OC's SOUL.md and AGENTS.md file parsing? | SOUL.md defines agent identity (like ROLE.md). AGENTS.md defines agent capabilities. Both may share ROLE.md parsing patterns. |

### Role & Agent Concepts for OC Agents

OC agents have roles, expertise, and coordination. How much of Craftworks' role system applies?

| Atom | Slug | What it is | Investigation question | Why it matters for claws |
|------|------|-----------|----------------------|------------------------|
| A193 | `atom:olet` | OLET Model (Orientation-Lens-Expertise-Tension, 7-cluster role identity) | Could OLET be the formal model for OC agent identities defined in SOUL.md? | Gives OC agents structured identity beyond free-text descriptions. Enables governance rules like "agents with engineering orientation cannot access finance tools." |
| A192 | `atom:tension` | Tension (OLET cluster validation, tension inheritance) | Could tension diagnostics detect conflicting governance rules in OC workspaces? | Example: an agent's SOUL.md says "be cautious" but TOOLS.md gives it destructive admin tools. Tension analysis surfaces this. |
| A194 | `atom:knowledge-domain` | Knowledge Domain (typed domain binding on roles) | Could OC agents declare typed knowledge domains that governance rules can reference? | Enables domain-scoped policies: "agents with 'healthcare' domain must redact PHI." |
| A196 | `atom:role-dispatch` | Role dispatch (routes tasks to agents based on compiled RoleIR) | Could claws compile OC AGENTS.md into a dispatch table for multi-agent OC workspaces? | Multi-agent OC setups need intelligent routing. Role dispatch is the matching algorithm. |
| A10 | `atom:role` | Role (OLE model) | How much of the OLE role model applies to OC agent role definitions in SOUL.md? | Determines whether claws reuses role compilation or builds OC-specific role handling. |

### Runtime & Execution Concepts

OC Gateway runs compiled governance. How much of craft-ops runtime applies?

| Atom | Slug | What it is | Investigation question | Why it matters for claws |
|------|------|-----------|----------------------|------------------------|
| A150 | `atom:workspace-runtime` | Workspace Runtime (boot sequence, exec loop, WorkspaceContext) | Could OC Gateway reuse the workspace runtime boot sequence for loading compiled governance? | Standardized boot: load memories, tools, policies, then start agent. Saves OC Gateway from reimplementing this. |
| A151 | `atom:exec-host` | ExecHost (host contract — dispatch/availableTools/sync/health) | Could OC Gateway implement ExecHost for standardized agent dispatch with governance checks? | ExecHost is the contract between compiled governance and runtime. OC Gateway would be an ExecHost implementation. |
| A152 | `atom:context-assembly` | Context Assembly (memories + expertise + role context into prompts) | Could claws compile OC MEMORY.md + AGENTS.md into a context assembly pipeline for OC Gateway? | The assembled context is what OC agents see. Governance rules can constrain what enters the context. |
| A157 | `atom:composition-pattern` | Composition Patterns (sequential, fan-out, conditional, diamond, review-loop) | Which composition patterns does OC Gateway need for multi-step governance-enforced workflows? | OC agents running multi-step tasks need governed composition. Not all 5 patterns may be relevant. |
| A178 | `atom:wal` | Write-Ahead Log for crash-safe execution state | Should claws governance enforcement use WAL for crash recovery during long-running OC agent tasks? | Enterprise requirement: if Gateway crashes mid-task, governance state must be recoverable. |
| A172 | `atom:event-fanout` | Composite event fan-out with re-entrancy guard | Could OC Gateway use event fan-out for distributing governance decisions to multiple consumers? | SIEM integration, audit logging, and real-time dashboards all need governance events. |

### Evaluation & Quality for OC Governance

Testing that compiled governance actually works.

| Atom | Slug | What it is | Investigation question | Why it matters for claws |
|------|------|-----------|----------------------|------------------------|
| A129 | `atom:quest-eval-pipeline` | Quest Eval Pipeline (dual pipeline for input skills and compiled output) | Could claws ship a `claws test` command that evaluates governance rules against scenarios? | OC developers need to test: "does my policy actually block the agent from accessing production databases?" |
| A229 | `atom:eval-harness` | Eval harness ecosystem (4 harness emitters) | Should claws emit governance tests in Promptfoo or Inspect AI format for existing eval toolchains? | Enterprises already use eval tools. Emitting governance tests in their format reduces adoption friction. |
| A237 | `atom:eval-signal` | EvalSignal (typed evaluation result from harness execution) | Could claws use EvalSignal as the standard return type from `claws test` runs? | Typed test results enable CI/CD gating on governance test outcomes. |
| A238 | `atom:pipeline-gate` | Pipeline gate (signal-gated pipeline progression) | Could claws enforce "all governance tests pass before deploy" gates in CI/CD? | Enterprise governance deployment should be gated on test results, not just compilation success. |
| A203 | `atom:quest-eval-matrix` | Quest evaluation matrix (per-target x per-judge evaluation) | Could claws evaluate governance across multiple OC Gateway configurations simultaneously? | Different deployment environments may interpret governance differently. Matrix testing catches environment-specific failures. |

---

## SKIP — Craftworks-internal only

### Foundation & Product Layer (Craftworks packaging)
- `atom:workspace` (A01) — Craftworks workspace concept, not OC workspaces
- `atom:plugin` (A02) — Craftworks plugin system
- `atom:skill` (A03) — Craftworks skill file layout
- `atom:skills-2` (A04) — Craftworks directory-per-skill convention
- `atom:memory-model` (A06) — Craftworks L1/L2/L3 context memory
- `atom:product-guard` (A08) — Guard product packaging
- `atom:product-builder` (A09) — Builder/craft product packaging
- `atom:product-fleet` (A69) — Fleet product packaging

### People Layer (Craftworks work agents)
- `atom:workagent` (A13) — Craftworks WorkAgent concept
- `atom:agent-evaluation` (A16) — Craftworks agent evaluation guides

### Work Layer (Craftworks task/workflow internals)
- `atom:task` (A20) — Craftworks task concept (generic)
- `atom:stage` (A21) — Craftworks workflow stage concept
- `atom:task-ir` (A22) — Craftworks task IR (generic, not the compiler StageTask IR)
- `atom:port` (A23) — Craftworks typed I/O ports
- `atom:business-process` (A24) — Craftworks business process model
- `atom:prose-standard` (A26) — Craftworks prose standards P1-P7
- `atom:workflow` (A145) — Craftworks WorkflowRunner internals
- `atom:playbook` (A146) — Craftworks PlaybookAdapter internals

### Data Layer (Craftworks entity sync)
- `atom:entity` (A30) — Craftworks entity model
- `atom:flash` (A31) — FLASH entity sync system
- `atom:query-runtime` (A35) — Craftworks query runtime
- `atom:file-system` (A37) — Craftworks 4-space file system

### Platform Layer (Craftworks platform internals)
- `atom:markdown-libs` (A40) — Craftworks 31 markdown library modules
- `atom:cross-platform` (A41) — Craftworks cross-platform compilation (overlaps with workspace-format but is the mode, not the engine)
- `atom:native-execution` (A42) — Craftworks native execution concept

### Tooling Layer (Craftworks .craft namespace)
- `atom:craft-namespace` (A50) — .craft directory convention
- `atom:sdk-architecture` (A51) — Craftworks 3-layer SDK architecture (though claws-sdk follows same pattern, the atom is Craftworks-specific)
- `atom:workspace-axes` (A52) — Craftworks 7-dimension workspace model
- `atom:connectivity` (A53) — Craftworks 3-layer connectivity ladder
- `atom:craft-ops` (A136) — craft-ops runtime operations layer (Craftworks-internal dispatch/stage)

### Suite Layer (Craftworks CLI commands)
- `atom:craft-cli` (A54) — craft CLI (16 builder commands)
- `atom:guard-cli` (A55) — guard CLI (6 governance commands)
- `atom:fleet-cli` (A56) — fleet CLI (19 operations commands)
- `atom:lifecycle-handshake` (A57) — Craftworks H1-H7 handshake protocol
- `atom:intervention-ladder` (A58) — Craftworks L0-L5 intervention ladder
- `atom:projection-engine` (A59) — Craftworks model-driven projection
- `atom:fleet-tui` (A64) — Fleet TUI (k9s-style)
- `atom:output-modes` (A67) — Craftworks json/plain/tui output modes
- `atom:craft-exec` (A154) — craft exec command internals
- `atom:workspace-tui` (A155) — Craftworks workspace TUI dashboard

### Advanced / Deep Dives (Craftworks-specific)
- `atom:knowledge-retrieval` (A60) — Craftworks knowledge retrieval
- `atom:workspace-lifecycle` (A61) — Craftworks 6-state workspace lifecycle
- `atom:artifact-engine` (A62) — Craftworks artifact engine
- `atom:solutions-deploy` (A63) — Craftworks solutions and deploy model
- `atom:solution-lifecycle` (A156) — Craftworks seal/deploy lifecycle

### CREST Input Model (Craftworks-specific files)
- `atom:expertise-ir` (A112) — Craftworks 6-phase expertise pipeline
- `atom:knowledge-ir` (A115) — Craftworks compiled source index
- `atom:skill-group` (A116) — Craftworks skill group binding model
- `atom:route` (A143) — Craftworks channel-based message routing
- `atom:space` (A144) — Craftworks SpaceIR (task container)
- `atom:role-md-generator` (A165) — Craftworks LLM-powered ROLE.md scaffolding

### Compiler Pipeline (Craftworks-specific passes)
- `atom:schema-ir` (A75) — Craftworks Schema IR (SH1-SH3)
- `atom:flows-ir` (A80) — Craftworks Flows IR (FL-01 to FL-07)
- `atom:activation-ir` (A177) — Craftworks selective recompilation internals
- `atom:task-md-lower` (A163) — Craftworks TASK.md lowering
- `atom:task-md-graph-builder` (A164) — Craftworks graph reconstruction
- `atom:rubric-runtime` (A171) — Craftworks rubric runtime contract
- `atom:emission-staging` (A188) — Craftworks atomic write layer
- `atom:sealable-ir` (A190) — Craftworks SealableIR for solution seal
- `atom:program-provider` (A200) — Craftworks provider declarations
- `atom:command-gate` (A207) — Craftworks command gating for forest sessions
- `atom:cache-snapshot` (A208) — Craftworks named sealed cache snapshots
- `atom:context-refresh` (A209) — Craftworks runtime context refresh
- `atom:deploy-on-amend` (A210) — Craftworks continuous seal+deploy loop

### Testing Infrastructure (Craftworks-specific)
- `atom:mock-host` (A183) — Craftworks MockExecHost test infrastructure
- `atom:workflow-recorder` (A184) — Craftworks WorkflowRecorder test infrastructure
- `atom:evals-md` (A201) — Craftworks EVALS.md workspace evaluation definitions

### Dreaming & Maker (Craftworks autonomous maintenance)
- `atom:dreaming-loop` (A211) — Craftworks autonomous skill maintenance loop
- `atom:tier-classifier` (A212) — Craftworks T1/T2/T3 structural diff classifier
- `atom:signal-intake` (A213) — Craftworks TriageSignal receiver
- `atom:tiered-authority` (A214) — Craftworks T1/T2/T3 policy rulesets
- `atom:shadow-compile` (A215) — Craftworks shadow compile + eval
- `atom:canary-pipeline` (A216) — Craftworks canary deployment FSM
- `atom:approval-store` (A217) — Craftworks approval store
- `atom:circuit-breaker` (A218) — Craftworks circuit breaker
- `atom:skill-lock` (A219) — Craftworks per-skill version-gated lock
- `atom:maker-skills` (A220) — Craftworks maker skill registry
- `atom:post-session-hook` (A221) — Craftworks post-session hook
- `atom:dreaming-harness` (A222) — Craftworks local dreaming harness
- `atom:deterministic-provider` (A223) — Craftworks deterministic LLM provider
- `atom:maker-template` (A224) — Craftworks maker template generator
- `atom:canary-gate` (A225) — Craftworks canary gate evaluator

### RELAX Extensions (Craftworks-specific consumers)
- `atom:dataframe` (A251) — Craftworks DataFrame (reuse possible but needs investigation — see A248)
- `atom:where-primitive` (A252) — Craftworks `where:` YAML keyword (RELAX consumer surface, not the language itself)
- `atom:craft-eval-repl` (A253) — Craftworks craft eval REPL
- `atom:relax-dreaming` (A261) — Craftworks RELAX-powered dreaming phases
- `atom:memory-eviction` (A263) — Craftworks memory eviction with RELAX
- `atom:flash-sync-predicate` (A264) — Craftworks FLASH sync predicate
- `atom:relax-let` (A266) — Craftworks .let() AST extension
- `atom:route-signal-schema` (A267) — Craftworks route signal schema
- `atom:signal-routing` (A268) — Craftworks signal routing
- `atom:materialization-registry` (A269) — Craftworks MaterializationRegistry
- `atom:relax-conformance` (A270) — Craftworks RELAX conformance suite
- `atom:relax-data-sources` (A272) — Craftworks external DataFrame adapters
- `atom:relax-cli-evaluation` (A273) — Craftworks shared CLI evaluation pipeline
- `atom:relax-scope-model` (A265) — Craftworks RELAX scope model
- `atom:role-capability-adapter` (A262) — Craftworks role capability adapter

### PRESS & Governance Extensions (Craftworks-specific)
- `atom:pulse-template` (A276) — Craftworks pulse template validation
- `atom:agent-skills-package` (A277) — Craftworks agent skills package spec

### Platform Coverage (Craftworks format emitters)
- `atom:windsurf-format` (A226) — Windsurf emitter
- `atom:amazonq-format` (A227) — Amazon Q emitter
- `atom:jetbrains-format` (A228) — JetBrains emitter
- `atom:promptfoo-format` (A240) — Promptfoo eval format
- `atom:inspect-ai-format` (A241) — Inspect AI format
- `atom:crewai-format` (A242) — CrewAI format
- `atom:adk-format` (A243) — Google ADK format
- `atom:mcp-registry-format` (A244) — MCP Registry format
- `atom:smithery-format` (A245) — Smithery format
- `atom:copilot-studio-format` (A246) — Copilot Studio format
- `atom:bedrock-format` (A247) — AWS Bedrock format
- `atom:registry-client` (A230) — Registry client adapters
- `atom:zed-format` (A231) — Zed format
- `atom:aider-format` (A232) — Aider format
- `atom:augment-format` (A233) — Augment format
- `atom:trae-format` (A234) — Trae format
- `atom:tabnine-format` (A235) — Tabnine format
- `atom:agent-bundle-format` (A236) — Agent bundle format
- `atom:openapi-from-skills` (A239) — OpenAPI from skills (though could be INVESTIGATE for OC Gateway API generation)

### Workspace Formats (Craftworks cross-platform targets)
- `atom:format-detection` (A85) — Craftworks auto-detect workspace type
- `atom:format-loss` (A86) — Craftworks field-level translation fidelity
- `atom:sidecar-mode` (A119) — Craftworks .craft/ overlay for non-craft workspaces
- `atom:agents-md-standard` (A120) — AGENTS.md cross-vendor standard
- `atom:gemini-format` (A121) — Gemini workspace format
- `atom:meta-format` (A122) — Cross-vendor meta-format
- `atom:skill-meta-format` (A123) — SKILL.md meta-format
- `atom:codex-format` (A124) — Codex workspace format
- `atom:build-manifest` (A125) — Build manifest (program.yaml)
- `atom:role-coverage-lifecycle` (A127) — Role coverage lifecycle
- `atom:role-coverage-drift` (A128) — Role coverage drift
- `atom:binding-overlay` (A130) — Binding overlay per-target
- `atom:target-overview` (A132) — Target overview matrix
- `atom:flight-deck` (A139) — Flight-Deck workspace format
- `atom:repo-format` (A195) — Repo workspace format
- `atom:repo-md` (A199) — Repo markdown files
- `atom:frame` (A159) — FRAME workspace type system

### Compiler Modes (Craftworks mode flags)
- `atom:mode-astro` (A90) — forward compile mode
- `atom:mode-boost` (A91) — optimize mode
- `atom:mode-forge` (A92) — evolve mode
- `atom:mode-audit` (A93) — validate mode
- `atom:mode-retro` (A94) — reverse-compile mode
- `atom:mode-cross` (A95) — translate platform mode
- `atom:mode-delta` (A96) — diff/apply mode
- `atom:mode-flash` (A97) — flash config flag
- `atom:mode-ports` (A98) — ports config flag
- `atom:mode-scout` (A99) — discovery mode
- `atom:mode-check` (A100) — governance mode
- `atom:mode-trial` (A101) — scenario-driven mode

### Folded Atoms (all folded into Craftworks-internal parents)
- All 28 folded atoms (A05, A07, A11, A12, A14, A15, A25, A27, A32, A33, A36, A38, A44, A46, A65, A66, A113, A114, A117, A118, A137, A138, A140, A147, A149, A158, A160, A166, A167, A168, A173, A174, A175, A181, A182) — sub-features of Craftworks-internal parents

---

## Cross-Reference: claws Architecture to Atoms

### claws Compiler Pipeline
```
OC workspace files (9)
  → FORMA readers (A133, A135)
    → FormaIR (A134)
      → ProgramIR (A71) with governance extensions
        → SkillIR (A72) + RoleIR (A74) + ToolIR (A142) + CharterIR (A141)
          → OperationIR (A79) + TypeScript emitter (new)
            → Executable governance skills for OC Gateway
```

### claws Security Layers (4) to Atoms
```
Layer 1: Compile-time validation    → A43 (CGR), A47 (Audit), A197 (Guardian preamble)
Layer 2: Policy enforcement         → A148 (Policy), A45 (Guard G1-G4), A275 (Governance composition)
Layer 3: Runtime gates              → A180 (Gate), A179 (Budget), A68 (Permission tiers)
Layer 4: Audit & compliance         → A153 (Audit trail), A43 (CGR)
```

### claws @claws/* Libraries to Atoms
```
@claws/compiler    → A133, A134, A135, A71, A72, A74, A79, A142, A73, A76, A77, A78, A169, A170, A176, A191, A197, A198, A82, A83, A84
@claws/governance  → A148, A43, A45, A141, A47, A275, A153, A179, A180, A68
@claws/sift       → A248, A249, A250, A260, A271
@claws/pinch       → A274
@claws/report      → A254 (inspired by)
```

### Recommended Investigation Priority (for Q12n+)

1. **Q12n: OC workspace file mapping to CREST** — A110, A111, A131, A126, A161, A162 — determines the scope of new parser work vs. reuse
2. **Q12o: OC agent identity model** — A193, A192, A194, A196, A10 — determines whether OLET becomes the formal OC agent identity framework
3. **Q12p: Compilation host for claws dev loop** — A185, A186, A187, A189, A205, A202 — determines whether claws ships a language server and watch mode
4. **Q12q: OC Gateway runtime contract** — A150, A151, A152, A157, A178, A172 — determines how much craft-ops runtime claws reuses for Gateway integration
5. **Q12r: Governance testing pipeline** — A129, A229, A237, A238, A203 — determines whether claws ships `claws test` with eval harness integration
