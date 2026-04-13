# The Compilation Pipeline

<!-- atom:claws-compiler (C01) -->

claws is a compiler. Not a linter, not a validator, not a config generator -- a compiler. It reads source files, builds an intermediate representation, optimizes, and emits executable code. The analogy: rustc is to Rust what tsc is to TypeScript what claws is to governance.

## What goes in

9 workspace files. These are the source language:

| File | What claws extracts |
|------|---------------------|
| SOUL.md | Deny, require, limit, elicit intents (keyword-anchored, confidence-scored) |
| AGENTS.md | Delegation graph, trust escalation, circular dependency detection |
| TOOLS.md | Tool manifest with risk classification (R1-R5), OBO detection, capabilities |
| IDENTITY.md | Auth method, attestation level (L0-L3) |
| USER.md | Authority scope, OBO permissions, data access grants |
| MEMORY.md | Data labels, sensitivity levels, retention policies |
| HEARTBEAT.md | Scheduled actions, risk derived from tools used |
| skills/ | Skill intents, supply chain metadata, unsigned skill warnings |
| lobster.yaml | Workflow DAG, data flow, governance injection points |

These files already exist in every OC workspace. claws does not invent a new config format. It reads what you already have.

**Parsing requirements**: The parser strips BOM markers uniformly from ALL 9 files before any byte is consumed -- handling UTF-8 (EF BB BF), UTF-16 LE (FF FE), and UTF-16 BE (FE FF) variants (P-100, P-129). Each file is checked independently for BOMs since only some files in a workspace may have them. BOM stripping is followed by LF normalization (the normalization layer sits between file I/O and both the parser and the hasher). The parser handles markdown code blocks (content inside fenced blocks is not parsed as governance directives), and is declaration-order-independent via two-pass parsing (collect declarations in pass 1, resolve references in pass 2 -- P-102). Missing optional files produce per-file warnings with default behavior documented (e.g., "IDENTITY.md not found -- agent identity defaults to L0"). The pipeline collects errors from ALL files before halting (per-file parser isolation, intra-file error recovery, per-file error limit of 10 -- P-108), giving developers a complete diagnostic picture in one pass. Source position tracking uses post-BOM-strip positions so line numbers match the user's editor. The GovernanceIR hash is computed from BOM-stripped, LF-normalized content to ensure identical hashes across Windows and Linux (P-101) -- two files differing only by BOM presence produce the same hash. Internal normalization never mutates source files -- the lossless round-trip guarantee is preserved.

## What comes out

4 artifacts, each serving a different enforcement layer:

```
claws build
  |
  +-> skills/claws-governance/SKILL.md      L1: advisory prompt (pinch-compressed)
  +-> plugins/claws-governance/index.ts      L2+L3: Gateway plugin (before_tool_call + lifecycle hooks)
  +-> exec-approvals.json                    L4: host-level backup allowlists
  +-> lobster.compiled.yaml                  Workflow: governance-injected DAG
```

The SKILL.md is a prompt -- advisory only, zero enforcement. The plugin is TypeScript -- it registers `before_tool_call` and lifecycle hooks on the Gateway. exec-approvals.json is the host-level backup. The compiled workflow is your lobster.yaml with governance steps injected.

## The 5-phase pipeline

```
Phase 1       Phase 2          Phase 3           Phase 4          Phase 5
PARSE         EXTRACT          ANALYZE           OPTIMIZE         EMIT
  |              |                |                 |                |
  v              v                v                 v                v
9 files ->  GovernanceAST -> Manifest -------> GovAnalysis -> OptimizedPlan -> 4 artifacts
             (~200 nodes)    (flat, queryable)   (29 rules)    (dead-code      (TS, MD,
                                                               eliminated)     JSON, YAML)
```

| Phase | Command | Input | Output | Latency budget |
|-------|---------|-------|--------|----------------|
| 1. PARSE | `claws compile` | 9 workspace files | GovernanceAST (~200 node types) | <100ms |
| 2. EXTRACT | `claws compile` | GovernanceAST | CapabilityManifest (flat, queryable) | <50ms |
| 3. ANALYZE | `claws compile` | Manifest + claws.json | GovAnalysis (violations, warnings, plan) | <200ms |
| 4. OPTIMIZE | `claws build` | GovAnalysis | OptimizedPlan (dead rules removed, merged) | <50ms |
| 5. EMIT | `claws build` | OptimizedPlan | 4 artifacts | <100ms |

Total: <500ms for `claws build`. <350ms for `claws check`.

Phases 1-3 are `claws compile`. Phases 4-5 are `claws build`. The split matters because `claws compile` produces the GovernanceIR -- the stable pivot that every downstream tool consumes.

## GovernanceIR: the pivot

```typescript
interface GovernanceIR {
  readonly version: 1;
  readonly manifest: CapabilityManifest;  // what the agent CAN do
  readonly analysis: GovAnalysis;         // what the rules SAY about it
  readonly hash: string;                  // for incremental recompilation
}
```

Serialized to `.claws/compiled/governance-ir.json`. Everything before the IR is analysis. Everything after it is code generation. `claws compile` produces it. `claws build` consumes it. `claws inspect` displays it. `claws diff` compares two.

The IR is the compilation contract. If you can read the IR, you can understand exactly what claws will enforce -- before any code is generated.

## Cross-file conflict detection

The ANALYZE phase checks 7 conflict categories across files:

| Conflict | Files involved | Severity |
|----------|---------------|----------|
| DENY vs TOOL | SOUL.md vs TOOLS.md | Error |
| TRUST ESCALATION | AGENTS.md vs parent tier | Error |
| OBO WITHOUT ELICIT | TOOLS.md vs SOUL.md/USER.md | Error |
| DATA LABEL MISMATCH | MEMORY.md vs AGENTS.md | Error |
| CIRCULAR DELEGATION | AGENTS.md internal | Error |
| SKILL-TOOL GHOST | skills/ vs TOOLS.md | Warning |
| SCHEDULE NO APPROVAL | HEARTBEAT.md vs TOOLS.md | Error |

OBO WITHOUT ELICIT was originally classified as Warning but was elevated to Error after scenario analysis determined that an R5/OBO tool without an elicitation policy contradicts the R5 fail-closed invariant. If R5 must always fail-closed, deploying an R5 tool without a governance gate means it can never execute -- a deterministic failure that warrants error severity.

Conflict detection uses semantic matching (not string equality) for DENY-vs-TOOL: "production" in a deny constraint matches "prod" in tool names and "production" in tool descriptions. Detection follows transitive data flows through the delegation graph for DATA-LABEL-MISMATCH. Cycle detection uses DFS-based algorithms that find all cycles of any length and report the full cycle path.

If SOUL.md says "never access production" and TOOLS.md lists a tool that does, the compiler catches it at build time -- not at 2am when the agent runs.

## Workflow inversion

When claws reads your lobster.yaml, it identifies governance-sensitive steps (R3+ tools, OBO actions, delegation) and injects governance steps into the DAG:

```
You wrote:                      claws emits:
  trigger                         trigger
  -> research                     -> claws-classify-research
  -> draft                        -> research
  -> send-email (R5/OBO)          -> draft
  -> respond                      -> claws-elicit-send-email   (approval gate)
                                  -> send-email
                                  -> claws-audit-send-email
                                  -> respond
```

Your original workflow is preserved. Governance steps are added around it. Remove `.claws/` and the original lobster.yaml is still there, unchanged.

## Where claws lives (CB-10 sibling architecture)

The claws-sdk sits as a sibling to craftworks-sdk. Both are built on
compiler-sdk + agent-sdk. They never cross-import.

```
  agent-sdk (0 internal deps)
       |
       v
  compiler-sdk (depends on agent-sdk)
       |
  +----+----+
  |         |
  v         v
craftworks  claws-sdk       -- SIBLINGS, never cross-import
-sdk        (NEW)
  |              |
  v              v
4 CLIs       claws-cli
             (NEW)
```

**Dependency rules**:
1. `claws-sdk` imports from `compiler-sdk` and `agent-sdk` ONLY.
2. `claws-sdk` does NOT import from `craftworks-sdk`. Ever.
3. `claws-cli` imports from `claws-sdk` ONLY (thin UI adapter).
4. Generated output code contains NO `@craftworks/*` imports.

Governing spec: CL-04 Compilation Pipeline, CB-10 Authoritative Diagram.

## Core Invariants

Eight invariants govern all claws compilation. Every guide in this directory
upholds these; they are the non-negotiable constraints.

1. **R5 fail-closed**: The compiler refuses to emit R5 fail-open. `FailMode<5>` resolves to `"fail-closed"` only in the type system. Non-negotiable, non-configurable. Enforced at three levels: (a) claws.json schema rejects at input, (b) compiler type system prevents it, (c) runtime handler enforces independently. *(Source: fail-mode S01-F01, S01-F06)*
2. **Lossless roundtrip**: claws never modifies the 9 workspace source files it reads. Add-only architecture -- governance is a layer beside your work, not on top of it.
3. **No @craftworks/ in output**: Generated code (SKILL.md, plugin TypeScript, exec-approvals.json) contains zero `@craftworks/*` imports. All output passes the OC developer test. Import scanning checks TS source, not compiled JS. Error strings are audited for internal references. SKILL.md does not mention pinch or Craftworks. Transitive runtime deps are audited. *(Source: emit-artifacts S08)*
4. **Add-only architecture**: `claws init` adds files and modifies 3 config files with backups. `claws uninstall` removes everything and restores originals. No permanent workspace modification.
5. **OC developer test**: Every line of generated code must look like something an OC developer would write themselves.
6. **Atomic emit**: All 4 artifacts are emitted atomically via staging directory. Partial emit (SKILL.md without plugin) is prevented. *(Source: emit-artifacts S01-F01, P-071)*
7. **Cross-artifact consistency**: Tool classifications must be identical across SKILL.md, exec-approvals.json, and plugin rule tables. Post-emit consistency check validates this. *(Source: emit-artifacts S04-F04, P-080)*
8. **pinch preserves safety-critical keywords**: Governance compression never removes never, always, must, prohibited, required, blocked. *(Source: emit-artifacts S04-F02, P-075)*

## For the gateway-eng

Every artifact the compiler emits must pass the Gateway performance bar: 50ms per hook, no blocking I/O, no global state, no memory leaks. The generated plugin TypeScript is constrained by design -- pre-allocated lookup tables, async-only operations, scoped closures. The compiler does not generate code that could starve the event loop.

## Scenario-Driven Additions

### From lossless-roundtrip scenarios (32 findings applied)
- Write-allow-list enforcement in EMIT phase restricts which files the compiler can create or modify
- Raw-byte SHA-256 verification hash (distinct from the normalized IR hash) enables lossless round-trip proof
- BOM stripping occurs before keyword anchor extraction in PARSE; UTF-16 BOM detection triggers transcoding without write-back
- CRLF/LF/CR mixed line endings are normalized internally; generated file line endings match the workspace convention or force LF
- Deterministic serialization via sorted-key JSON (JSON.stringify with replacer) and lexicographic file path ordering
- Compiler version tracked in IR metadata for cache invalidation on upgrade
- Last-known-good artifact preservation on compilation error prevents build failures from deleting working governance artifacts

### From platform-detection scenarios (47 findings applied)
- Structural validation of marker file content (not just filename) prevents false-positive platform detection
- Multi-platform detection with highest-enforcement-wins resolution when multiple platforms are present
- Multi-language code generation architecture (TypeScript, Python, JSON, YAML) for platform-specific EMIT targets
- Platform-specific performance budgets for guard code emitted per target
- Delimiter-based section management for .cursorrules and CLAUDE.md injection prevents overwriting user content
- Zero-config mode with synthetic defaults when no claws.json exists

## For the founder

The generated code passes the OC developer test: if an OC contributor reads `plugins/claws-governance/index.ts`, they should understand it without knowing Craftworks exists. No `@craftworks/*` imports in any generated artifact. The compiler's internals are invisible in its output.
