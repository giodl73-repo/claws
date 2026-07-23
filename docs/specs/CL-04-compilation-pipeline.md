# CL-04: Compilation Pipeline

> **Status: Retired** — Succeeded by the per-package spec scheme in
> `c:\src\claws\docs\`. Successor: `policy/specs/PO-policy.md` +
> `POI-policy-ir.md` + `POC-compiler.md`. Content preserved for
> historical reference. Do not amend.

**Source**: Q12j, Q12m, claws-compile-dx plan (Ra)
**Reviewers**: compiler-architect, platform-engineer, security-architect

---

## Overview

This spec defines the governance compilation pipeline -- the 5-phase system that transforms natural language workspace files into typed enforcement code. This is a real compiler, not a linter: it reads source files, builds an intermediate representation, optimizes, and emits executable code for multiple platform targets.

The pipeline parallels the Craftworks astro compiler (prose -> parse -> FormaIR -> optimize -> emit) with governance-specific semantics. The GovernanceIR is the stable pivot between analysis and emission. `claws compile` produces it. `claws build` consumes it. `claws inspect` displays it. `claws diff` compares two. The IR is serializable, inspectable, diffable, and cacheable.

Phase 5 EMIT produces 4 distinct artifacts: (1) a governance SKILL.md for advisory Layer 1, (2) a Gateway PLUGIN TypeScript module for enforcement Layers 2-3, (3) an exec-approvals.json bridge for Layer 4, and (4) a lobster.compiled.yaml for governed workflows. NOT "TypeScript skills" -- skills are prompt-only in the OC codebase.

The claws-sdk sits ON TOP of compiler-sdk + agent-sdk as a sibling to craftworks-sdk -- composition, not extraction. 4 IRs are reused directly (PolicyIR, GovernanceIR, ToolIR, TierIR), 4 are extended with new passes/targets (OperationIR, QueryIR, PRESS, SkillIR), and 36 are skipped. The OperationIR TypeScript emitter and the QueryIR openclaw-memory target are the two primary extensions.

## Scope

**In scope**:

- 5-phase pipeline (PARSE, EXTRACT, ANALYZE, OPTIMIZE, EMIT)
- GovernanceIR type definition and serialization
- Mechanical intent extraction from 9 workspace files
- 7 cross-file conflict categories
- Workflow inversion (DAG rewriting for lobster.yaml)
- Guard library architecture (engine/config separation)
- claws-sdk sibling architecture (composition on compiler-sdk + agent-sdk)
- OperationIR TypeScript emitter (OP9-ts-emit)
- QueryIR openclaw-memory target

**Out of scope**:

- Security rule definitions (CL-02)
- Runtime enforcement of compiled output (CL-03)
- Developer experience and maker tools (CL-05)

**Depends on**: CL-01 (claws.json schema), CL-02 (29 governance rules)

## Design

### 5-Phase Pipeline

```
Workspace files      claws compile (phases 1-3)         claws build (phases 4-5)
(9 source files)    +----------------------------+    +----------------------+
  SOUL.md           |                            |    |                      |
  AGENTS.md         | 1. PARSE -> GovernanceAST  |    | 4. OPTIMIZE          |
  TOOLS.md     -->  | 2. EXTRACT -> Manifest     |--> |    (dead-code elim)  |--> Platform code
  IDENTITY.md       | 3. ANALYZE -> GovAnalysis  |    | 5. EMIT              |    (TS/Python/
  USER.md           |              (29 rules)    |    |    (per-platform)    |     JSON/YAML)
  MEMORY.md         +----------------------------+    +----------------------+
  HEARTBEAT.md               |
  skills/                    v
  lobster.yaml       GovernanceIR (serialized, inspectable, diffable)
```

| Phase       | Input                 | Output                                     | Latency | Maps to                        |
| ----------- | --------------------- | ------------------------------------------ | ------- | ------------------------------ |
| 1. PARSE    | 9 workspace files     | GovernanceAST (~200 node types)            | <100ms  | `claws compile`                |
| 2. EXTRACT  | GovernanceAST         | CapabilityManifest (flat, queryable)       | <50ms   | `claws compile`                |
| 3. ANALYZE  | Manifest + claws.json | GovAnalysis (violations, warnings, plan)   | <200ms  | `claws compile`, `claws check` |
| 4. OPTIMIZE | GovAnalysis           | OptimizedPlan (dead rules removed, merged) | <50ms   | `claws build`                  |
| 5. EMIT     | OptimizedPlan         | 4 artifacts (see below)                    | <100ms  | `claws build <target>`         |

**Phase 5 EMIT produces 4 artifacts** (not "TypeScript skills"):

| #   | Artifact              | Path                                | Purpose                                |
| --- | --------------------- | ----------------------------------- | -------------------------------------- |
| 1   | Governance SKILL.md   | `skills/claws-governance/SKILL.md`  | Advisory prompt (L1), PRESS-compressed |
| 2   | Gateway PLUGIN module | `plugins/claws-governance/index.ts` | Enforcement TypeScript (L2+L3 hooks)   |
| 3   | exec-approvals.json   | `exec-approvals.json`               | Host-level backup (L4 bridge)          |
| 4   | lobster.compiled.yaml | `lobster.compiled.yaml`             | Governance-injected workflow DAG       |

**Atomic artifact emission** (emit-S01-F01): The 4 artifacts MUST be emitted atomically — either all succeed or none are written. If SKILL.md emits successfully but index.ts fails (e.g., TypeScript generation error), the workspace has advisory governance without enforcement. Partial emit is worse than no emit. The emit phase writes to a temporary staging directory and moves atomically on success.

**Same-filesystem staging requirement** (SCV-S01-F01): The staging directory MUST be on the same filesystem as the target to guarantee atomicity via rename(). On Windows, MoveFileEx with MOVEFILE_REPLACE_EXISTING is not atomic across volumes. Cross-volume staging silently breaks the atomicity guarantee.

**Staging directory crash recovery** (SCV-S01-F02): If the process crashes during the atomic move, the workspace has stale artifacts and new artifacts in staging. Recovery on next build must detect orphaned staging directories and either complete the move or clean up.

**Variable artifact count in atomic set** (SCV-S01-F03): lobster.compiled.yaml is optional. The expected artifact set must be determined before EMIT starts. A workspace without lobster.yaml expects 3 artifacts; one with expects 4.

**Last-known-good artifact preservation** (SCV-S01-F05): A failed EMIT must NOT delete previous artifacts. The staging-and-move pattern preserves this naturally. A "clean before emit" strategy would violate this.

**Mixed create/overwrite atomicity** (SCV-S01-F07): exec-approvals.json modifies an existing host-level file; SKILL.md and index.ts are created in claws-owned directories. The atomic move must handle both semantics with backup of the original.

**Staging directory git visibility** (SCV-S01-F10): The staging directory must be in .claws/ (already gitignored) or listed in .gitignore. Stale staging files appearing in git status confuse developers.

**exec-approvals.json schema validation** (emit-S01-F02, emit-S05-F01): exec-approvals.json is the L4 host-level backup. Its format MUST be compatible with the OC platform's exec approval configuration. The emit phase validates the generated JSON schema against the OC exec approval spec before writing. If the format is wrong, the backup is silently broken.

**OC plugin scaffold completeness** (emit-S01-F06): The generated plugin MUST be a valid OC plugin that passes `openclaw plugins list` verification. The emit phase generates the complete scaffold: package.json, entry point, correct hook registration API. A post-emit validation step verifies the scaffold.

**Compiled workflow schema validation** (emit-S02-F01): lobster.compiled.yaml MUST be valid YAML that the OC workflow runner can execute. The emit phase validates the compiled workflow against the lobster schema before writing.

**Workflow-plugin handler name contract** (emit-S02-F02): The compiled workflow references governance handler functions from the plugin (e.g., `claws-elicit-send-email`). These handler names MUST match the exported functions in index.ts. A contract (shared constant or generated manifest) ensures naming consistency between workflow emission and plugin emission.

**Fail-mode in compiled workflow steps** (emit-S02-F06): Governance steps injected into lobster.compiled.yaml must themselves be governed. If the injected elicitation step crashes, the workflow MUST fail-closed for R5 tools. The compiled workflow carries fail-mode metadata for each governance step.

**Conditional branch handling in workflow inversion** (emit-S02-F07): If the workflow has conditional branches (if/else in lobster.yaml), governance injection MUST handle all branches. A branch that skips send-email gets no elicitation step. A branch that uses send-email gets the full governance injection. DAG rewriting must be branch-aware.

**Plugin loading order advisory** (emit-S03-F01): OC executes hooks in registration order, not priority order. The governance plugin MUST be loaded before all other plugins. Plugin loading order is configured in openclaw.json. The emit phase SHOULD warn if the governance plugin is not first — but modifying openclaw.json is outside claws's scope (lossless principle).

**Plugin ordering advisory warning detail** (SCV-S05-F01): The warning must be prominent and include the exact change: "Move claws-governance to position 1 in openclaw.json plugins array." The compiler can detect the risk but cannot fix it (lossless principle).

**Post-init ordering instruction** (SCV-S05-F04): `claws init` creates the governance plugin but does not modify openclaw.json load order. After init, the output must include: "IMPORTANT: Ensure claws-governance is the FIRST plugin in openclaw.json."

**Fleet plugin ordering enforcement** (SCV-S05-F08): In fleet deployments where openclaw.json is managed centrally, plugin ordering is a fleet-level security property. `claws fleet scan` should check plugin ordering across all workspaces and report any where governance is not first.

**Defense against plugin short-circuit** (SCV-S05-F03): A malicious plugin could register before_tool_call that calls the tool directly (bypassing subsequent hooks). The sidecar (L5) is the defense against this class of attack because it operates outside the Gateway plugin system.

**Fail-mode handler generation correctness** (emit-S03-F02): The generated handler MUST wrap evaluatePolicy in the try/catch fail-mode handler. The code structure is: `api.on("before_tool_call", async (event, ctx) => { try { return evaluatePolicy(event, ctx); } catch(err) { ... } })`. If the try/catch is missing from generated code, fail-closed is broken. Post-emit static verification enforces this.

**TypeScript version targeting** (emit-S03-F06): The generated TypeScript MUST compile without errors using the OC platform's TypeScript version. The emit phase targets a minimum TS version (ES2020, no `satisfies` keyword unless OC supports it). Version targeting is configurable via `claws.json#emit.tsTarget`.

**Missing rule table graceful degradation** (emit-S03-F07): If the plugin is registered but governance rule tables are not yet compiled, the evaluatePolicy function has no data. The handler MUST detect missing rule tables and fall back to fail-closed for ALL tools rather than crashing.

**SKILL.md instruction quality** (emit-S04-F01): SKILL.md is advisory only — the LLM may ignore it. The generated SKILL.md MUST use clear, imperative instructions ("NEVER access production databases"), not suggestions ("avoid prod db"). Safety-critical directives use uppercase keywords.

**PRESS governance compression profile** (emit-S04-F02): PRESS compression MUST NOT remove critical governance directives. The compression profile for governance content preserves safety-critical keywords (never, always, must, prohibited, required, blocked). Compression quality is validated: compressed SKILL.md must be semantically equivalent to uncompressed.

**Frozen keyword set for governance** (SCV-S08-F01): Safety-critical keywords must be marked as FROZEN in the PRESS compression profile -- never subject to synonym replacement or abbreviation. A synonym rule changing "never" to "don't" or "prohibited" to "not allowed" weakens directives from absolute constraints to suggestions.

**Directive-level preservation** (SCV-S08-F02): Preservation applies to the full directive sentence, not individual keywords. "NEVER access production databases" must remain complete. If compression removes "databases" and keeps "NEVER access production", the directive is ambiguous.

**Keyword count validation** (SCV-S08-F03): Post-compression validation counts safety-critical keywords in both versions. If any keyword count decreases, the compression is rejected. This is a practical proxy for semantic equivalence.

**Case preservation for safety keywords** (SCV-S08-F04): "NEVER" (uppercase) is a stronger directive than "never" (lowercase) in LLM prompt engineering. The compression profile must preserve original casing. A compression rule that lowercases all text weakens every directive.

**Keyword preservation across compression levels** (SCV-S08-F05): Keyword preservation must be enforced REGARDLESS of compression level. At "aggressive" compression for small context windows, the pressure to compress is highest and the risk of keyword loss is greatest.

**PRESS preservation scope boundary** (SCV-S08-F06): If SKILL.md uses the size management policy (inline R4-R5 only, reference exec-approvals.json for the rest), safety keywords apply only to the inlined R4-R5 directives. exec-approvals.json is not PRESS-compressed.

**No preservation metadata in output** (SCV-S08-F07): The keyword preservation mechanism must not insert markers like "[PRESS-PRESERVED]" or "{{frozen}}" into SKILL.md output. Preservation is internal; the output reads as natural governance guidance.

**Cross-artifact consistency validation** (emit-S04-F04): Tool classifications in SKILL.md must match classifications in exec-approvals.json and in the plugin's rule tables. If three artifacts have different classifications for the same tool, the governance layers contradict each other. The emit phase includes a cross-artifact consistency check.

**SKILL.md directive-to-risk mapping** (SCV-S02-F01): SKILL.md uses natural language directives ("NEVER access without approval"), not risk level numbers. The consistency check must map between directive severity and risk level: "NEVER" maps to R5, "requires confirmation" maps to R3-R4, "audit only" maps to R1-R2. If PRESS compression changes the directive wording, the mapping may break.

**Field name mapping in consistency check** (SCV-S02-F02): exec-approvals.json uses OC platform field names, not claws internal names. The consistency check must apply the same field name mapping used during emission.

**Machine-readable classification manifest** (SCV-S02-F03): The plugin's rule tables are compiled TypeScript constants in index.ts. Parsing generated TS for consistency checking is fragile. The EMIT phase must generate a machine-readable manifest alongside the code for reliable consistency verification.

**Intentional omission in consistency check** (SCV-S02-F04): SKILL.md may omit R1-R2 tools for brevity (size management policy). The consistency check must account for intentional omissions -- absence of R1-R2 from SKILL.md is not an inconsistency.

**Built-in tool consistency scope** (SCV-S02-F05): Platform built-in tools may appear in exec-approvals.json and plugin rule tables but NOT in SKILL.md. The consistency check must distinguish declared tools from built-in tools and apply different rules.

**Tool name normalization in consistency check** (SCV-S02-F06): The consistency check must normalize tool names before comparison. "send-email" in SKILL.md and "sendEmail" in exec-approvals.json are consistent despite different surface forms.

**Consistency failure triggers atomic rollback** (SCV-S02-F07): If the cross-artifact consistency check fails, the EMIT phase must treat it as an emit error and invoke atomic rollback (S01). Cross-artifact inconsistency is never acceptable -- it is a hard gate, not a warning.

**Override propagation consistency** (SCV-S02-F08): Custom classification overrides in claws.json must flow through uniformly to all artifacts. The consistency check validates that overrides are propagated to all artifacts, not applied to some and missed by others.

**exec-approvals platform schema conformance** (emit-S05-F01): The emitted format MUST match the OC platform's expected exec approval schema exactly. Field names must use the platform's naming convention (camelCase vs snake_case mapping).

**Custom approval override in exec-approvals** (emit-S05-F03): Individual tools may have custom approval overrides in claws.json. The emitted exec-approvals MUST honor overrides: an R3 tool with explicit `approval: "required"` is emitted as "required," not "confirmation."

**Built-in tool inclusion in exec-approvals** (emit-S05-F04): Platform built-in tools (e.g., OC bash tool, R4/EXECUTE) may not appear in TOOLS.md but still need exec-approval entries. The emit phase merges declared and built-in tools.

**AbortSignal propagation** (emit-S06-F01): AbortSignal.timeout() creates a signal, but evaluatePolicy must respect the signal. The generated code passes the AbortSignal to evaluatePolicy so the timeout actually aborts evaluation, not just the wrapping promise. Without propagation, evaluatePolicy continues running after timeout (wasting CPU), and the fail-mode result races with the eventual evaluatePolicy result (SCV-S15-F02).

**Configurable hook timeout in generated code** (emit-S06-F02): 50ms is the default timeout. The generated code reads `claws.json#performance.hookTimeoutMs` at startup. Enterprises with complex policy evaluation can configure longer timeouts up to the 500ms ceiling.

**Timeout side effect cleanup** (emit-S06-F03): The Promise.race pattern has a subtle bug: if evaluatePolicy resolves AFTER the timeout, side effects may persist. The timeout AbortSignal MUST also abort side effects (audit writes, cache updates) from the abandoned evaluation.

**Node.js version compatibility** (emit-S06-F04, emit-S03-F06): AbortSignal.timeout() requires Node 18+. The generated code includes a polyfill or setTimeout-based fallback for older Node versions. The OC platform minimum Node version is checked at emit time. The fallback must use setTimeout + AbortController to achieve the same timeout behavior (SCV-S15-F07).

**Error type distinction in timeout handling** (emit-S06-F06): The generated code MUST handle AbortError (timeout) differently from TypeError (bug). Both trigger fail-mode, but audit events must distinguish the two causes for diagnosis.

**Catch clause minimalism** (emit-S07-F01): The generated catch clause MUST be minimal: `catch(err) { if (risk >= 5) return { block: true, blockReason: ... }; }`. Additional logic (logging, metrics, state updates) could throw, defeating the defense.

**Post-emit static verification** (emit-S07-F02): Static analysis of generated code verifies: (1) every code path is try/catch wrapped, (2) the catch clause checks risk level, (3) R5 returns block:true. A post-emit verification pass enforces this invariant on every build.

**Async error handling in generated handler** (emit-S07-F06): The generated code MUST use proper async/await to catch Promise rejections. If evaluatePolicy schedules a microtask that throws, the unhandled rejection must not escape the handler.

**Import scanning on TS source** (emit-S08-F01): The zero-@craftworks import check scans TypeScript source files, not compiled JS. Type-only imports that disappear in JS output are still violations in the source.

**Error string internal reference audit** (emit-S08-F02): Error messages in generated code (blockReason strings, log messages) MUST NOT reference internal names. "claws-governance-error" is acceptable. "craftworks-sdk evaluation failed" is not. Error string templates are audited.

**SKILL.md provenance invisibility** (emit-S08-F03): The generated SKILL.md MUST NOT mention PRESS, compression, or Craftworks tooling. It reads as natural governance guidance, not "auto-generated by claws."

**Generated code comment policy** (emit-S08-F04): Comments in generated TypeScript may contain a metadata header ("// Generated by claws v1.0") but MUST NOT reference internal patterns ("// Uses compiler-sdk FormaIR pattern").

**Transitive dependency audit** (emit-S08-F06): If @claws/* packages depend on @craftworks/* transitively, the generated code's runtime dependencies include Craftworks code. The OC developer test extends to runtime dependencies, not just source imports.

**Platform field name mapping** (emit-S08-F07): exec-approvals.json MUST use the OC platform's field names. A field name mapping layer in the emit phase translates claws's internal names to platform-native names per platform version.

**Per-tool error granularity** (fail-S01-F07): If claws.json has multiple R5 tools and only one has fail-open override, the compiler reports OC-POLICY-E001 for the specific tool, not the entire configuration. Other R5 tools with fail-closed compile normally.

**Error code registry planning** (fail-S01-F02): OC-POLICY-E001 is the first error code. The registry categorizes codes: E0xx for type-level violations, E1xx for parse errors (CLAWS-P series), E2xx for rule violations, E3xx for emit errors. Warning code ranges: W015-W019 (G-CLASS), W020-W029 (G-ELICIT), W025-W026 (fail-mode), W030+ (runtime). The code space is planned before implementation. _(Source: SCV-S10-F07)_

**Developer-friendly error messages** (fail-S01-F04): Error messages include both the technical constraint and the WHY. OC-POLICY-E001 message: "R5 fail-open is structurally prohibited — R5 tools act as the user; if the governance hook crashes, the tool must NOT execute."

**Fail-open code generation correctness** (fail-S02-F05): The generated plugin code for R1 fail-open MUST contain `catch(err) { return undefined; }` (allow). The code for R3 fail-closed MUST contain `catch(err) { return { block: true, blockReason: ... } }`. A test verifies the generated catch behavior per risk level.

**Per-tool fail-mode template correctness** (fail-S03-F05): The generated handler uses templates per fail-mode. If the fail-mode variable is wrong, R3 could get fail-open behavior. Template correctness is verified per-tool in post-emit tests.

**Risk-level branching in handler generation** (fail-S03-F06): The generated code MUST correctly branch: R5 always blocks, R3-R4 checks configured fail mode, R1-R2 checks configured fail mode with different defaults. The branching uses the `failModeForRisk()` function from the compiled rule tables.

**Platform-specific timeout implementation** (fail-S06-F02): AbortSignal.timeout() is a Node.js API. For Python-based targets (LangGraph, CrewAI), the EMIT phase generates platform-specific timeout code (asyncio.wait_for, threading.Timer). Multi-platform emit is Phase 2+.

**Overwrite vs incremental emit strategy** (emit-S02-F04): When artifacts from a previous compilation exist, the emit phase overwrites (not appends). Before overwriting, the emit phase compares content hashes — identical content skips the write (preserves file timestamps for build tools).

**SKILL.md self-sufficiency** (emit-S01-F07): If only L1 is loaded (platform does not support plugins), governance is advisory-only. The emitted SKILL.md MUST be self-sufficient as advisory governance without relying on the plugin. It includes all tool classifications and deny constraints inline.

**SKILL.md size management** (emit-S04-F06): If the workspace has 50+ tools, listing all classifications inline becomes too long. Above a configurable threshold (default: 20 tools), the SKILL.md references exec-approvals.json for the full list and includes only R4-R5 tools inline.

**PRESS compression level configuration** (emit-S04-F03): The PRESS compression level is configurable: aggressive for small contexts (4K), minimal for large contexts (128K). Default: moderate. Setting: `claws.json#emit.pressLevel: "aggressive" | "moderate" | "minimal"`.

**Rollback diagnostic detail** (SCV-S01-F04): When EMIT rolls back, the error message must enumerate which artifacts succeeded and which failed: "EMIT failed: index.ts generation error. Rolled back: SKILL.md, exec-approvals.json, lobster.compiled.yaml. No artifacts written."

**Hash optimization vs atomicity interaction** (SCV-S01-F06): If the content hash check determines that SKILL.md is unchanged but exec-approvals.json needs updating, the partial-write optimization (skip unchanged files) must still be atomic. Either all changed files are written atomically, or the hash optimization is disabled when any file in the set changes.

**Pre-emit permission check** (SCV-S01-F08): The EMIT phase must check write permissions for ALL target paths before beginning artifact generation, failing fast with a clear permission error rather than generating artifacts that cannot be placed.

**Post-emit static verification: AST-based** (SCV-S14-F01): The static verification operates on TypeScript AST, not text patterns. A regex-based check for "try" and "catch" would miss nested try/catch, arrow functions, and other syntactic variations. The verifier must parse the generated code into an AST.

**Multi-handler verification scope** (SCV-S14-F02): The try/catch requirement applies to ALL handler registrations (before_tool_call, subagent_spawning, etc.), not just before_tool_call. The verifier must identify all handler registration patterns and check each.

**Risk check is conditional, not just reference** (SCV-S14-F03): The risk level check in the catch clause must be a conditional expression that gates the block:true return, not just a variable reference. `if (risk >= 5)` is a check; `console.log(risk)` is not.

**TS source import scanning, not compiled JS** (SCV-S14-F04): Type-only imports (`import type { Foo } from '@craftworks/...'`) disappear in compiled JS but are still violations in the TS source. The verifier operates on .ts files before any compilation.

**Catch clause complexity metrics** (SCV-S14-F05): The catch clause minimalism check uses quantitative proxies: catch clause statement count (max 5), no function calls except pre-approved ones (riskMap.get, sanitizeError), no await expressions, no new object allocation.

**Verification result reporting** (SCV-S14-F06): `claws build` reports: "Post-emit verification: 4/4 checks passed." Failure reports include the line number in generated code where the violation was found.

**Verification rule testing** (SCV-S14-F07): Verification rules must be tested independently against both valid and invalid generated code samples to avoid circular dependency between generator and verifier.

**Per-build verification gate** (SCV-S14-F09): Verification must run on every `claws build`, not just on first build. If the code generator is updated, generated code may change. Post-emit verification is a per-build gate.

**Dynamic string reference detection** (SCV-S14-F08): Error string audit must check both static strings and template literal expressions for internal reference patterns. String templates may construct references dynamically (e.g., `"${sdk.name} error"`).

Total pipeline: <500ms for `claws build`, <350ms for `claws check`.

### GovernanceIR

```typescript
interface GovernanceIR {
  readonly version: 1;
  readonly manifest: CapabilityManifest; // what the agent CAN do
  readonly analysis: GovAnalysis; // what the rules SAY about it
  readonly hash: string; // for incremental recompilation
}
```

Serialized to `.claws/compiled/governance-ir.json`. The IR is the compilation contract: everything before it is analysis, everything after it is code generation.

### Mechanical Intent Extraction (9 File Types)

| File         | Intent Types                                                      | Example                                                                        |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| SOUL.md      | DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent | "Never access production" -> `DenyIntent { scope: 'tool', pattern: 'prod-*' }` |
| TOOLS.md     | ToolManifestEntry (risk R1-R5, capabilities, OBO detection)       | Tool with "send email on behalf of" -> R5/OBO/COMMUNICATE                      |
| AGENTS.md    | DelegationIntent, graph analysis (circular, escalation)           | Subagent with R4 tools under T2 parent -> TRUST ESCALATION                     |
| IDENTITY.md  | IdentityIntent (auth method, attestation L0-L3)                   | SSO config -> L2 attestation                                                   |
| USER.md      | AuthorityIntent (OBO scope, data access)                          | "You may send emails" -> oboScope includes send-email                          |
| MEMORY.md    | MemoryIntent (labels, retention)                                  | "Customer data (confidential, 30d)" -> CONFIDENTIAL                            |
| HEARTBEAT.md | ScheduleIntent (risk derived from tools used)                     | Hourly email schedule -> R5, approvalRequired: true                            |
| skills/      | SkillIntent (capabilities, supply chain metadata)                 | Unsigned marketplace skill -> G-SUPPLY warning                                 |
| lobster.yaml | WorkflowIntent (DAG, data flow, governance points)                | Step uses send-email -> inject elicit-step before                              |

SOUL.md extraction uses keyword-anchored patterns with confidence scoring (0.0-1.0). Threshold: 0.5 for automatic, below 0.5 flagged for user confirmation. Extraction is markdown-aware: content inside fenced code blocks (triple backticks) is skipped. The parser must distinguish low-confidence valid input (scored below 0.5) from structurally invalid input (syntax error with diagnostic code).

### 7 Cross-File Conflict Categories

| Conflict             | Files                       | Severity                                                                                                                                                                                                                                                                                                                                |
| -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DENY vs TOOL         | SOUL.md vs TOOLS.md         | Error                                                                                                                                                                                                                                                                                                                                   |
| TRUST ESCALATION     | AGENTS.md vs parent tier    | Error                                                                                                                                                                                                                                                                                                                                   |
| OBO WITHOUT ELICIT   | TOOLS.md vs SOUL.md/USER.md | Error (was Warning; elevated per CFC-S03-F01: R5 fail-closed invariant requires elicitation). Breaking change: existing workspaces with ungoverned R5/OBO tools will stop compiling (SCV-S03-F01). Migration guidance required. Per-tool error granularity (SCV-S03-F04). Actionable remediation with claws.json snippet (SCV-S03-F05). |
| DATA LABEL MISMATCH  | MEMORY.md vs AGENTS.md      | Error                                                                                                                                                                                                                                                                                                                                   |
| CIRCULAR DELEGATION  | AGENTS.md internal          | Error                                                                                                                                                                                                                                                                                                                                   |
| SKILL-TOOL GHOST     | skills/ vs TOOLS.md         | Warning                                                                                                                                                                                                                                                                                                                                 |
| SCHEDULE NO APPROVAL | HEARTBEAT.md vs TOOLS.md    | Error                                                                                                                                                                                                                                                                                                                                   |

These map to the tension model (atom:tension) clusters: 5 auto-resolve via cross-cluster priority (governance > authority > execution), 1 escalates to human review (circular delegation, same-cluster), 1 is referential integrity (skill-tool ghost, better as G1 assertion).

**Conflict resolution principles** (from scenario findings):

- Governance-first: resolution suggestions prefer removing execution-level items (tools, delegations) over weakening governance constraints (deny rules, trust tiers)
- Least-privilege: prefer reducing scope (remove tool from delegation) over expanding permissions (raise trust tier)
- Elicitation as resolution: conditional deny constraints ("never X UNLESS approved") may resolve via elicitation gate, not just removal
- Pre-authorization recognition: if USER.md pre-authorizes a scheduled R5 tool, SCHEDULE-NO-APPROVAL resolves; the pre-authorization must have conditions (time-bound, audit-logged)
- Deterministic failures are always errors: conflicts that produce guaranteed runtime failure (e.g., scheduled R5 with no human present and deny-default) are error severity, no advisory exception

### Workflow Inversion

The compiler reads `lobster.yaml`, identifies governance-sensitive steps (R3+ tools, OBO actions, A2A delegation, sensitive data), and injects governance steps into the DAG:

```
User writes:                    Compiler emits:
  trigger                         trigger
  -> research                     -> claws-classify-research
  -> draft                        -> research
  -> send-email (R5/OBO)          -> draft
  -> respond                      -> claws-elicit-send-email  (OBO gate)
                                  -> send-email
                                  -> claws-audit-send-email
                                  -> respond
```

Output: rewritten `lobster.compiled.yaml` + skill handlers for injected governance steps.

**Branch-aware governance injection** (emit-S02-F07): Workflow inversion MUST handle conditional branches (if/else in lobster.yaml). A branch that skips send-email gets no elicitation step. A branch that routes through send-email gets the full governance injection. The DAG rewriting traverses all reachable paths and injects governance steps only on paths that contain governance-sensitive tools.

### Guard Library Architecture

`claws build openclaw` generates:

| Component                 | Files                                                                  | Layer            |
| ------------------------- | ---------------------------------------------------------------------- | ---------------- |
| Governance SKILL          | `skills/claws-governance/SKILL.md` (advisory prompt, PRESS-compressed) | L1               |
| Governance PLUGIN         | `plugins/claws-governance/index.ts` (TypeScript, registers all hooks)  | L2+L3            |
| Exec approvals bridge     | `exec-approvals.json` (host-level backup)                              | L4               |
| Lobster compiled workflow | `lobster.compiled.yaml` (governance-injected DAG)                      | Workflow         |
| Runtime engine            | `.claws/runtime/` (classify, elicit, audit, a2a, filters, budget)      | Shared           |
| Compiled data             | `.claws/compiled/` (tables, matrices, IR)                              | Generated config |

Guard composition pipeline: classify -> checkBudget -> checkA2A -> filterInput -> elicit -> EXECUTE -> validateOutput -> audit. 8 extension points for custom guards. Custom guards can DENY but cannot override governance DENYs.

### claws-sdk Architecture (Sibling Composition) — CB-10 Authoritative Diagram

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

**Dependency rules (authoritative)**:

1. `claws-sdk` imports from `compiler-sdk` and `agent-sdk` ONLY.
2. `claws-sdk` does NOT import from `craftworks-sdk`. Ever. Zero references.
3. `claws-cli` imports from `claws-sdk` ONLY (thin UI adapter).
4. Generated output code (PLUGIN, SKILL.md, exec-approvals.json) contains NO `@craftworks/*` imports. All generated code passes the OC developer test.

**claws-sdk uses from compiler-sdk**:

- 4 DIRECT: PolicyIR, GovernanceIR, ToolIR, TierIR (the governance engine, unchanged)
- 4 EXTEND: OperationIR (+ TS emitter), QueryIR (+ OC memory target), PRESS (+ pinch profiles), SkillIR (+ governance annotations)

**claws-sdk uses from agent-sdk**:

- GovernanceManager, CGR chain, policy walker, audit trail, gates, hashing, eval

**claws-sdk does NOT import from craftworks-sdk. Ever.**

**What about the 6 command groups in COMMAND-MAP that referenced craftworks-sdk?** Those references were incorrect. The resolution:

- `claws compile`, `claws build`, `claws check` -> `claws-sdk` (which uses `compiler-sdk` internally)
- `claws init`, `claws kill`, `claws watch` -> `claws-sdk` (which uses `agent-sdk` internally)
- `claws comply`, `claws assess` -> `claws-sdk` (new compliance module, no craftworks-sdk dependency)
- `claws fleet` -> `claws-sdk` (fleet management module, no craftworks-sdk dependency)

### OperationIR -> TypeScript Emitter (OP9-ts-emit)

New 9th pass in the existing 8-pass OperationIR pipeline. Maps 16 AST node types to TypeScript patterns:

- SequenceNode -> `await` chains
- ParallelNode -> `Promise.all()`
- ConfirmationStep -> elicitation gate (G-ELICIT)
- EffectNode -> audit chain append

The existing ConfirmationStep injection for T4 skills maps directly to G-ELICIT. claws extends the trigger: inject confirmation for ANY R5 tool, not just T4 skills.

### QueryIR -> openclaw-memory Target

6th emit target for QueryIR (alongside odata, sql, graphql, fetchxml, flash-local):

- FilterNode -> `memory.search()` filters
- ProjectionNode -> field selection
- SortNode -> orderBy parameter
- PaginationNode -> limit/offset
- AggregationNode -> client-side (lossy=true, OC memory has no server-side aggregation)
- NavigationNode -> client-side (lossy=true)

### PRESS -> pinch Mapping

5 of 7 PRESS modules reusable with type parameters:

| PRESS Module       | pinch Equivalent          | Decision                             |
| ------------------ | ------------------------- | ------------------------------------ |
| bipartite-split    | governed/ungoverned split | REUSE (type-parametric)              |
| quality-matrix     | risk matrix               | REUSE (injectable config)            |
| token-counter      | governance cost estimator | CREATE NEW                           |
| rewrite-rules      | fix-rules                 | REUSE (generic transition validator) |
| position-optimizer | rule ordering             | CREATE NEW                           |
| press-profiles     | pinch profiles            | REUSE (generic profile registry)     |
| cache-contract     | governance cache          | REUSE (generic cache contract)       |

### Type-Level R5 Fail-Open Prevention (Dragon)

The GovernanceIR type makes it **structurally impossible** to emit R5 with fail-open semantics. This is a type-level constraint, not a runtime check:

```typescript
// The FailMode type is parameterized by risk level
type FailMode<R extends RiskLevel> = R extends 5
  ? "fail-closed" // R5: only fail-closed is representable
  : R extends 3 | 4
    ? "fail-open" | "fail-closed" // R3-R4: configurable
    : "fail-open" | "fail-closed"; // R1-R2: configurable (default open)

// GovernanceRule carries the risk level in the type
interface GovernanceRule<R extends RiskLevel = RiskLevel> {
  readonly riskLevel: R;
  readonly failMode: FailMode<R>;
  // ... other fields
}

// This COMPILES:
const r5rule: GovernanceRule<5> = { riskLevel: 5, failMode: "fail-closed" };

// This DOES NOT COMPILE (TypeScript error):
// const bad: GovernanceRule<5> = { riskLevel: 5, failMode: "fail-open" };
//                                                ^^^^^^^^ Type '"fail-open"' is not assignable to type '"fail-closed"'
```

The EMIT phase checks this at the IR level before code generation. If any GovernanceRule with `riskLevel: 5` has `failMode !== "fail-closed"`, the compiler aborts with `OC-POLICY-E001: R5 fail-open is structurally prohibited`. This is the compiler's refusal to emit R5 fail-open, implemented as a type constraint rather than a runtime assertion.

### Conformance: IR Naming and Craftworks Patterns

The GovernanceIR follows Craftworks IR naming conventions established by the astro compiler:

| claws IR           | Craftworks Pattern                   | Governing Spec                         |
| ------------------ | ------------------------------------ | -------------------------------------- |
| GovernanceIR       | FormaIR (Spec 109)                   | IR pivot between analysis and emission |
| GovAnalysis        | Analogous to FormaIR validation pass | Rule evaluation against manifest       |
| GovernanceAST      | Analogous to astro AST               | Parse output before IR lowering        |
| OptimizedPlan      | Analogous to FormaIR optimization    | Dead-code elimination, merging         |
| CapabilityManifest | No direct analog (new)               | Flat queryable extraction              |

**FORMA (Spec 109) conformance**: GovernanceIR follows the FormaIR pattern: it is the stable pivot between analysis phases (1-3) and emission phases (4-5). Like FormaIR, it is serializable, inspectable, diffable, and cacheable. The `version` field enables forward-compatible IR evolution.

**RELAX (Spec 139) conformance**: Policy expressions in claws.json use RELAX tiered bindings for compile-time type checking. RELAX evaluates at compile time only -- the runtime receives pre-compiled rule tables, not RELAX expressions. This avoids conflicting with Spec 139's runtime evaluation semantics (claws is compile-time only).

**PRESS profiling conformance**: The governance SKILL.md (L1 advisory) is compressed using PRESS profiles to minimize token usage. The `pinch` profiles extend PRESS's generic profile registry with governance-specific compression rules (e.g., collapsing verbose rule descriptions into terse directives).

### Three-Engine Model

Three engines power different layers of the governance stack. Understanding which engine serves which purpose prevents confusion:

```
PRESS (prompt compression)      Context DAG (structural sharing)     Plugin (zero-token enforcement)
  |                                |                                    |
  v                                v                                    v
L1: SKILL.md                   Compile-time context assembly         L2-L4: Gateway plugin hooks
(advisory, token-budget)       (shared subgraphs across agents)      (no tokens consumed)
```

| Engine          | Purpose                                                                                               | Token Cost                   | Layer                  |
| --------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------- |
| **PRESS**       | Compress governance prompts to fit within token budgets                                               | Reduced (compressed)         | L1 SKILL.md            |
| **Context DAG** | Share governance context subgraphs across multi-agent sessions; deduplicate repeated policy fragments | Reduced (structural sharing) | Compile-time; feeds L1 |
| **Plugin**      | Zero-token enforcement via Gateway hooks; no system prompt injection needed                           | Zero                         | L2, L3, L4             |

The key insight: L2-L4 enforcement consumes ZERO tokens. The governance plugin intercepts tool calls at the Gateway level, before the LLM sees them. Only L1 (advisory SKILL.md) consumes tokens, and PRESS minimizes that cost. This means governance overhead is primarily compute (hook evaluation latency), not token budget.

## Constraints

- **GovernanceIR is the compilation contract**: Everything before it is analysis. Everything after it is code generation. `claws compile` produces it. `claws build` consumes it.
- **Separate engine from data**: Runtime engine is semver-stable code. Generated config is workspace-specific data. Engine rarely changes; config changes on every `claws build`.
- **RELAX compiles to rule tables**: Policy expressions are type-checked at compile time, then emitted as static rule arrays or inline functions. RELAX evaluator stays compile-time-only.
- **DataFrames materialize to constants**: Workspace context is materialized at compile time and embedded as `const` objects. No MaterializationRegistry at runtime.
- **Generated code must pass the OC developer test**: Every line of generated code must look like something an OC developer would write themselves. No @craftworks/* imports in output. Import scanning checks TS source, not compiled JS (emit-S08-F01). Error strings are audited for internal references (emit-S08-F02). SKILL.md does not mention PRESS or Craftworks (emit-S08-F03). Generated code comments follow the comment policy (emit-S08-F04). Transitive dependencies are audited (emit-S08-F06). Field names use platform-native naming (emit-S08-F07).
- **Custom guards can DENY but cannot override governance DENYs**: Security invariant preserved.
- **R5 fail-open is structurally unrepresentable**: The GovernanceIR type system prevents it at compile time. The EMIT phase rejects it at the IR level. The runtime handler denies it on error.
- **Atomic emit**: EMIT phase writes all artifacts to a staging directory, then moves atomically. Partial emit is prevented (emit-S01-F01).
- **Cross-artifact consistency**: Tool classifications must be identical across SKILL.md, exec-approvals.json, and plugin rule tables. A post-emit consistency check validates this (emit-S04-F04).
- **PRESS preserves safety-critical keywords**: Governance compression profile preserves never, always, must, prohibited, required, blocked. Compression quality is validated per build (emit-S04-F02).
- **Post-emit static verification**: Every build runs static analysis on generated code: try/catch coverage, risk-level branching correctness, R5 block:true presence (emit-S07-F02).
- **BOM stripping in PARSE**: Phase 1 PARSE must strip UTF-8 BOM markers before keyword-anchored extraction. BOM bytes preceding a SOUL.md constraint line would cause the first constraint to be skipped. BOM stripping must apply to ALL 9 workspace file types as a pre-processing step, not just SOUL.md. Must handle UTF-8 (EF BB BF), UTF-16 LE (FF FE), and UTF-16 BE (FE FF) BOMs. Per-file BOM detection is required -- each file may independently have a BOM. _(Source: CP-S01-F01, SCV-S09-F01, SCV-S09-F02, SCV-S09-F07)_
- **BOM-aware source position tracking**: Line number tracking must use post-strip positions so diagnostics match the user's editor. _(Source: SCV-S09-F04)_
- **BOM-agnostic hash computation**: GovernanceIR hash must be computed on BOM-stripped content. Two identical files, one with BOM and one without, must produce the same hash. Pipeline: BOM-strip then LF-normalize then hash. _(Source: SCV-S09-F05)_
- **Git BOM configuration independence**: The compiler must be BOM-tolerant regardless of git core.autocrlf or .gitattributes configuration. _(Source: SCV-S09-F06)_
- **BOM-induced false low-confidence**: If the BOM is not stripped, the first line's keyword match score may be below 0.5, causing a perfectly valid constraint to be flagged for user confirmation with no visible reason. _(Source: SCV-S09-F03)_
- **GovernanceIR hash normalization**: The GovernanceIR hash must be computed on line-ending-normalized content (LF canonical form). The same workspace must produce identical hashes on Windows (CRLF) and Unix (LF). _(Source: CP-S01-F04)_
- **GovernanceIR canonical JSON serialization**: Serialization must use canonical JSON: empty arrays are written as `[]` (never omitted), field ordering is deterministic, and `claws diff` treats omitted-vs-empty-array as equivalent. _(Source: CP-S01-F07)_
- **Cold-start latency budget**: The <350ms compile budget must account for cold-start overhead (loading 29 rule definitions). Cold-start initialization must be measured separately from per-file parsing to ensure the minimal-workspace case does not violate the latency constraint. _(Source: CP-S01-F05)_
- **skills/ directory enumeration**: Phase 1 PARSE must enumerate all `SKILL.md` files within subdirectories of `skills/`, not treat `skills/` as a single file. N skills produce N SkillIntent entries. _(Source: CP-S02-F01)_
- **Parse ordering independence**: Phase 1-2 must be declaration-order-independent: either two-pass (collect all declarations, then resolve references) or deferred resolution. Alphabetical file ordering must not cause forward-reference failures (e.g., AGENTS.md referencing tools from TOOLS.md). _(Source: CP-S02-F02)_
- **Implicit data flow label derivation**: Phase 2 EXTRACT must derive agent data flow ceilings from MEMORY.md labels when AGENTS.md does not set an explicit ceiling. This implicit derivation must be documented as part of the CapabilityManifest semantics. _(Source: CP-S02-F07)_
- **Rule applicability tracking**: Phase 3 ANALYZE must record skipped rules as "not applicable" (with reason: "file absent") in the GovAnalysis, not silently omit them. Fleet scans depend on distinguishing "rule passed" from "rule was not evaluated." _(Source: CP-S03-F04)_
- **Per-file absence diagnostics**: Warnings for missing optional files must enumerate each file individually with its default behavior (e.g., "IDENTITY.md not found -- agent identity defaults to L0"), not a single aggregate message. _(Source: CP-S03-F06)_
- **Confidence vs syntax error distinction**: Phase 1 PARSE must distinguish low-confidence valid input (scored below 0.5, flagged for user confirmation) from structurally invalid input (parse error with diagnostic code). A constraint like "never access" without a scope qualifier is a syntax error, not a low-confidence intent. _(Source: CP-S04-F01)_
- **Cross-platform line number accuracy**: Source location tracking must handle CRLF, LF, and mixed line endings. Line numbers in diagnostics must match the user's editor. _(Source: CP-S04-F02)_
- **Pipeline error strategy: collect-all-errors**: The pipeline must parse ALL source files and collect all errors before halting, not halt on the first parse error. Developers need a complete picture of all issues in one pass. _(Source: CP-S04-F04)_
- **Diagnostic error code registry**: Parse errors must use a defined code registry: CLAWS-P001 (malformed constraint), CLAWS-P002 (unknown keyword), CLAWS-P003 (conflicting constraints on same line), etc. The registry must be defined before implementation. _(Source: CP-S04-F06)_
- **Markdown-aware extraction**: Phase 1 PARSE must distinguish governance directives in prose from example text in markdown code blocks (triple backtick fenced blocks). Content inside code blocks must not be parsed as governance constraints. _(Source: CP-S04-F07)_
- **Platform built-in tool detection**: Phase 2 EXTRACT must detect platform built-in tools (e.g., OC exec = R4) that exist without being declared in TOOLS.md. An empty TOOLS.md does not mean zero tools -- it means zero _declared_ tools. The compiler must warn that built-in tools are ungoverned. _(Source: CP-S05-F01)_
- **GovernanceIR hash: path exclusion semantics**: The hash must be computed from content only, not file paths. Two workspaces at different paths with identical content must produce identical hashes. _(Source: CP-S05-F05)_
- **G-CLASS scaling**: G-CLASS must scale linearly with tool count. Workspaces with 50+ tools must not exceed the 200ms ANALYZE phase budget. _(Source: CP-S06-F03)_
- **Per-tool OBO warning granularity**: OBO diagnostics must report one warning per OBO-flagged tool (naming the tool and its OBO trigger), not a single aggregate count. _(Source: CP-S06-F07)_
- **Implicit root node synthesis**: Phase 2 EXTRACT must synthesize an implicit "root" node in the delegation graph from claws.json trust tier and TOOLS.md tool set. The root node represents the parent workspace agent. _(Source: CP-S07-F01)_
- **Delegation-of-phantom-tool detection**: FE6 fence pass must cross-reference delegated tools against TOOLS.md. Delegating a tool not in TOOLS.md is a delegation-of-phantom-tool error. _(Source: CP-S07-F02)_
- **GovernanceIR graph serialization**: Delegation graphs with cycles must serialize to cycle-safe JSON (e.g., reference markers or adjacency lists). JSON serializers must not produce infinite structures. _(Source: CP-S07-F06, CP-S05-CFC-F06)_
- **Workflow injected step naming**: Governance steps injected during workflow inversion must use deterministic, unique IDs: `claws-{type}-{tool-name}` (e.g., `claws-elicit-send-email`). When multiple R5 tools exist, the naming scheme must disambiguate. _(Source: CP-S08-F01)_
- **Parallel branch workflow inversion**: Workflow inversion must handle parallel DAG branches. If two parallel branches contain R5 tools, elicitation must be handled per-branch (parallel or serialized per policy). The spec currently shows only linear DAG inversion. _(Source: CP-S08-F02)_
- **Tool name normalization**: Tool references across files (lobster.yaml step names, SKILL.md instructions, AGENTS.md delegations) must be normalized for matching against TOOLS.md entries. Normalize hyphens, underscores, and casing (e.g., "send-email" = "sendEmail" = "send_email"). _(Source: CP-S08-F03)_
- **Classification step injection**: Workflow inversion must inject classification steps before ALL tool-using steps (as shown in the spec diagram), not only before R5 steps. The `claws-classify-{step}` pattern applies to any step that invokes a tool. _(Source: CP-S08-F06)_
- **Semantic matching for deny-tool conflicts**: DENY-vs-TOOL conflict detection must use semantic matching (natural language patterns against tool names AND descriptions), not string equality. "production" in a deny must match "prod" in tool names and "production" in descriptions, but must not false-positive on "prod-staging." _(Source: CFC-S01-F01, CFC-S01-F02)_
- **Governance-first conflict resolution**: Conflict resolution suggestions must respect the tension model priority (governance > authority > execution). For DENY-vs-TOOL, prefer removing the tool over removing the deny constraint. _(Source: CFC-S01-F03)_
- **Multi-constraint conflict aggregation**: When multiple deny constraints apply to a single tool, the conflict report must aggregate all applicable constraints, not report each as a separate conflict. _(Source: CFC-S01-F04)_
- **Clear halt-reason communication**: When error-severity conflicts prevent EMIT, the pipeline must communicate explicitly that no artifacts were produced and why, not just list the conflicts. _(Source: CFC-S01-F06)_
- **Elicitation as conditional deny resolution**: For conditional deny constraints ("never X UNLESS approved"), the compiler should suggest adding an elicitation gate as a resolution, not just removal. _(Source: CFC-S01-F07)_
- **Implicit 'all tools' delegation detection**: If AGENTS.md delegates "all tools" to a subagent without an explicit tool list, the compiler must resolve this against TOOLS.md to determine the maximum risk level. Implicit "all tools" delegation must produce a dedicated warning. _(Source: CFC-S02-F06)_
- **TRUST-ESCALATION severity is always error**: TRUST-ESCALATION must remain error severity even in advisory mode. It is a governance conflict that cannot be downgraded. _(Source: CFC-S02-F07)_
- **OBO-WITHOUT-ELICIT should be error severity**: R5 tools require fail-closed (non-negotiable). An R5/OBO tool without any elicitation policy contradicts the fail-closed invariant. OBO-WITHOUT-ELICIT should be error severity by default, not warning. Update the conflict table accordingly. _(Source: CFC-S03-F01)_
- **Multi-source conflict resolution for OBO**: OBO-WITHOUT-ELICIT detection must check 3 sources (TOOLS.md, SOUL.md, USER.md) before flagging. If any one provides coverage, the conflict is resolved. _(Source: CFC-S03-F02)_
- **Per-tool OBO conflict reporting**: Multiple R5/OBO tools without elicitation must produce one conflict per tool, not one aggregate conflict. _(Source: CFC-S03-F07)_
- **Transitive data flow tracing**: DATA-LABEL-MISMATCH detection must follow transitive data flows through the delegation graph (A->B->C), not just direct parent-child relationships. _(Source: CFC-S04-F01)_
- **Per-entry data access conflict checking**: DATA-LABEL-MISMATCH should check which specific data entries are accessible to the agent, not just the aggregate MEMORY.md label. _(Source: CFC-S04-F04)_
- **General cycle detection algorithm**: CIRCULAR-DELEGATION detection must use standard algorithms (DFS-based cycle detection) that find all cycles of any length (not just 2-node). The full cycle path must be reported. _(Source: CFC-S05-F01)_
- **Human review escalation path**: CIRCULAR-DELEGATION requires human review (same-cluster tension, no auto-resolve). The pipeline must halt with a clear message that human intervention is required to decide which delegation direction to keep. _(Source: CFC-S05-F02)_
- **Self-delegation detection**: The cycle detector must catch self-delegation (Agent A delegates to itself) as a degenerate cycle of length 1, including aliases. _(Source: CFC-S05-F04)_
- **Cycle-safe JSON serialization for delegation graphs**: The GovernanceIR serializer must detect delegation graph cycles and represent them as adjacency lists or reference markers, never as recursive JSON structures. _(Source: CFC-S05-F06)_
- **Skill tool reference extraction**: SKILL-TOOL-GHOST detection must parse natural language instructions in SKILL.md for tool references using name normalization and fuzzy matching ("use api-caller" / "invoke the API Caller tool" / "call api_caller()"). _(Source: CFC-S06-F01)_
- **Ghost tool aggregation**: When multiple skills reference the same ghost tool, the conflict report must aggregate across skills ("api-caller referenced by: [data-aggregator, report-builder] but not in TOOLS.md"). _(Source: CFC-S06-F06)_
- **Deterministic failure is always error**: When a conflict produces deterministic runtime failure (e.g., SCHEDULE-NO-APPROVAL: scheduled R5 tool with deny-default will always timeout), the severity must be error with no advisory mode exception. _(Source: CFC-S07-F01)_
- **Transitive tool resolution from schedules**: SCHEDULE-NO-APPROVAL detection must resolve the full chain: HEARTBEAT.md schedule -> workflow reference -> tool -> R5 classification. _(Source: CFC-S07-F03)_
- **Perpetual denial pattern detection**: When a scheduled R5 tool has no pre-authorization and the schedule runs during unattended hours, the compiler should flag it as a misconfiguration (perpetual denial), not just a conflict. _(Source: CFC-S07-F06)_
- **Tool alternative suggestions in conflict resolution**: When a schedule conflict exists, the compiler may suggest lower-risk tool alternatives if the workspace's tool set includes them (e.g., "save-report-draft" R3 instead of "send-report-email" R5). _(Source: CFC-S07-F04)_
- **Audit step sync/async design**: Governance audit steps injected by workflow inversion must use async audit by default. If audit chain append fails, the workflow must not block -- audit failures are handled asynchronously. _(Source: CP-S08-F04)_
- **First-step governance edge case**: If a workflow trigger step itself uses an R5 tool, governance injection before the first step requires a pre-workflow gate pattern. The workflow cannot start until approval is given. _(Source: CP-S08-F07)_

### Pitfall-Coverage-1 Constraints (S01-S10)

**BOM and Line Ending Normalization (S01)**:

- **Uniform BOM stripping across all 9 files**: BOM stripping must apply uniformly to ALL workspace files before any byte is consumed by the parser, not just files where BOM is detected. Inconsistent per-file BOM handling leaves some files with BOM-corrupted first lines. _(Source: PC1-S01-F01, PC1-S01-F02, P-100)_
- **BOM strip + line-ending normalization sequencing**: After BOM strip, CRLF normalization must run. If BOM is stripped but \r remains, the constraint text includes a trailing \r causing string comparison failures in ANALYZE. The normalization layer must sit between file I/O and both the parser and the hasher. _(Source: PC1-S01-F03, PC1-S01-F05)_
- **GovernanceIR hash from normalized content, not raw bytes**: The GovernanceIR hash must be computed from LF-normalized, BOM-stripped content. Raw working-tree bytes (which vary due to git core.autocrlf) must not be used for hashing. `claws diff` comparing working-tree hashes against git-stored hashes must use normalized content. _(Source: PC1-S01-F04, PC1-S01-F06, P-101)_
- **Internal normalization does not mutate source files**: BOM stripping and line-ending normalization are internal to the pipeline. Original files are never modified. The lossless round-trip guarantee is preserved because normalization is a read-path operation only. _(Source: PC1-S01-F08)_

**Parse Order Independence and Two-Pass Architecture (S02)**:

- **Deferred tool resolution is mandatory**: The parser must use two-pass (collect declarations in pass 1, resolve references in pass 2) or equivalent deferred resolution. Eager single-pass resolution causes forward-reference failures when AGENTS.md is parsed before TOOLS.md alphabetically. _(Source: PC1-S02-F01, P-102)_
- **File addition must not break existing compilations**: Adding a new file (e.g., HEARTBEAT.md) must never break previously working cross-references by changing alphabetical parse order. Order independence is a hard guarantee. _(Source: PC1-S02-F02)_
- **Extensible two-pass architecture**: The declaration collection phase must be extensible for future file types without modifying existing collectors. New declaration kinds plug into the same two-pass framework. _(Source: PC1-S02-F03)_
- **Deny-tool association across parse passes**: SOUL.md deny constraints referencing tools by name must be correctly associated with tools even if SOUL.md is parsed before TOOLS.md. The ANALYZE phase resolves deny-tool references after both passes complete. _(Source: PC1-S02-F04)_
- **Full reference graph for deferred resolution**: Deferred resolution must cover ALL files that reference tools -- AGENTS.md, SOUL.md, and HEARTBEAT.md all contain tool references. The deferred resolution is not AGENTS.md-specific. _(Source: PC1-S02-F05)_
- **Circular cross-file references**: Two-pass parsing naturally handles circular cross-file references (AGENTS.md references tools, TOOLS.md descriptions reference agents). Single-pass fails on whichever file is second. _(Source: PC1-S02-F07)_
- **Symbol table performance**: The pass-1 symbol table must be indexed by name for O(1) lookup. The 350ms latency budget applies to both passes combined. For 50+ tools and 20+ agents, O(n) scan is not acceptable. _(Source: PC1-S02-F08)_

**Collect-All-Errors Strategy (S09)**:

- **Per-file parser isolation**: Each file's parser must be independent. A failure in SOUL.md parsing must not corrupt parser state for TOOLS.md. Error collection requires the parser to continue across files after encountering errors. _(Source: PC1-S09-F01, PC1-S09-F02, P-108)_
- **Phase-gating with collected errors**: After collecting all parse errors, ANALYZE cannot run because the IR is incomplete. The pipeline halts after PARSE with a clear message: "N errors found -- analysis skipped." _(Source: PC1-S09-F03)_
- **Intra-file error recovery**: Within a single file, the parser must continue past the first error using recoverable parsing (skip to next heading, next tool block). Multiple errors per file are reported. _(Source: PC1-S09-F04)_
- **Per-file error limit**: A per-file error limit (default: 10 errors per file, then "...and N more") keeps output manageable for badly malformed files. _(Source: PC1-S09-F05)_
- **--fail-fast flag for CI/CD**: The default is collect-all-errors for interactive use. `--fail-fast` flag or `claws.json#errorMode: "fast"` provides single-error-halt for CI pipelines. _(Source: PC1-S09-F07)_

**Three-Way Conflict Detection (S03)**:

- **SCHEDULE-NO-APPROVAL three-way detection**: The ANALYZE phase must detect the three-way combination of (R4+ tool + scheduled execution + no pre-authorization). Each individual piece is valid alone; together they create guaranteed failure. _(Source: PC1-S03-F01, P-103)_
- **Perpetual denial applies to R4+ without pre-auth**: The detection must generalize beyond R5 to any tool where elicitation is required and no human is available. The risk threshold is configurable per workspace. _(Source: PC1-S03-F02)_
- **Compile-time detection prevents runtime dead loops**: The three-rings watch ring would detect repeated denials at runtime, but the doctor ring has no remediation for schedules. Compile-time detection is required to prevent this dead-end alerting loop. _(Source: PC1-S03-F07)_

**OBO-WITHOUT-ELICIT Severity Elevation (S04)**:

- **Risk-level-conditional conflict severity**: OBO-WITHOUT-ELICIT must be error for R5 (fail-closed invariant), warning for R3-R4 (fail-open possible). The conflict table needs risk-level-conditional severity. _(Source: PC1-S04-F01, PC1-S04-F03, P-104)_
- **Cross-spec invariant propagation**: CL-02 R5 fail-closed and CL-04 conflict severity must be consistent. If CL-02 says "R5 always fail-closed", CL-04 must not allow compilation of R5 tools without a fail-closed path. _(Source: PC1-S04-F02)_
- **Per-tool error reporting for OBO-WITHOUT-ELICIT**: Multiple R5/OBO tools without elicitation policies must each produce a separate error with individual remediation guidance. _(Source: PC1-S04-F07)_

**Implicit Delegation Resolution (S05)**:

- **'all' token must resolve to concrete tool list**: The IR must never contain the raw "all" token from AGENTS.md. `tools: all` must be resolved to the concrete tool list from TOOLS.md and the resolved list injected into the IR. _(Source: PC1-S05-F01, P-105)_
- **IMPLICIT-R4-DELEGATION warning category**: After resolving "all tools", any R4+ tool included via implicit delegation produces a dedicated IMPLICIT-R4-DELEGATION warning, distinct from TRUST-ESCALATION. _(Source: PC1-S05-F02)_
- **TOOLS.md change invalidates 'all' delegation**: Adding a new R5 tool to TOOLS.md silently grants it to every agent with `tools: all`. Incremental compilation must re-check agents with "all" delegation when TOOLS.md changes. _(Source: PC1-S05-F03)_

**Skill Phantom Tool Detection (S06)**:

- **Natural language tool reference extraction**: SKILL-TOOL-GHOST detection must parse natural language instructions in SKILL.md for tool references using pattern matching ("use the api-caller tool", "invoke api-caller", "call the api-caller"). _(Source: PC1-S06-F01, P-106)_
- **Structured requires_tools metadata**: Marketplace skills should declare required tools as structured metadata. If the skill has a `requires_tools` field, phantom detection is exact. Without it, fuzzy matching is the fallback. _(Source: PC1-S06-F02)_
- **Conservative phantom detection (all code paths)**: The compiler cannot determine code path activation at compile time. All tool references in skill instructions must be validated, not just those on active paths. _(Source: PC1-S06-F03)_
- **Tool name aliasing**: Fuzzy matching may miss aliases ("database-query" vs "db-query"). Exact tool names should be enforced at marketplace publish time. _(Source: PC1-S06-F04)_
- **Grouped phantom tool reporting across skills**: Multiple skills referencing the same phantom tool must be grouped in diagnostics by tool name, showing which skills need each tool. _(Source: PC1-S06-F05)_
- **Runtime phantom tool interception**: If a phantom tool is detected at compile time but deployed in advisory mode, the Gateway plugin should intercept the tool call and return a clear error instead of letting the agent hallucinate. _(Source: PC1-S06-F07)_
- **Skill update triggers recompilation**: After a marketplace skill update, `claws check` must re-validate tool references. The three-rings watch ring detects skill file changes and triggers recompilation. _(Source: PC1-S06-F08)_

**Catch Clause and Risk Map in EMIT (S10)**:

- **Catch clause is single point of failure**: The catch clause is the ONLY defense between governance evaluation failure and the Gateway's fail-open default. It must be as simple as a map lookup with a constant default. _(Source: PC1-S10-F01, P-109)_
- **Pre-computed risk map at handler registration**: The risk map is built once from GovernanceIR at handler registration time (not per-call). At call time, the catch clause does `riskMap.get(toolName) ?? 5`. Unknown tools default to risk 5 (fail-closed). _(Source: PC1-S10-F02)_
- **Unknown tool defaults to maximum risk**: The `?? 5` default (unknown = R5 = fail-closed) is critical. An unknown tool at runtime (added after compilation) must be treated as maximum risk. `?? 1` would be a security vulnerability. _(Source: PC1-S10-F03)_
- **Post-emit catch clause static verifier**: Post-emit verification must validate the catch clause AST. Allowed: Map.get, nullish coalescing, numeric comparison, return/throw. Disallowed: function calls (except Map.get), await, new, property access chains (length > 1), template literals. _(Source: PC1-S10-F04)_
- **Explicit null/undefined toolName handling**: The catch clause should explicitly handle null/undefined toolName as a hard deny (risk 5) before the map lookup, for clarity and safety. _(Source: PC1-S10-F05)_
- **Risk map immutability**: The risk map must be a frozen object (Object.freeze or ReadonlyMap) to prevent accidental mutation during the handler's lifecycle. _(Source: PC1-S10-F06)_
- **Defense-in-depth regardless of platform default**: The catch clause defense must not depend on the OC platform changing its fail-open default. Even if the platform eventually defaults to fail-closed, the catch clause remains as defense-in-depth. _(Source: PC1-S10-F07)_
- **Catch clause audit logging must not throw**: The catch clause must log the evaluation failure (toolName, risk level, original error, deny/allow decision) to the audit chain using a fire-and-forget pattern or pre-allocated log buffer that cannot throw. _(Source: PC1-S10-F09)_

## Constraints (continued): 8th Conflict Category

- **USER-TOOL-GHOST (potential 8th conflict category)**: USER.md may grant OBO scope for a tool not declared in TOOLS.md (e.g., USER.md grants "send email" authority but TOOLS.md has no send-email tool). This is a SKILL-TOOL-GHOST variant at the user authority level. Consider adding as an 8th conflict category or folding into referential integrity checks. _(Source: CP-S02-F03)_

## Pitfall-Coverage-2 Amendments (PC2-S01 through PC2-S15)

**Catch clause structural verification** (PC2-S01-F02 major): Post-emit static verification validates that the generated catch clause contains only a map lookup, block return, and stderr write. Allowed operations: Map.get, nullish coalescing, object literal return, process.stderr.write. Any function call, property access chain deeper than 2, or async keyword is a violation. This AST check is part of the emit phase, not a separate lint.

**Atomic staging directory protocol** (PC2-S02-F01 major, PC2-S02-F02 major, PC2-S02-F03 major): All artifacts write to `.claws/staging/` first. Only after all succeed does an atomic directory swap replace live artifacts. On any failure, staging is deleted. If the swap is interrupted (process kill, power loss) and `.claws/staging/` exists alongside live artifacts, live artifacts are authoritative and staging is deleted on next run.

**Cross-artifact classification validation** (PC2-S02-F04 major, PC2-S02-F05 major): Post-emit consistency validation compares tool classifications across all emitted artifacts. Same tool name, same risk level, same capabilities. Any mismatch triggers staging rollback. Error message identifies which artifact disagrees.

**Single authoritative classification source** (PC2-S02-F06 warning): Each artifact's classification is generated from the same authoritative classification table in the GovernanceIR. No artifact reads from a different IR path.

**Check post-hoc consistency detection** (PC2-S02-F07 warning): `claws check` on existing workspaces detects classification inconsistency in already-emitted artifacts (G-EMIT-CONSISTENT), not just staged ones.

**Workflow artifact inclusion in consistency checks** (PC2-S02-F09 warning): If a 4th artifact (lobster.compiled.yaml) is emitted, consistency validation includes ALL emitted artifacts including workflow handler names.

**exec-approvals.json schema version pinning** (PC2-S03-F01 major, PC2-S03-F02 major): The emit phase validates generated JSON against a pinned OC exec approval schema. Schema version tracked in claws.json (`execApprovalsSchema: "v2.1"`). Schema mismatches are hard errors blocking emission.

**PRESS safety keyword preservation** (PC2-S05-F01 major, PC2-S05-F02 major, PC2-S05-F03 major): The PRESS governance compression profile maintains a safety keyword allowlist: never, always, must, must not, prohibited, required, blocked, mandatory, under no circumstances. These survive compression verbatim. Compression quality validation checks that every safety keyword in the source appears in the compressed output within the same directive context.

**PRESS numeric threshold preservation** (PC2-S05-F07 warning): Numeric thresholds in governance directives (e.g., "$10,000") are preserved exactly during PRESS compression.

**Plugin loading order advisory** (PC2-S05-F04 major, PC2-S05-F06 warning): OC executes hooks in registration order. If another plugin registers before claws-governance, it can modify tool arguments before governance inspection. `claws check` produces CLAWS-W060 with explicit fix instructions. The warning notes pre-governance data exposure risk.

**Compound bypass via compression + plugin order** (PC2-S05-F09 warning): PRESS weakening a directive AND another plugin modifying the tool call before governance creates a compound bypass path.

**Node.js version detection and polyfill** (PC2-S06-F01 major, PC2-S06-F02 major): AbortSignal.timeout() requires Node 18+. Emit detects target Node version from: (1) claws.json `emit.nodeTarget`, (2) .node-version, (3) package.json engines.node, (4) process.version. For Node <18, a setTimeout-based polyfill replaces AbortSignal.timeout(). Polyfill clears timeout on successful completion to prevent memory leaks.

**TypeScript version targeting** (PC2-S06-F03 major, PC2-S06-F04 major): Emit targets configurable minimum TS version via `claws.json#emit.tsTarget` (default: ES2020 = TS 4.1+). A TS syntax compatibility matrix maps features to minimum versions. No `satisfies` keyword unless target >= TS 4.9.

**Pre-write TS syntax validation** (PC2-S06-F07 warning): Generated code is pre-validated by a lightweight AST parse with target compiler options before writing to disk.

**Node version advisory at init** (PC2-S06-F06 warning): `claws init` warns if detected Node version is below 18, explaining which features require polyfills and recommending upgrade.

**Platform-conditional polyfill** (PC2-S06-F10 warning): If the OC platform guarantees Node 18+, polyfills are skipped to prevent overhead.

**Shared handler name registry** (PC2-S08-F01 major, PC2-S08-F02 major, PC2-S08-F03 major): A shared handler name registry generates both workflow step references (kebab-case) and plugin exports (camelCase) from the same canonical name. The mapping is deterministic. Post-emit cross-reference checks verify every workflow handler has a corresponding plugin export.

**Handler name translation edge cases** (PC2-S08-F04 major): Numeric prefixes, consecutive hyphens, and acronyms (e.g., "a2a-trust-verify") have deterministic, tested translation. Edge-case suite covers all known patterns.

**Check post-hoc handler name validation** (PC2-S08-F05 warning): `claws check` loads both lobster.compiled.yaml and index.ts and cross-references handler names, accounting for naming convention translation.

**Exact match enforcement for handlers** (PC2-S08-F06 warning): Cross-reference check enforces exact matching regardless of platform resolution strategy.

**User-defined handler scope boundary** (PC2-S08-F07 warning): Cross-reference distinguishes claws-generated handlers (must match) from user-defined handlers (not in scope).

**Incremental build on lobster.yaml addition** (PC2-S08-F10 warning): If lobster.yaml is added to an existing workspace, incremental build detects the addition and regenerates both plugin and workflow artifacts.

**Unconditional deny-on-timeout generation** (PC2-S15-F01 major, PC2-S15-F02 major): Emit ALWAYS generates the deny-on-timeout override regardless of claws.json. If claws.json explicitly sets `approveOnTimeout: true`, the build fails with a hard error.

**ReadonlyMap enforcement in generated code** (PC2-S04-F06 warning): Generated code uses `Object.freeze()` or `ReadonlyMap<string, number>` for classification caches. Mutation attempts are TypeScript compilation errors.

**Hook timeout configuration threading** (PC2-S04-F01 major, PC2-S04-F02 major): `claws.json#performance.hookTimeoutMs` is threaded through to generated handler code at emit time.

## Pitfall-Final-1 Amendments (PF1-S01 through PF1-S26)

### PF1: BOM Handling and Encoding Normalization (P-100, P-129)

**Blanket BOM strip on all 9 files** (S01-F01 major, S01-F02 major): The parser MUST strip UTF-8 BOM (EF BB BF) uniformly from ALL workspace files before any byte is consumed, not selectively per-file. Selective stripping creates inconsistent parsing behavior where the parser works differently depending on which files have BOMs.

**BOM detection diagnostic in IR** (S01-F03 major): Even after stripping, the IR must include a BOM-detection diagnostic recording which files had BOMs. Silent stripping without audit trail hides operational issues. The dropped-constraint-without-warning failure mode is catastrophic because the operator believes governance is active.

**BOM-resilient re-save handling** (S01-F04 warning): Windows Notepad (pre-2019) defaults to UTF-8 with BOM. The BOM strip must work on re-saved files where the BOM is re-added after editing. Enterprise environments may produce BOM-prefixed files consistently.

**Source location adjustment after BOM strip** (S01-F05 major): BOM strip changes byte offsets. Source-location tracking (line:column diagnostics) must reference stripped positions (matching editor display), not raw byte positions. Column 1 in the stripped content is column 4 in the original bytes.

**Leading-only BOM strip** (S01-F06 warning): Strip only the leading BOM (first 3 bytes if EF BB BF). Do not scan for interior BOM sequences from concatenated fragments -- aggressive stripping corrupts content.

**GovernanceIR hash on normalized content** (S01-F07 major): Hash must be computed on BOM-stripped content, not raw file bytes. Same logical content must produce identical hashes regardless of BOM presence. The normalization layer sits between I/O and both the parser and the hasher.

**Multi-encoding BOM detection** (S20-F01 major): Handle UTF-8 (EF BB BF), UTF-16 LE (FF FE), UTF-16 BE (FE FF), and UTF-32 (FF FE 00 00 / 00 00 FE FF). For UTF-16/32, either transcode to UTF-8 and proceed, or reject with a clear error including iconv conversion command.

**Empty extraction validation** (S20-F02 major): SOUL.md with zero constraints produces a warning: "SOUL.md: no governance constraints found. Is the file encoding correct?" The silent zero-constraint outcome from encoding corruption is the worst failure mode.

**Null-byte UTF-16 detection heuristic** (S20-F03 major): Even without a BOM, detect UTF-16 by checking for null bytes in the first 100 bytes. UTF-8 text almost never contains null bytes; UTF-16 of ASCII has nulls on every other byte.

**Windows UTF-16 prevalence** (S20-F04 warning): PowerShell Out-File and certain Java libraries default to UTF-16 on Windows. Enterprise environments must handle this.

**Hash on transcoded content** (S20-F05 major): If the parser transcodes UTF-16 to UTF-8, hashing uses the transcoded UTF-8 content. Consistent with BOM stripping (P-100) and CRLF normalization (P-101) -- all normalization before hashing.

**UTF-16 claws.json rejection** (S20-F06 warning): JSON must be UTF-8 per RFC 8259. UTF-16 encoded claws.json should be rejected with error, not transcoded.

### PF1: Line Ending Normalization (P-101)

**LF normalization before hash** (S02-F01 major): All line endings normalized to LF before hashing. CRLF -> LF, CR -> LF, mixed endings -> LF. Applied uniformly to all 9 workspace files.

**Match git-stored representation** (S02-F02 major): claws hashes normalized (LF) content matching git-stored representation, not the working-tree representation (which may have CRLF from core.autocrlf).

**Hash version migration** (S02-F03 major): Stored baselines from before normalization (v0 hash) never match normalized hashes. Migration: re-hash all stored baselines on first run with normalization enabled. Store a hash-version field.

**Normalized diff with raw override** (S02-F04 warning): claws diff normalizes before comparison. A --raw flag bypasses normalization for users who need to see actual line-ending differences.

**Mixed line-ending normalization order** (S02-F05 major): CRLF->LF first, then CR->LF. Reverse order corrupts CRLF by converting CR first.

**Cross-OS fleet hash consistency** (S02-F06 warning): Without normalization, fleet compliance scans across mixed OS produce different hashes for semantically identical workspaces.

### PF1: Two-Pass Parsing Architecture (P-102)

**Two-pass parsing requirement** (S03-F01 major): Pass 1 collects all declarations across all files (agents, tools, skills, constraints), pass 2 resolves all cross-references. Guarantees parse order is irrelevant. IR records "resolved in pass 2" for traceability.

**Monotonic file addition invariant** (S03-F02 major): Adding a file ONLY ADDS constraints, never breaks existing ones. If any resolution behavior depends on order, the compilation is fragile. Hard invariant.

**Circular reference safety** (S03-F03 major): Circular cross-references are valid in two-pass. Pass 1 collects, pass 2 resolves from the collected set -- no recursion. Must not stack-overflow.

**Incremental compilation dependency invalidation** (S03-F04 warning): If TOOLS.md changes, AGENTS.md references must be re-resolved. Incremental compilation invalidates dependent files when a declaration file changes.

**Unresolved reference diagnostics** (S03-F05 major): For "tool not declared anywhere," list available tools with edit-distance suggestions. The two-pass system eliminates "tool declared but not yet parsed" confusion.

**NL reference extraction in pass 1** (S03-F06 warning): SKILL.md NL tool references must be extracted in pass 1 so phantom detection participates in two-pass resolution.

### PF1: HEARTBEAT x Elicitation Cross-Reference (P-103)

**HEARTBEAT x elicitation cross-reference** (S04-F02 major): The ANALYZE phase cross-references HEARTBEAT.md schedules against elicitation policy in claws.json. A scheduled tool with an elicitation requirement is a conflict. Requires two-pass architecture (P-102).

**Three-option remediation** (S04-F06 warning): Error message includes: "Add pre-auth for tool in claws.json, or remove it from HEARTBEAT.md, or lower its risk level below R4."

### PF1: OBO-WITHOUT-ELICIT Severity Alignment (P-104)

**Cross-spec severity inconsistency** (S05-F01 major): OBO-WITHOUT-ELICIT at warning severity for R5 tools creates a deployable artifact that is functionally dead for R5 operations. Worse than compile error because it wastes deployment time.

**Risk-conditional severity** (S05-F02 major): Error for R5 (blocks build), warning for R3-R4 (allows build, degraded but functional). Matches invariant hierarchy.

**Strict mode escalation** (S05-F03 major): --strict escalates ALL OBO-WITHOUT-ELICIT to error regardless of risk level for enterprise deployments.

**R5-specific error explanation** (S05-F04 warning): Error message explains WHY it is an error: "send-payment is R5 with OBO delegation but no elicitation policy. R5 fail-closed will permanently deny this tool at runtime."

**Dual spec amendment** (S05-F05 major): Both CL-02 and CL-04 must be amended for cross-spec invariant propagation.

**Effective fail-mode in severity** (S05-F06 warning): R4 tools with OBO: if workspace overrides R4 to fail-open, warning is appropriate. If R4 is fail-closed, it should be error. Severity considers effective fail mode, not just risk level.

### PF1: Implicit Delegation Resolution (P-105)

**Implicit delegation resolution** (S06-F01 major): Compiler resolves "all" to concrete list of tools at compile time and injects resolved list into IR. Not "all" but [web-search, doc-reader, send-payment].

**IMPLICIT-R4-DELEGATION warning** (S06-F02 major): Fires when resolved list includes any R4+ tool, with specific tool names and risk levels.

**TOOLS.md invalidates all agents** (S06-F03 major): Adding R5 tool to TOOLS.md triggers re-compilation of all agents with "tools: all." Incremental compilation tracks dependency.

**Compiled vs runtime tool set drift** (S06-F04 warning): Emitted Gateway plugin's runtime configuration can verify actual tool set matches compiled tool set. New tools at runtime flagged as unresolved delegation.

**Nested 'all' delegation chain** (S06-F05 major): Nested delegation compounds. Warning chains: "sub-coordinator inherits R5 tools via coordinator's 'all' delegation."

**Explicit delegation suggestion** (S06-F06 warning): Suggest explicit enumeration: "tools: [web-search, doc-reader]" with resolved list for copy-paste.

### PF1: NL Tool Reference and Phantom Detection (P-106)

**NL tool reference extraction** (S07-F01 major): Pattern matching for "use the X tool," "call X," "invoke X," "run X." Operates on SKILL.md prose. Better to warn on a non-tool than miss a phantom reference.

**Tool alias suggestions** (S07-F02 major): Compute edit distance or token overlap. SKILL-TOOL-GHOST includes "did you mean db-query?" when edit distance below threshold (3 edits).

**Grouped phantom reporting** (S07-F03 major): Multiple skills referencing same phantom tool grouped in one entry with all skill sources, not N separate entries.

**Marketplace requires_tools metadata** (S07-F04 warning): If present, compiler uses structured metadata instead of NL extraction. NL is fallback. Warn if marketplace skill lacks requires_tools.

**Code block exclusion** (S07-F05 major): NL extractor skips fenced code blocks (triple backtick) and inline code spans. Code examples are not tool references.

**NL false positive filtering** (S07-F06 warning): If extracted "tool name" contains determiners/prepositions (the, in, from), it is likely a description, not a tool name.

**NL extraction timing** (S07-F07 warning): Runs during pass 1 (declaration collection) so phantom detection benefits from full declaration set in two-pass resolution.

### PF1: Transitive Data Flow Labels (P-107)

**Transitive chain violation path** (S08-F02 major): Violation identifies specific breaching edge, propagated label, and violated ceiling. Shows full path: root-agent [CONFIDENTIAL] -> research-agent [CONFIDENTIAL] -> public-reporter [PUBLIC: VIOLATION].

**Delegation graph traversal efficiency** (S08-F05 warning): Topological sort followed by single forward pass is O(V+E). For 20+ agent enterprise workspaces.

### PF1: Collect-All-Errors Default (P-108)

**Collect-all-errors default** (S09-F01 major): Each file parsed independently. Failure in SOUL.md does not prevent parsing of TOOLS.md. Developer fixes all errors in one editing session.

**Per-file parser isolation** (S09-F02 major): Each file gets its own parser instance. Fatal error (OOM) in one parser does not crash others. Orchestrator records per-file fatal errors.

**Intra-file error recovery** (S09-F03 major): After parse error at line 3, parser resynchronizes at next constraint boundary ("Never," "Always," section header) to reveal error at line 7.

**Per-file error limit** (S09-F04 warning): Default 10 errors per file prevents cascading error floods from single structural error.

**--fail-fast for CI/CD** (S09-F05 major): Explicit opt-in for halt-on-first-error mode. CI values speed over completeness.

**JSON error position** (S09-F06 warning): claws.json parse errors include exact line/column, not just "invalid JSON."

**Grouped error output** (S09-F07 warning): Errors grouped by severity then by file. Summary: "27 errors in 9 files. Fix errors before warnings."

### PF1: Catch Clause Safety (P-109)

**Pre-computed ReadonlyMap** (S10-F02 major): Risk map built once from GovernanceIR at registration time. At call time: `riskMap.get(toolName) ?? 5`. Eliminates all runtime computation from catch path.

**Catch clause AST verification whitelist** (S10-F04 major): Allowed: Map.get, nullish coalescing (??), numeric comparison, return, throw. Disallowed: function calls (except Map.get), await, new, property chains (>1), template literals. Verifier runs on emitted TypeScript before writing to disk.

**Risk map immutability** (S10-F06 warning): Object.freeze or ReadonlyMap prevents mutation during handler lifecycle from race conditions or other plugins.

**Non-throwing log in catch** (S10-F07 warning): Audit logging in catch must not throw. Use fire-and-forget: `try { log(...) } catch {}` or pre-allocated log buffer.

### PF1: Same-Volume Staging (P-120)

**Staging in .claws/staging/** (S11-F01 major): Staging directory MUST be on same filesystem as workspace. `.claws/staging/` guarantees same-volume. `os.rename()` on same-volume is atomic on POSIX and Windows.

**Cross-volume move never atomic** (S11-F02 major): Windows cross-volume is copy+delete (4 non-atomic operations). Power failure between WriteFile and DeleteFile leaves both copies.

**Partial emit false confidence** (S11-F03 major): SKILL.md present + index.ts absent = advisory without enforcement. Worse than no governance because operator believes protection exists.

**Volume identity verification** (S11-F04 warning): Symlinks/junction points can make paths appear same-volume. Verify via GetVolumeInformation (Windows) or stat.st_dev (POSIX).

**Network share handling** (S11-F05 warning): UNC paths may not support atomic rename. Detect network paths and refuse or use two-phase commit protocol.

**Staging directory creation** (S11-F06 major): .claws/staging/ must be created with mkdir -p semantics before writing. Handle concurrent builds (EEXIST is not an error).

### PF1: Orphaned Staging Recovery (P-121)

**Orphaned staging recovery protocol** (S12-F01 major): On startup, EMIT checks for .claws/staging/ existence. If present with artifacts: (1) validate checksums, (2) if valid complete move, (3) if invalid delete staging and rebuild.

**Crash marker protocol** (S12-F02 major): .claws/staging/.in-progress marker written at staging start, removed after atomic move. Presence on next build = orphaned staging.

**Staging manifest checksum** (S12-F03 major): .claws/staging/manifest.sha256 validates completeness. Missing or mismatched checksums = delete and rebuild.

**Minimize vulnerable window** (S12-F04 warning): Write all artifacts, compute manifest, then single rename. Everything before rename is non-critical.

**Concurrent build lock** (S12-F05 warning): .claws/build.lock with PID prevents concurrent builds. Stale lock (dead PID) can be claimed.

**Crash recovery notification** (S12-F06 major): Diagnostic: "Detected orphaned staging from previous build. Artifacts validated. Completing move." Silent recovery hides operational issues.

### PF1: SKILL.md Directive Preservation Under PRESS (P-122, P-128)

**Frozen keyword set** (S13-F01 major, S19-F01 major): NEVER, ALWAYS, MUST, PROHIBITED, REQUIRED, BLOCKED, FORBIDDEN are immune to synonym replacement during PRESS compression. These keywords have governance semantics mapping to risk levels.

**Directive-level preservation** (S13-F02 major, S19-F02 major): Full sentence containing frozen keyword preserved verbatim. "NEVER access production databases without explicit approval" cannot be shortened. Surrounding non-critical text can be compressed.

**Keyword count validation gate** (S13-F03 major, S19-F03 major): Before and after compression, count each frozen keyword. If any count decreases, build fails: "PRESS compression lost 1 instance of NEVER (pre: 3, post: 2). Directive dropped at line 47." Hard gate, not warning.

**Directive-to-risk mapping table** (S13-F04 warning): NEVER -> R5, PROHIBITED -> R5, BLOCKED -> R5, MUST -> R4, REQUIRED -> R4, ALWAYS -> R3. Defined in spec, not inferred.

**Three-source consistency check** (S13-F05 major): SKILL.md directives, TOOLS.md risk levels, and exec-approvals.json blocked/allowed must all agree. CLASSIFICATION-MISMATCH fires on disagreement.

**Compression-level-aware validation** (S13-F06 warning): Aggressive PRESS (target < 8K) is high-risk. Consistency check more strict for aggressive compression levels.

**Multi-keyword sentence preservation** (S13-F07 warning): "NEVER EVER access" and "MUST ALWAYS confirm" -- both keywords preserved. Deduplication must not merge duplicate-adjacent keywords.

**Frozen keyword case preservation** (S19-F04 major): "NEVER" must not become "Never" or "never." LLMs are sensitive to capitalization patterns.

**Negation-aware frozen keywords** (S19-F05 warning): "NOT PROHIBITED" should not freeze PROHIBITED. Heuristic: keyword preceded by "not," "no," or "isn't" is negation, not directive.

**PRESS compression ratio reporting** (S19-F06 warning): Report how much non-directive vs directive text compressed. If directives are 80%, effective compression only 20%.

**Multilingual frozen keyword set** (S19-F07 major): French JAMAIS, German NIE, Spanish NUNCA included for multilingual workspaces. Base English set always included; language extensions additive.

### PF1: OBO Elicitation Migration (P-123)

**Actionable migration snippet** (S14-F01 major): Error includes complete copy-pasteable claws.json snippet: `{ elicitation: { send-payment: { mode: 'confirm', timeout: 30000 } } }`.

**Severity change explanation** (S14-F02 major): "OBO-WITHOUT-ELICIT was elevated from warning to error in claws v2.0.0. R5 tools with OBO now require explicit elicitation policy. Prevents deployable artifacts with permanently denied tools (see P-104)."

**Automated migration command** (S14-F03 major): `claws migrate --obo-elicit` adds default elicitation policies (mode: confirm, timeout: 30000) for all R5/OBO tools.

**Grouped migration errors** (S14-F04 warning): "15 R5/OBO tools lack elicitation policy: [send-payment, wire-transfer, ...]. Run 'claws migrate --obo-elicit'."

**Compatibility mode** (S14-F05 major): `--compat v1` temporarily downgrades OBO-WITHOUT-ELICIT to warning. Deprecated in v3.0.0. Gives teams migration time.

**Breaking change prominence** (S14-F06 warning): Changelog must list this as BREAKING CHANGE. Error message compensates for missed changelogs.

### PF1: Tool Name Normalization (P-130)

**Pipeline-wide tool name normalization** (S21-F01 major): All tool references across all files normalized (lowercase, hyphens, strip whitespace) before cross-referencing. "send_payment" normalizes to "send-payment."

**Edit distance suggestions** (S21-F02 major): "Elicitation policy targets 'send_paymnet' which does not exist. Did you mean 'send-payment'?" Threshold default: 3 edits.

**Cascading cause-effect diagnostic** (S21-F03 major): "send-payment has no elicitation policy (OBO-WITHOUT-ELICIT). However, policy exists for 'send_payment' (edit distance 1). Policy likely targets send-payment but has misspelled name."

**Orphaned policy detection** (S21-F04 major): Policies targeting non-existent tools reported even without misspelling. "Policy for 'old-tool' targets tool not declared in TOOLS.md."

**Orphaned R5 policy escalation** (S21-F05 major): Orphaned R5 policy = error (developer INTENDED to govern R5 tool but made typo). Orphaned R1-R2 = warning.

**Naming convention normalization** (S21-F06 warning): Handle camelCase, snake_case, kebab-case, PascalCase. All normalize to kebab-case (OC convention).

**Auto-fix command** (S21-F07 warning): `claws fix --normalize` fixes misspelled tool names in claws.json via normalization + edit-distance matching.

### PF1: Trust Tier Per-Target (P-131)

**Trust tier source in error messages** (S22-F03 major): "R5 tool exceeds trust tier T2 (default, trustTier not specified in claws.json)" vs "T2 (core, from claws.json line 3)."

**Default trust tier explanation** (S22-F04 warning): Error: "trustTier defaults to T2 when not specified. To allow R5 tools, set trustTier: T4 or higher in claws.json."

### PF1: All-or-Nothing Staging Protocol (P-133)

**All-or-nothing staging** (S24-F01 major): All artifacts written to .claws/staging/ first. No artifact written to workspace until all generated and validated. If any fails, staging cleaned up.

**False confidence prevention** (S24-F02 major): SKILL.md + missing index.ts = advisory without enforcement. Worse than no governance. Atomic protocol eliminates this.

**Post-staging validation checklist** (S24-F03 major): (1) SKILL.md non-empty with frozen keywords, (2) index.ts compiles without TypeScript errors, (3) exec-approvals.json valid JSON with schema, (4) workflow.ts compiles. Any failure = rollback.

**Last-known-good preservation** (S24-F04 warning): Failed build keeps previous artifacts in workspace. "Build failed. Workspace retains previous build artifacts (last successful: timestamp)."

**Consistency validation in staging** (S24-F05 major): Cross-artifact consistency check runs in staging before atomic move. Catches P-134 mismatches at staging time.

**Staging cleanup on failure** (S24-F06 warning): Cleanup is best-effort. If cleanup fails, next build's orphan detection (P-121) handles it.

### PF1: Cross-Artifact Classification Validation (P-134)

**Cross-artifact consistency validation** (S25-F01 major): Post-emit comparison of risk levels across all artifacts for every tool. Any mismatch triggers staging rollback.

**IR as single source of truth** (S25-F02 major): All artifacts derive risk from GovernanceIR. If exec-approvals.json has different risk, the generator has a bug (stale data).

**Directive mapping from IR** (S25-F03 major): SKILL.md directive-to-risk mapping uses same risk values as IR. Mapping table generated from IR, not separate configuration.

**Side-by-side classification display** (S25-F04 warning): "write-db mismatch: SKILL.md=R3, exec-approvals=R5, plugin=R3. GovernanceIR classifies write-db as R3."

**Incremental emit invalidation on risk change** (S25-F05 major): If any risk level changes in IR, all artifacts re-generated. Incremental emit must not retain stale risk classifications.

**Runtime startup consistency check** (S25-F06 warning): Gateway plugin validates its classifications against exec-approvals.json at startup. Logs warning on drift.

### PF1: exec-approvals.json Schema Validation (P-135)

**Schema validation for exec-approvals.json** (S26-F01 major): Validate against pinned OC platform JSON schema (versioned, e.g., "2026.4"). Catches field name mismatches, type mismatches, missing required fields before writing.

**Template correctness** (S26-F02 major): "deny" vs "blocked" mismatch is a template bug. Schema validation catches this class of bug.

**Platform schema version pinning** (S26-F03 major): Pin to specific platform schema version. `claws doctor --post-upgrade` checks if pin matches installed platform version.

**Compensating for platform leniency** (S26-F04 warning): OC platform ignores unknown fields (lenient JSON). claws compensates with strict compile-time schema validation.

**Round-trip schema verification** (S26-F05 major): Read generated exec-approvals.json back from staging and validate against schema. Catches serialization bugs (prototype pollution, key ordering).

**Expected vs actual field names** (S26-F06 warning): Error: "field 'deny' not recognized. Expected: 'blocked' (per OC platform spec 2026.4). Change 'deny: true' to 'blocked: true'."

**Version-specific artifact generation** (S26-F07 warning): `claws build --target-platform-version 2026.3` generates artifacts compatible with specific version for staged fleet upgrades.

## Pitfall-Final-2 Amendments (PF2-S01 through PF2-S26)

**Atomic rules.json write** (PF2-S01-F07 warning): Build process uses atomic file replacement (write .tmp, rename) for rules.json. Prevents race condition where handler reads partial file during `claws build`.

**Advisory-only governance gap from partial emit** (PF2-S02-F01 major): SKILL.md without index.ts is advisory only. OC agent may read instructions but cannot be enforced. Staging protocol: all artifacts to .claws/staging/ first, atomic swap only after all validate.

**Staging directory protocol** (PF2-S02-F02 major): All artifacts emit to .claws/staging/. After schema, cross-reference, and structural checks pass, promoted to .claws/compiled/ in single atomic move. Any failure = entire staging directory rolled back.

**Rollback preserves prior compilation** (PF2-S02-F03 major): Failed emit does NOT delete previous valid .claws/compiled/ artifacts. Staging cleaned but compiled directory untouched. Governance continuity during failed recompilations.

**Binary success/failure reporting** (PF2-S02-F04 major): Build output clearly distinguishes "build succeeded" (all promoted) from "build failed" (staging rolled back). Partial success message misleading. Exit code non-zero on any artifact failure.

**Staging cleanup on failure** (PF2-S02-F05 major): Staging directory cleaned on failure so partial artifacts not available for manual extraction.

**Artifact dependency graph** (PF2-S02-F06 warning): exec-approvals.json depends on index.ts depends on SKILL.md. Cross-artifact dependency validated. All or nothing.

**Template error diagnostics** (PF2-S02-F07 warning): TypeScript template errors produce diagnostic pointing to specific binding that failed. Template errors often from workspace-specific configurations (unusual tool names, special characters).

**Cross-artifact classification mismatch** (PF2-S03-F01 major, PF2-S03-F02 major): Post-emit consistency validator extracts risk classification from each artifact for every tool and verifies identical. Multi-format extraction: SKILL.md prose markers, exec-approvals.json JSON fields, plugin riskMap constant.

**Full artifact regeneration on classification change** (PF2-S03-F03 major): User changes tool from R3 to R5 in claws.json overrides: recompilation updates ALL artifacts. Stale artifact from prior compilation mixed with new creates mismatch.

**Mismatch staging rollback diagnostic** (PF2-S03-F05 major): Diagnostic lists every tool with mismatched classifications. Format: tool name, per-artifact levels, recommended action.

**exec-approvals field name correctness** (PF2-S04-F01 major): OC platform silently ignores unrecognized fields ("deny" vs "blocked"). Emit validates against pinned OC platform schema. Unrecognized field = hard error.

**Schema validation against pinned OC spec** (PF2-S04-F02 major): Schema version in claws.json (ocPlatformVersion). Upgrading platform version triggers revalidation of all artifacts.

**Integration verification of enforcement** (PF2-S04-F04 major): Post-emit integration testing verifies blocked tools actually blocked at platform level. Silent field ignoring produces valid JSON platform accepts without error.

**Template field name from schema constants** (PF2-S04-F05 major): Emit template uses exact field names from pinned schema, not semantic equivalents. Template literals reference schema constants, not hardcoded strings.

**Fleet template correctness** (PF2-S04-F07 warning): Schema mismatch in emit template affects every workspace compiled with that claws version. Template correctness is fleet-wide safety property.

**hookTimeoutMs injection not hardcoded** (PF2-S05-F01 major): Emit template uses configured hookTimeoutMs, not hardcoded default. Generated `AbortSignal.timeout(N)` matches claws.json.

**Post-emit timeout value verification** (PF2-S05-F02 major): Post-emit extracts timeout from generated AbortSignal.timeout(N) and compares against claws.json hookTimeoutMs. Mismatch = hard build error.

**hookTimeoutMs default documentation** (PF2-S05-F03 major): If hookTimeoutMs not configured, emit uses documented default (100ms) explicitly. Generated code never contains unexplained magic number.

**Platform timeout interaction warning** (PF2-S05-F07 warning): Warn if hookTimeoutMs > platform handlerTimeout. Gateway kills handler before claws timeout fires.

**PRESS safety keyword allowlist** (PF2-S07-F01 major, PF2-S07-F02 major): Allowlist: ["never", "must not", "shall not", "always", "must", "shall", "required", "prohibited", "forbidden", "mandatory"]. Any token on list preserved verbatim. Configurable for domain-specific terms.

**Context-aware keyword detection** (PF2-S07-F03 major): Semantic context, not just token presence. "Never mind" not a safety keyword. Verify keyword in imperative sentence directed at agent.

**Post-compression safety keyword audit** (PF2-S07-F04 major): Compare original and compressed SKILL.md for safety keyword count. Absent keyword in compressed = hard build error, not warning.

**Negation preservation** (PF2-S07-F05 major): "do not delete user data" must not compress to "delete user data carefully." Detect negation patterns and preserve entire negated phrase.

**Safety precedence over compression ratio** (PF2-S07-F06 warning): If preserving keywords limits compression to 25% instead of 40%, accept lower ratio. Safety takes absolute precedence.

**Domain-specific safety terms** (PF2-S07-F07 warning): Workspace operators extend allowlist via claws.json press.safetyKeywords. Default: RFC 2119 + common prohibition language.

**Plugin ordering check analysis** (PF2-S08-F02 major): Check analyzes plugins array and warns CLAWS-W060 if any plugin before claws governance handler. Names plugin, position, risk.

**Node 16 AbortSignal.timeout polyfill** (PF2-S09-F01 major, PF2-S09-F02 major): AbortSignal.timeout() requires Node 18+. Emit detects target from claws.json nodeTarget, .nvmrc, package.json engines, or process.version. For Node <18: setTimeout polyfill, inline, no external dependency.

**TS version syntax compatibility matrix** (PF2-S09-F03 major, PF2-S09-F04 major): satisfies (4.9+), const type params (5.0+), using declarations (5.2+). Target from claws.json tsTarget. Above-target features replaced with compatible alternatives. No compatible replacement = clear error naming minimum TS version.

**satisfies keyword replacement for TS 4.7** (PF2-S09-F05 major): Replace with `as const` assertions or explicit annotations maintaining same type safety.

**Node version auto-detection cascade** (PF2-S09-F06 warning): claws.json nodeTarget > .nvmrc > .node-version > package.json engines.volta. Absent all signals: default Node 16 (most conservative).

**Inline polyfill, no external dependency** (PF2-S09-F07 warning): Polyfill inline in generated handler. No supply chain risk. Controller + setTimeout + cleanup.

**Fleet version matrix** (PF2-S09-F08 warning): `claws fleet scan` reports Node/TS version matrix. Flags incompatible workspaces. Fleet-wide compilation uses lowest common denominator or per-workspace targeting.

**Workflow-plugin handler name cross-reference** (PF2-S12-F01 major, PF2-S12-F02 major): Two naming conventions (kebab-case workflow, camelCase plugin) collide. Shared handler name registry maps every name to canonical form. Mismatch = hard build error.

**Canonical handler name convention** (PF2-S12-F03 major): Defined canonical form. If kebab-case, plugin export uses string alias. All references normalized.

**Bidirectional handler resolution** (PF2-S12-F04 major): Every workflow reference verified against plugin exports. Every plugin export referenced by workflow verified. Both directions checked.

**Case-sensitive handler resolution assumption** (PF2-S12-F05 major): Emit assumes case-sensitive resolution (stricter behavior) regardless of platform.

**Handler name collision detection** (PF2-S12-F06 warning): Two plugins exporting same normalized handler name = build failure.

**Multi-plugin handler registry** (PF2-S12-F07 warning): Registry includes ALL handler exports from ALL plugins, not just claws-generated ones. Requires parsing all plugin index.ts files.

**Unconditional deny-on-timeout generation** (PF2-S23-F02 major): Emit ALWAYS generates deny-on-timeout. `approveOnTimeout: true` = OC-POLICY-E042 build failure.

**Platform-version-independent timeout override** (PF2-S23-F06 warning): Generated handler always includes deny override regardless of platform version. Defends against version regression.

**Post-emit timeout handler verification** (PF2-S23-F07 warning): Post-emit AST check verifies timeout handler exists AND returns block: true. Template bug omitting handler reverts to platform default.

**Redaction routing in generated handler** (PF2-S16-F05 major): Per-channel redaction matrix configured at compile time. Generated handler routes PII through channel-specific redaction function. Unknown channel = full redaction.

**Output path redaction coverage verification** (PF2-S16-F07 warning): Post-emit checks every output path includes channel-specific redaction call. Missing path = data leak.

## Anubis-Thoth Amendments

### Three-Ring Governance

**Skill-file dependency extraction for SKILL-TOOL-GHOST detection** _(Source: TR-S06-F01)_: The PARSE phase must extract tool-to-skill dependency mappings from skill files (SKILL.md). Without parsing skill files, the compiler cannot build the dependency graph needed to detect SKILL-TOOL-GHOST conflicts (a tool removed from TOOLS.md that is still referenced by a skill). Either skill-file parsing is added to the compilation pipeline or dependency declarations are mirrored in one of the 9 workspace files.

**SKILL-TOOL-GHOST consistency across detection surfaces** _(Source: TR-S06-F06)_: SKILL-TOOL-GHOST is detected in two places: the full compile pipeline (CL-04) and the inner ring file-save watcher (CL-05). Both surfaces must produce identical results — same severity, same message, same rule ID. Divergent diagnostics depending on whether the developer saved a file or ran a full compile are unacceptable.

**doctor --fix vs lossless guarantee explicit carve-out** _(Source: TR-S02-F11)_: The `doctor --fix` command modifies workspace files, which conflicts with the lossless constraint (claws never modifies original files). The spec must explicitly carve out `doctor --fix` from the lossless guarantee, or require it to write migrated files to a staging area for user approval rather than modifying source files in place.

### Fleet Operations

**Fleet context input for inherited policy resolution in ANALYZE** _(Source: FO-S08-F01)_: The ANALYZE phase must accept fleet context as input alongside workspace-level files to resolve inherited policies. When a workspace elicitation policy is absent, the compiler must resolve it from the fleet template. This extends the 9-file compilation model to a 9+fleet compilation model, where fleet context provides fallback values for unspecified local policies.

**Governance plugin marker for fleet scan identification** _(Source: FO-S09-F07)_: The EMIT phase must include a metadata marker (`__claws_governance: true`) in the emitted governance plugin. Fleet scan uses this marker to locate the governance plugin regardless of filename or plugin name, enabling reliable workspace discovery without filename conventions.

**Fleet inheritance metadata in GovernanceIR** _(Source: FO-S08-F10)_: The GovernanceIR must record which policies were inherited from fleet templates versus defined locally. This metadata enables `claws diff` to show the transition from fleet-managed to self-managed governance and supports fleet drift detection by distinguishing local overrides from inherited baselines.

### Snapshot Lifecycle

**Deterministic IR serialization for hash comparison** _(Source: SL-S01-F03)_: GovernanceIR serialization must be canonical and deterministic — no timestamps, no random IDs, no insertion-order-dependent fields. When a snapshot is saved and restored, the restore-then-compile cycle must produce an identical hash to the saved hash. Non-deterministic serialization (whitespace, key ordering differences) causes spurious hash mismatches even when content is identical.

### OBO Elicitation

**Deny-on-timeout unconditionally generated in EMIT** _(Source: OE-S02-F03)_: The EMIT phase must unconditionally generate deny-on-timeout behavior in the elicitation handler. Platforms that inject approve-on-timeout behavior outside of claws configuration are overridden by the generated handler. This is defense in depth: compile-time rejection of `approveOnTimeout: true` in claws.json AND runtime enforcement in the generated code, regardless of platform-level configuration.

**FE6 compile-time nested OBO delegation detection** _(Source: OE-S03-F03)_: At compile time, FE6 must detect static delegation chains where an agent with delegated R5/OBO tools further delegates to subagents. The compiler flags AGENTS.md configurations with nested delegation of R5 tools. Runtime delegation (dynamically spawned subagents) is invisible at compile time and handled separately by the runtime single-hop enforcement.

### A2A Governance

**Transitive flow analysis performance budget** _(Source: A2A-S04-F09)_: Transitive data flow label propagation through the delegation graph can grow exponentially with graph size. The ANALYZE phase must use BFS with a visited set to avoid exponential blowup and cap depth at the G-A2A-ESCALATE chain depth limit. All transitive flow analysis must complete within the 200ms ANALYZE phase budget.

**Reclassification before delegation ceiling evaluation ordering** _(Source: A2A-S05-F09)_: The compiler must apply all data flow reclassifications (`declassify` annotations) before evaluating delegation ceilings. Ordering matters: first apply all reclassifications, then evaluate delegation ceilings against the reclassified labels. Evaluating ceilings against pre-reclassification labels produces false positives.

### Injection Defense

**Guardrail Sandwich layers fire at different chain steps** _(Source: ID-S06-F03)_: The Guardrail Sandwich (G-INPUT, G-CONTEXT, G-BOUND, G-OUTPUT) is not a single-pass sequential filter. In a multi-tool chain attack, each layer fires at different points: G-INPUT on external tool output (step 1), G-CONTEXT on context loading (step 2), G-BOUND throughout (steps 1-N), and G-OUTPUT on the final action (step N). The compilation pipeline must model the sandwich as a distributed set of checkpoints across the tool chain, not a linear sequence.

**Static taint analysis for tool chain risk paths in ANALYZE** _(Source: ID-S06-F09)_: The ANALYZE phase must perform static taint analysis on the tool manifest to identify potential high-risk chains (external-data-source tool leading through any path to an R5 OBO tool). These chains are flagged as requiring runtime chain validation. This compile-time chain analysis is analogous to taint analysis in static code analyzers and is defined as a compile-time check within G-OUTPUT-04.

**Cross-reference G-SUPPLY as prerequisite for G-CONTEXT skill isolation** _(Source: ID-S02-F09)_: G-CONTEXT skill isolation (Layer 2 boundary markers) assumes skills are trusted (trust: SYSTEM). A compromised skill could inject content that breaks the Layer 2/Layer 3 boundary. The compilation pipeline must cross-reference G-SUPPLY skill verification (signing) as a prerequisite for G-CONTEXT skill isolation — skill isolation is only effective if skill integrity is verified.

### Lossless Round-Trip

**Write-allow-list enforcement mechanism in EMIT** _(Source: LR-S01-F01)_: The EMIT phase must enforce a write-allow-list of permitted output paths (skills/claws-governance/, plugins/claws-governance/, exec-approvals.json, lobster.compiled.yaml, .claws/). Any write to a path not on the allow-list is a lossless violation. This prevents code bugs from accidentally writing to source files (e.g., SOUL.md instead of SKILL.md).

**Reserved directory name for generated governance skill** _(Source: LR-S01-F02)_: The generated governance skill directory name (claws-governance) must be reserved and collision-checked against existing skill directories. If the emit path resolution is relative and the skill name collides with a user-authored skill directory, the emit would overwrite user content.

**Read-only file handle requirement for source files** _(Source: LR-S01-F03)_: The pipeline must use read-only file handles for all 9 source files during PARSE. Even opening a file with write access can update mtime on some operating systems (including Windows last-access time), triggering downstream file change detection tools (make, webpack, etc.) for unchanged files.

**Ownership comment header in generated exec-approvals.json** _(Source: LR-S01-F04)_: exec-approvals.json is a compiler-managed output artifact that modifies an existing host-level file. The emitted file must include a comment header ("// Generated by claws -- do not edit") to clarify ownership, since developers may not realize exec-approvals.json is compiler-managed and may manually edit it.

**Compiled workflow detection to prevent feedback loops** _(Source: LR-S01-F05)_: The PARSE phase must detect and reject compiled workflows as source input. If a developer renames lobster.compiled.yaml to lobster.yaml (removing the .compiled suffix), the next compilation reads the compiled version as source, creating a feedback loop where governance injection compounds across compilations.

**Raw-byte SHA-256 for lossless verification** _(Source: LR-S01-F06)_: The lossless verification hash must use raw file bytes, not parsed content. If the parser normalizes content internally (strip BOM, normalize line endings, trim trailing whitespace), the normalized content hash would differ from the raw file hash even though the file was never modified. Raw-byte hashing is the only valid lossless proof.

**Lossless boundary: workspace files vs .claws/ pipeline state** _(Source: LR-S01-F08)_: The lossless guarantee applies to the 9 workspace files. The .claws/ directory receives compiled pipeline state (governance-ir.json, compiled tables, cache) that is mutable. This boundary must be documented: workspace files are lossless-protected, .claws/ contents are internal pipeline state.

**Git-diff-based lossless integration test strategy** _(Source: LR-S01-F08)_: The natural integration test for lossless is: run `claws build` in a clean git worktree and assert `git diff --stat` on the 9 source files returns empty. Any source file modification after build is a lossless violation.

**Lossless enforcement derived from parse file list** _(Source: LR-S01-F09)_: The lossless protection list must be derived from the parse file list, not maintained as a separate configuration. If the OC platform adds a 10th file type in a future version, it must automatically appear in both the parse list and the lossless protection list. Separate lists can drift.

**BOM stripping before keyword anchor extraction** _(Source: LR-S02-F01)_: The PARSE phase must strip UTF-8 BOM (0xEF 0xBB 0xBF) before keyword extraction. A keyword-anchored parser looking for `^# ` at line start fails when the line starts with BOM + `#`. BOM stripping is an in-memory operation; the stripped content is never persisted back to the source file.

**GovernanceIR hash normalization must strip BOM before hashing** _(Source: LR-S02-F02)_: Two developers editing SOUL.md — one with BOM (Windows Notepad) and one without (VS Code) — produce semantically identical content with different raw bytes. The GovernanceIR hash must strip BOM before hashing so that identical logical content produces identical IR hashes, enabling cross-machine incremental compilation cache sharing.

**UTF-16 BOM detection and transcoding without write-back** _(Source: LR-S02-F03)_: The PARSE phase must handle UTF-16LE (0xFF 0xFE) and UTF-16BE (0xFE 0xFF) BOM variants. UTF-16 files require transcoding to UTF-8 before parsing, but the lossless guarantee means the file stays in its original encoding — no transcoding is written back to the source file.

**Explicit BOM stripping in Node.js string conversion** _(Source: LR-S02-F04)_: Node.js `buffer.toString('utf-8')` does NOT strip the BOM — it appears as U+FEFF (zero-width no-break space) at string position 0. The pipeline must explicitly check for and remove U+FEFF from the string start after conversion.

**Binary comparison for BOM preservation tests** _(Source: LR-S02-F05)_: Lossless tests for BOM preservation must compare raw bytes (Buffer instances), not string content. String-based comparison implicitly strips BOM in some environments, causing tests to pass even when BOM has been removed from the file.

**Line/column mapping with CRLF source files** _(Source: LR-S03-F01)_: When diagnostics report line numbers from normalized (LF) content but the original file has CRLF, line numbers are correct (CRLF does not affect line numbering) but column numbers may be off if CRLF is counted as two characters. LSP diagnostics use line numbers, not byte offsets.

**Two hash types: normalized IR hash vs raw lossless verification hash** _(Source: LR-S03-F02)_: The GovernanceIR uses a normalized hash (LF-normalized, BOM-stripped) for cross-platform cache sharing. The lossless verification uses a raw-byte hash to verify files are unchanged. These are two distinct hash types with different normalization rules. The spec must clearly distinguish them.

**Mixed line ending normalization (CRLF, LF, CR)** _(Source: LR-S03-F03)_: Files with mixed line endings (CRLF and bare LF, or legacy CR from old Mac OS) must be normalized consistently for parsing. The normalizer replaces all CRLF, LF, and CR with LF for in-memory parsing. The source file retains whatever mixed endings it has — normalization is in-memory only.

**Generated file line ending policy** _(Source: LR-S03-F05)_: Generated files (index.ts, exec-approvals.json) must follow a line ending policy: either match the workspace convention or force LF. If generated files use LF on Windows and git has `core.autocrlf=true`, git checkout converts to CRLF, causing the hash-skip optimization to re-write every build because on-disk CRLF differs from generated LF.

**Line ending detection from source files for generated output** _(Source: LR-S03-F07)_: Rather than reading .editorconfig (adding a dependency), the simpler approach is to detect the line ending style of the first source file and match it in generated output. This aligns generated output with the workspace convention without external configuration.

**Lexicographic sort of file paths for deterministic processing order** _(Source: LR-S04-F05)_: If skills/ contains multiple skill directories, the order in which they are enumerated affects the IR manifest entry order, which affects the hash. The pipeline must sort file paths lexicographically before processing to guarantee deterministic ordering regardless of filesystem enumeration order, which varies across operating systems and runs.

**GovernanceIR deterministic hash excluding timestamps and ambient state** _(Source: LR-S04-F01)_: The GovernanceIR must not include time-varying fields (compiledAt, process PIDs, random values) in the hashed content. Two compilations one second apart must produce identical hashes. Time-varying fields may exist in a metadata section outside the hashed content.

**Sorted-key JSON for deterministic GovernanceIR output** _(Source: LR-S04-F02)_: JSON serialization must use sorted keys (JSON.stringify with a key-sorting replacer) for deterministic output. If property insertion order varies between compilations (due to Map iteration order or async file reading order), the JSON output differs even though the logical content is identical.

**Hash-skip depends on deterministic serialization** _(Source: LR-S04-F03)_: The hash-skip optimization (compare content hashes before writing to avoid unnecessary file writes) requires deterministic serialization as a prerequisite. Non-deterministic serialization causes hash differences on identical content, defeating the optimization and triggering unnecessary writes.

**PRESS compression determinism requirement** _(Source: LR-S04-F04)_: PRESS compression must use deterministic algorithms. If the compression algorithm uses heuristics that produce different output for the same input (random sampling, time-limited search), the generated SKILL.md differs between compilations, breaking idempotence.

**Stable code generation ordering for deterministic index.ts** _(Source: LR-S04-F06)_: The generated TypeScript plugin (index.ts) must emit tool handlers in a stable order (alphabetical by tool name, or by risk level then alphabetical). If code generation emits handlers in file-system enumeration order and that order varies, the generated code varies between compilations.

**Compiler version in IR metadata for cache invalidation on upgrade** _(Source: LR-S04-F08)_: The GovernanceIR metadata must include the compiler version. When a claws upgrade changes code generation templates (formatting, comments), the output changes even though the source is unchanged. The compiler version triggers cache invalidation on upgrade while the IR hash itself remains deterministic within a version.

**Delimiter-based section management for .cursorrules injection** _(Source: LR-S04-F09)_: When emitting governance content into .cursorrules or similar platform config files, the EMIT phase must use delimiter-based section management (e.g., `<!-- claws governance start -->` ... `<!-- claws governance end -->`). Re-compilation replaces the delimited section without affecting user-authored content above or below the delimiters.

**Independent per-file error collection** _(Source: LR-S05-F01)_: A parse error in SOUL.md must not prevent parsing of TOOLS.md. The collect-all-errors strategy means the pipeline attempts to parse all files and reports all errors. Independent per-file error collection avoids multi-round-trip debugging where the developer fixes one file, re-runs, and discovers errors in the next file.

**Last-known-good artifact preservation on compilation error** _(Source: LR-S05-F02)_: When the pipeline fails with errors, it must NOT delete previously-emitted artifacts from a prior successful compilation. The developer retains the last working governance enforcement while fixing errors. This is the opposite of "clean on error" — failed compilations preserve existing artifacts.

**Reliable line counting in malformed files** _(Source: LR-S05-F03)_: The parser must track line numbers independently of content parsing so that error locations are reliable even in malformed files. An unclosed code block spanning to EOF may corrupt content parsing, but line counting must remain accurate for diagnostic line number references.

**Crash safety for atomic staging (unhandled exception path)** _(Source: LR-S05-F05)_: The atomic staging pattern prevents corruption during normal flow, but unhandled exceptions may bypass staging logic. If the pipeline opens exec-approvals.json for writing before crashing, the existing file may be truncated. Source files are protected by read-only handles (LR-S01-F03), but output artifacts need crash-safe write paths.

**Graceful handling of zero successfully-parsed files** _(Source: LR-S05-F06)_: A workspace where ALL files are malformed (every file has parse errors) must still produce a structured error report, not crash. An empty CapabilityManifest with zero successfully-parsed files is a valid degenerate compile result that reports N parse errors.

### Platform Detection

**Bedrock emission must be model-provider-agnostic** _(Source: PD-S05-F05)_: AWS Bedrock supports multiple model providers (Anthropic, AI21, Cohere, Meta) with potentially different guardrail capabilities. The Bedrock EMIT phase must target Bedrock guardrails generically, not include provider-specific fields. Provider-specific guardrail JSON fails for other providers in the same Bedrock deployment.

**Multi-language code generation architecture** _(Source: PD-S06-F01)_: The EMIT phase architecture must support multiple output languages (TypeScript, Python, JSON, YAML), not just TypeScript and JSON. LangGraph requires Python code (decorators, guard functions, configuration YAML), making it the first Python code generation target. The emit architecture must accommodate per-platform language targets.

**LangGraph HITL integration for governance elicitation** _(Source: PD-S06-F04)_: For LangGraph targets, the EMIT phase should detect existing human-in-the-loop (HITL) nodes in langgraph.json and wire governance elicitation (R4-R5 approval flows) through LangGraph's built-in HITL mechanisms rather than generating parallel approval mechanisms. This produces idiomatic LangGraph governance code.

**Platform-specific performance budgets for guard code** _(Source: PD-S06-F05)_: The TypeScript hook timeout (50ms default, 500ms max) may not translate to Python frameworks. Python async overhead differs from Node.js. LangGraph guard decorators must be lightweight (<5ms per invocation) to avoid degrading multi-step workflow performance. Platform-specific performance budgets are required for emitted guard code.

**LangChain tool model bridging for LangGraph** _(Source: PD-S06-F06)_: LangGraph's tool ecosystem (LangChain BaseTool) uses different naming and capability declarations than TOOLS.md. The compiler must bridge between claws's tool model (TOOLS.md with R1-R5 risk) and LangChain's tool model (BaseTool with description and schema), including tool name normalization between Python snake_case and claws kebab-case conventions.

**LangGraph platform-specific supplementary parsing** _(Source: PD-S06-F03)_: The PARSE phase should accept langgraph.json as a supplementary source alongside the 9 OC workspace files. The compiler can parse langgraph.json to discover tool usage patterns and node risk levels without requiring separate governance files. This LangGraph-native parsing path is platform-specific and must not pollute the generic pipeline.

**CrewAI guard config location** _(Source: PD-S07-F02)_: For CrewAI targets, the EMIT phase must determine whether guards belong in a separate file or injected into crewai.yaml. Since crewai.yaml is the detection marker, modifying it creates a parse-emit feedback risk (same compiled-workflow-detection concern as lobster.yaml). A separate guard config file avoids the feedback loop.

**Hierarchical delegation cycle detection for CrewAI** _(Source: PD-S07-F03)_: CrewAI supports hierarchical process mode (manager delegates to worker agents) and sequential/parallel task execution. The delegation graph is more structured than OC's flat AGENTS.md. Cross-file conflict category 5 (circular delegation detection) must account for CrewAI's hierarchical delegation model where a manager delegates to workers who may delegate sub-tasks back up.

**CrewAI memory governance mapping from MEMORY.md** _(Source: PD-S07-F09)_: CrewAI supports short-term, long-term, and entity memory, which maps to claws's MEMORY.md governance (data labels, retention rules). The EMIT phase must include memory governance rules (G-CONTEXT-MEMORY) that map to CrewAI's memory configuration. This cross-domain mapping is unique to CrewAI among the 7 supported platforms.

**Governance model translation coverage for Bedrock** _(Source: PD-S05-F04)_: The translation from claws's tool-centric model (R1-R5 risk, per-tool OBO) to Bedrock's content-centric model (topic filters, word lists) is lossy. Some governance rules (G-CLASS per-tool risk) have no direct Bedrock equivalent. The EMIT phase must document which rules are emitted as enforceable guardrails and which are advisory-only for the Bedrock platform.

## Pitfall Scenario Amendments (P-162 through P-249)

### Three-Ring Governance

**P-167: Concurrent Ring IR TOCTOU** _(Sources: PA-S06-F02)_: The GovernanceIR file must include an integrity trailer containing total rule count, SHA-256 content hash, and file size. Readers must verify the trailer before using the IR to prevent silent partial reads where a TOCTOU race between inner ring writes and outer ring reads produces a truncated but coincidentally valid JSON file with missing governance rules. Without the trailer, a truncated IR silently drops rules with no error.

**P-184: Pre-Governance Plugin R5 Static Assertion** _(Sources: PA-S23-F05)_: The EMIT phase must include a static assertion verifying that the generated governance plugin code does not access prior-plugin approval state. During emission, the generated plugin code is checked for any references to the approval context field. If the generated code reads the approval context, the emit must fail with a compiler error, providing defense-in-depth at the compilation stage against pre-governance plugins that might pre-approve R5 calls.

### Fleet Operations

**P-185: Case-Insensitive Agent Name in IR** _(Sources: PA-S24-F04)_: The GovernanceIR must store agent names in both their original casing and a normalized (lowercase) form. The original casing is needed for display and audit trails while the normalized form is needed for collision detection and routing. Storing both forms prevents repeated normalization at runtime and makes case-insensitive collision detection explicit in the IR structure.

### Snapshot Lifecycle

**P-165: Snap Restore Field Reinterpretation** _(Sources: PA-S04-F02)_: The PARSE phase must reject unknown field values rather than defaulting them. When a version mismatch causes the runtime to read old-format workspace files, field parsers that encounter unrecognized values (e.g., a free-form string where an enum is expected) must produce a hard error. Silent defaulting to the most permissive value is a security escalation, as demonstrated by trust.tier "elevated" defaulting to T1.

**P-187: Lossless Restore Principle** _(Sources: PA-S26-F02)_: The lossless carve-out for snap restore must be documented as a CL-04 design principle. claws never destroys user content, and snapshot restore is a governance configuration change, not a file system operation. The carve-out must define: (1) staging area for review, (2) selective application of restored files, and (3) automatic backup of the current state before any overwrite. This ensures snap restore does not violate the add-only architecture.

### OBO Elicitation

**P-199: Capability Probe Coupled to Handler Registration** _(Sources: PT1-S03-F04)_: The EMIT phase must generate the AbortSignal capability probe as part of the handler registration preamble, not as a separate health check. If the probe is a separate operation, an operator can deploy handlers without running the probe, bypassing the safety check. The probe and registration must be coupled in the emitted code: no probe success means no registration. This is a compile-time guarantee, not a runtime convention.

**P-202: Delivery Timeout in Generated Handler** _(Sources: PT1-S06-F08)_: The compiled handler must include the 5-second deny delivery timeout logic and dual-channel delivery mechanism as generated code, not as a runtime library call. If the delivery timeout depends on a runtime library that could be patched or misconfigured, the safety guarantee is weakened. The timeout and dual-channel delivery must be baked into the emitted handler code by the EMIT phase, making them immutable after compilation.

**P-205: Post-Compile Standing Approval Advisory** _(Sources: PT1-S09-F07)_: The compilation pipeline should emit a post-compile advisory listing all standing approvals present in the generated handler. This advisory serves as a deployment checklist: the operator reviews the list before deploying and can catch standing approvals that should have been removed. The advisory is a human-readable summary alongside the compiled code, enabling detection of stale approvals before deployment.

**P-207: Constant-Time Token Verification** _(Sources: PT1-S11-F01, PT1-S11-F04, PT1-S11-F05)_: The EMIT phase must generate token verification code that uses crypto.timingSafeEqual for all signature comparisons, preventing timing side-channel attacks. The compiler must also emit static analysis annotations on all security-sensitive comparison sites so the VERIFY phase can scan for non-constant-time comparisons as a compile-time guarantee. Additionally, the emitted code must handle length mismatches safely before calling timingSafeEqual, padding the shorter buffer to the expected length rather than leaking length information through an early return.

**P-208: Approval Key Security in Emitted Code** _(Sources: PT1-S12-F04, PT1-S12-F07)_: The VERIFY phase must detect git-tracked key files (*.key, *.pem, *.secret) by running a git ls-files check and emitting a hard compile-time error if any are found, even if .gitignore would normally exclude them. Additionally, all logging code emitted by the compiler must redact the approval key with a fixed placeholder ("[REDACTED]"), and the compiler should scan its own output for key variable references in log statements to enforce this redaction.

### Injection Defense

**P-204: Compile-Time Governance Path and Pre-Auth Validation** _(Sources: PT1-S08-F03, PT1-S08-F05)_: The EMIT phase must embed a compile-time constant governance-critical path list (USER.md, claws.json, SOUL.md, TOOLS.md, AGENTS.md, ROLES.md, SCHEDULE.md, WORKFLOWS.md, DATAMAP.md) in the generated handler, not configurable by the agent at runtime. The PARSE phase must also validate pre-authorization entries in USER.md at compile time, emitting a warning for any pre-authorization that covers R5 tools and an error for pre-authorization with no expiry date, catching injected entries that are syntactically valid but semantically dangerous.

**P-225: Preamble Token Efficiency** _(Sources: PT1-S29-F08)_: The compilation pipeline should optimize governance preamble instructions for token efficiency without losing enforcement power. Governance preamble size directly consumes context window space, leaving less room for actual agent work. The EMIT phase must balance completeness of governance instructions against token budget to minimize context pressure that could trigger truncation of the governance layer.

### Lossless Round-Trip

**P-237: Generated Skill Directory Collision** _(Sources: PT2-S12-F01, PT2-S12-F02, PT2-S12-F03, PT2-S12-F04, PT2-S12-F05, PT2-S12-F06, PT2-S12-F07, PT2-S12-F08)_: The EMIT phase must scan the target directory for existing files before writing, failing with OC-POLICY-E200 if user-authored content exists (determined by absence of a .claws-generated marker). The reserved directory name must be configurable in claws.json (defaulting to .claws-governance/ to minimize collision). A .claws-generated marker file distinguishes emitted files from user-authored files. Collision checks must be recursive across subdirectories, case-insensitive on Windows/macOS, and run before any file writes to ensure atomic emission. Error messages must identify both the intended path and existing content, and mixed-ownership directories must only overwrite marker-bearing files.

**P-238: Compiled Workflow Feedback Loop** _(Sources: PT2-S13-F01, PT2-S13-F02, PT2-S13-F03, PT2-S13-F05, PT2-S13-F06, PT2-S13-F07)_: Every claws-compiled artifact must contain an immutable header marker (e.g., __claws_compiled: true) that the PARSE phase checks before processing, rejecting the file with OC-POLICY-E201 if detected. Detection must be content-based rather than filename-based since users routinely rename files. A single compilation cycle must be idempotent: compiling already-compiled output must produce an error, not compound governance rules. The PARSE phase must also distinguish source from output directories via claws.json configuration and detect structural patterns of compiled output even without the marker as defense-in-depth. The compiled artifact marker should include a source hash chain for staleness detection.

**P-239: UTF-8 BOM First Constraint Missed** _(Sources: PT2-S14-F01, PT2-S14-F02, PT2-S14-F03, PT2-S14-F04, PT2-S14-F05, PT2-S14-F06, PT2-S14-F07)_: BOM stripping must occur at the I/O boundary as the very first file reading operation, before any content reaches the parser. The parser must count expected constraints against extracted constraints, producing at minimum a warning on mismatch. BOM handling must cover all three variants: UTF-8 (EF BB BF), UTF-16 LE (FF FE), and UTF-16 BE (FE FF), normalizing to UTF-8 after stripping. The GovernanceIR must record a diagnostic entry noting which files had BOMs. Only the leading BOM is stripped; interior BOM-like sequences are preserved. The GovernanceIR content hash must be computed on BOM-stripped content, and test fixtures must include actual BOM bytes committed as binary blobs with .gitattributes protection.

**P-240: CRLF/LF Hash Divergence** _(Sources: PT2-S15-F01, PT2-S15-F02, PT2-S15-F03, PT2-S15-F04, PT2-S15-F05)_: Line ending normalization to LF must occur before any hashing operation, in the pipeline after BOM stripping: read bytes, strip BOM, normalize to LF, then pass to parser and hasher. The normalizer must handle mixed line endings within a single file (replace all CRLF with LF, then strip standalone CR). Incremental compilation cache keys must be computed on normalized content and this must be documented in the cache format. The EMIT phase must output LF on all platforms, matching the canonical line ending used for hashing. The normalization must be independent of Git's core.autocrlf and .gitattributes settings.

**P-241: Nondeterministic JSON Serialization** _(Sources: PT2-S16-F01, PT2-S16-F02, PT2-S16-F03, PT2-S16-F04, PT2-S16-F05, PT2-S16-F06, PT2-S16-F07)_: All JSON serialization in the EMIT phase must use JSON.stringify with a recursive key-sorting replacer at every nesting level. IR construction must also be deterministic: entries must be sorted after collection before serialization. Array elements must be sorted by a stable key (rule ID, tool name). Floating-point values should be avoided in the IR, preferring integer scores or fixed-precision strings. JSON output formatting must be canonical (2-space indent). Compilation timestamps must be excluded from the content hash, covering only governance-relevant content. Non-deterministic serialization defeats the hash-skip optimization and produces spurious git diffs in CI.

**P-242: Error Deletes Working Artifacts** _(Sources: PT2-S17-F01, PT2-S17-F02, PT2-S17-F04, PT2-S17-F05, PT2-S17-F06, PT2-S17-F07, PT2-S17-F08)_: The EMIT phase must never delete previous artifacts before a new compilation succeeds. The correct pattern is compile-to-staging: write to a temporary staging directory, verify success, then atomically swap with the output directory. On failure, discard staging and leave the output directory untouched. On Windows, the atomic swap requires a three-step approach (rename output to output.backup, rename staging to output, delete backup) since NTFS does not support atomic directory rename when the target exists. Partial compilation failures discard the entire staging directory (no partial emit). The last-known-good artifacts should include a source manifest, and the backup directory is cleaned on the next successful compilation.

**P-245: CLAUDE.md User Content Overwrite** _(Sources: PT2-S20-F01, PT2-S20-F02, PT2-S20-F03, PT2-S20-F04, PT2-S20-F05, PT2-S20-F06, PT2-S20-F07)_: The EMIT phase must use HTML comment delimiters (<!-- claws:governance:begin --> and <!-- claws:governance:end -->) to demarcate the claws-managed section within CLAUDE.md. On first compilation, governance is appended to the end of existing content. On subsequent compilations, only the content between delimiters is replaced while preserving everything above and below byte-for-byte. Mismatched delimiters (one present, one missing) must be detected as an error rather than causing content corruption. The inter-delimiter section includes an auto-generated header comment, the target CLAUDE.md path comes from claws.json, and the delimiter format must be stable across claws versions with backward-compatible recognition.

**P-246: Settings.json Merge Overwrites** _(Sources: PT2-S21-F01, PT2-S21-F02, PT2-S21-F03, PT2-S21-F04, PT2-S21-F05, PT2-S21-F06, PT2-S21-F07, PT2-S21-F08)_: The EMIT phase must deep-merge governance entries into existing .claude/settings.json, preserving all user-configured keys (model preferences, MCP servers, UI settings) that do not conflict with governance. Governance-first conflict resolution means governance denies override user allows, with every conflict logged showing the original and override values. Governance-managed entries must be tagged with metadata for clean removal on eject. Array-valued settings are merged by union rather than replacement. Malformed settings.json must produce an error, not silent replacement. Unknown keys from future Claude Code versions are preserved, MCP configuration blocks are treated as sensitive and never logged, and a pre-merge backup is created.

### Platform Detection

**P-244: Advisory R5 Silently Unenforced** _(Sources: PT2-S19-F02, PT2-S19-F04)_: The EMIT phase must hard-block emission of R5 governance for advisory-only platforms (Cursor, Copilot). Unlike other compilation errors that can be bypassed with --force, R5 enforcement gaps on advisory platforms are a non-overridable error because advisory enforcement is unreliable under adversarial conditions. The GovernanceIR must record the enforcement class (mandatory, advisory, none) for each tool on each target platform, enabling audit trails that show which tools have guaranteed enforcement and which rely on LLM compliance.

**P-247: Bedrock Guardrail API Version** _(Sources: PT2-S22-F01, PT2-S22-F03, PT2-S22-F04, PT2-S22-F05, PT2-S22-F07)_: The EMIT phase must target an explicit, documented Bedrock API version specified in claws.json as a required field, refusing to emit without it. The emitter must document which Bedrock API fields are used and which governance constraints they carry, enabling manual verification when API versions diverge. Emitted guardrail JSON should include a validation section listing expected enforcement behaviors for post-deploy verification. Per-environment API version targeting must be supported, and a list of known deprecated versions must be maintained and checked, rejecting emission against deprecated versions.

**P-248: LangGraph Python-Only Platform** _(Sources: PT2-S23-F01, PT2-S23-F02, PT2-S23-F03, PT2-S23-F04, PT2-S23-F05, PT2-S23-F07)_: The EMIT phase must map each target platform to its required output language and report an error before emission when no compatible code generator exists. This check must run at the earliest possible stage (DETECT phase, before PARSE) to avoid wasting compilation time on unsupported targets. The GovernanceIR must remain language-agnostic so that TypeScript and Python emitters each translate the same IR into platform-idiomatic code. Python codegen must produce first-class idiomatic Python (decorators, type hints, native imports), not mechanical TypeScript transpilation. LangGraph-specific integration patterns (tool decorators, state graph nodes, conditional edges) must be supported, and an --emit-ir-only flag must provide a workaround for unsupported platforms.

## Integration Scenario Amendments

### InputResolver

**IR-S01: Default 9-File Resolution** _(Sources: IR-S01-F02, IR-S01-F04, IR-S01-F06)_: The PARSE phase migration from readWorkspace() to InputResolver.resolve() must audit every consumer of the old return shape, since InputResolver wraps content with metadata (content hash, resolved path, source type) that the raw reader did not produce. The manifest must preserve canonical parse ordering regardless of whether InputResolver resolves files in parallel, because downstream code may depend on fixed ordering (e.g., forward references from AGENTS.md to TOOLS.md). Encoding parity is required: InputResolver's file reader must use the same encoding detection, BOM handling, and line-ending normalization as the old readWorkspace() to prevent content hash divergence for files with non-ASCII characters.

**IR-S04: Mixed-Source Compilation** _(Sources: IR-S04-F02, IR-S04-F04, IR-S04-F06)_: Mixed-source resolution (file + package + URL) must run in parallel rather than a sequential waterfall, since a 2-second URL fetch alone would blow the 350ms compile-time budget. Forward references across source types must be deferred to the ANALYZE phase. The overall GovernanceIR hash must be a deterministic function of all source hashes combined in canonical order (sorted by source type + name, not resolution timing) to ensure identical inputs always produce the same IR hash. The manifest should distinguish between "sources that contributed rules" and "sources that were resolved" so that adding an optional local file does not change the IR hash when no governance rules change.

**IR-S05: Input Resolver Failure Modes** _(Sources: IR-S05-F06)_: When multiple resolution failures occur but local file sources resolve successfully, the pipeline must decide between producing a partial GovernanceIR from successful sources (useful for IDE integration) or enforcing all-or-nothing governance compilation. The partial-IR path helps developers see local issues while external sources are broken, but it violates the fail-closed principle for governance.

**IR-S06: Provenance Audit Trail** _(Sources: IR-S06-F07)_: CGR serialization must guarantee lossless round-trip for all provenance fields. Timestamp precision loss (milliseconds to seconds), hash truncation, or Unicode normalization during JSON serialization would break the audit verification chain. The serialization format must be validated with a round-trip test: serialize, deserialize, re-serialize, and confirm byte-for-byte equality of all provenance entries.

### Package Output

**PO-S06: Multi-Artifact Package** _(Sources: PO-S06-F02)_: Cross-artifact dependency detection in the slicer requires understanding governance rule semantics (e.g., detecting that a policy rule references an "admin" role). This means the slicer must run post-ANALYZE with access to the GovernanceIR, not just raw files from PARSE. The slicer phase ordering constraint ensures dependency detection is based on parsed and analyzed governance content.

### Ontology Governance

**OG-S03: Ontology-Driven Governance Generation** _(Sources: OG-S03-F03, OG-S03-F04, OG-S03-F07)_: Error reporting must clearly distinguish PARSE errors (ontology syntax) from dissolution errors (invalid concept relations, missing referenced concept IDs), since they occur in different pipeline phases and require different developer responses. After dissolution, the total rules (dissolved + hand-authored) must be ordered deterministically by kind and priority, not by source origin, ensuring that adding ontology sources does not change evaluation order for existing hand-authored rules. A post-dissolution validation pass must verify zero OntologyIR residue in the GovernanceIR to prevent bugs in the dissolution pass from leaking ontology-specific type references into runtime artifacts.

**OG-S04: Ontology-Driven Skill Generation** _(Sources: OG-S04-F04, OG-S04-F05)_: When both ontology-generated skill constraints and workspace-level governance rules restrict the same dimension (e.g., both set trust_tier_gate), the ANALYZE phase must implement monotonic tightening to select the more restrictive value. The compiler should also detect schedule-governance conflicts during ANALYZE -- for example, when an ontology specifies a monitoring frequency (every 6 hours) that exceeds a workspace governance cap on monitoring frequency.

**OG-S06: Custom Governance Ontology** _(Sources: OG-S06-F01, OG-S06-F05)_: The GovernanceIR rule kind type must be extensible (open string type or extension mechanism) rather than a closed enum, because custom ontologies define domain-specific kinds (trade_approval, position_limit) that are not in the built-in set. A closed enum would force custom ontologies to fail schema validation, defeating the purpose of data-driven dissolution. Additionally, the ANALYZE phase must handle aggregate constraints (portfolio-level rules that span all tools) differently from per-tool constraints, requiring post-execution aggregation evaluation rather than pre-execution gating.

### Compiled Context

**CC-S04: Context Diff Fleet Drift** _(Sources: CC-S04-F03)_: Structural diff at the governance layer level requires rules to have stable identifiers. If rules are identified only by content (no explicit ID), renaming a rule's description without changing its behavior appears as a remove + add pair instead of a modification. GovernanceIR rules must carry stable identifiers to enable meaningful structural diff for fleet drift detection.

### Loss-Aware Emission

**LA-S01: Governance Fidelity Matrix** _(Sources: LA-S01-F04, LA-S01-F05)_: The inject-defense capability column in the loss matrix is not present in Spec 108's original table (which lists Tool Block, Approval Gate, Audit Trail, Budget Cap, Trust Tier). If inject-defense is a new governance dimension, the matrix schema must be extended and Spec 108 must be amended. CROSS_LOSS_FIELD_DEGRADED advisories must include the specific governance field that degraded, the source and target platform scores, and the weight delta -- a generic "fidelity reduced" message is insufficient for developers to assess acceptability.

**LA-S02: Path Enumerator Emission** _(Sources: LA-S02-F02, LA-S02-F03, LA-S02-F05, LA-S02-F06)_: Multi-hop route loss aggregation must match Spec 108's semantics -- if hop 1 loses elicit fidelity and hop 2 loses audit fidelity, total loss is the union of both, not a sum that double-counts already-lossy fields. CROSS_LOSS_BETTER_ALT advisories must name the better alternative platform, specify which governance fields it preserves, and state the loss delta (e.g., "Claude Code preserves elicit (lossless vs lossy) and audit (partial vs lossy)"). Route scoring should be workspace-relative: a workspace that does not use audit should not be penalized for a platform's lack of audit support. Route enumeration must stay within the compilation latency budget, bounded by max hops and max routes explored.

**LA-S03: Strict Loss R5 Advisory** _(Sources: LA-S03-F01, LA-S03-F02, LA-S03-F03)_: The --strict-loss default for R5 tools must be non-configurable and non-overridable -- the compiler must reject any attempt to disable strict-loss for R5 tools via claws.json, CLI flags, or environment variables. ASTRO-ROUTE-LOSS-003 must list every degraded field (not just the first found) so the developer sees the full scope of the fidelity gap in one pass. For mixed-risk workspaces (R1 + R5 tools), strict-loss evaluation must be partitioned by risk level, blocking only R5 emission while allowing R1-R4 tools to emit to advisory-only platforms.

**LA-S04: Multi-Platform Loss Report** _(Sources: LA-S04-F01, LA-S04-F03)_: The loss report must be a structured JSON artifact, not just terminal output, because CI/CD pipelines need to parse it programmatically to gate deployments based on loss thresholds. Multi-platform compilation must produce independent, self-contained artifacts per platform -- if a Cursor artifact references Claude Code governance structures, the artifacts cannot be deployed independently, breaking the per-platform isolation requirement.

**LA-S05: Platform Capability Versioning** _(Sources: LA-S05-F02, LA-S05-F06)_: If the workspace does not declare a target platform version (no lockfile, no claws.json version field), the compiler must not silently assume the latest version. Assuming v0.3 capabilities when the runtime is v0.1 would produce artifacts expecting native hooks that do not exist. The compiler should require explicit version declaration for loss-aware routing. When a platform version is deprecated or end-of-life, the compiler should emit a deprecation warning distinguishing between "known governance gaps" and "no longer supported by vendor."

### Identity Bridge

**IB-S02: Credential Escrow OBO Keys** _(Sources: IB-S02-F06)_: If the secrets vault (.craft/governance/secrets.enc) does not exist but governance rules reference ${secrets.*} templates, the PARSE phase must fail with a clear error rather than silently skipping resolution. Silent skipping would produce OBO tokens signed with a null key, which would be trivially forgeable.

**IB-S03: SSO Groups Workspace Roles** _(Sources: IB-S03-F03)_: Role resolution must happen before any file I/O in the compilation pipeline. If the compiler starts reading workspace files before checking the user's role, a viewer could trigger filesystem operations (cache warming, lock file creation) visible to other users. The role check must be the first operation in the pipeline, preceding the PARSE phase.

**IB-S04: Section Locks FE6** _(Sources: IB-S04-F02, IB-S04-F07)_: The `<!-- lock:admin -->` directive is an HTML comment that must survive all parser stages. If FORMA's frontmatter extraction strips HTML comments during section extraction, the lock is silently removed and enforcement is bypassed -- lock directives must be treated as metadata, not content. Section hash computation must normalize line endings before hashing to prevent false-positive lock violations when files move between Windows (CRLF) and macOS (LF) environments.

## Incremental Stages

_Added by the `claws-compile-dx` plan (Ra wave). Drives `claws watch` (H1) by making per-file edits cheap; layers per-subsystem caching on top of the existing content-hash compile-level cache (CP-2, commit abf6d45d8)._

The compile pipeline today has a single monolithic content-hash cache key — any file change invalidates the whole cache entry. Incremental compile adds a **per-stage cache layer** so that changing one input file only invalidates the stages that depend on it. The compile-level cache remains as a short-circuit fast path; per-stage caches run only when the compile-level cache misses.

### §IS.1 Per-subsystem cache keys

Each reader stage (`soul`, `tools`, `agents`, `memory`, `identity`, `user`, `heartbeat`, `skills`, `lobster`) gets its own cache entry. A stage's cache key is derived from:

- The **content hash of the specific file(s) that stage reads** (e.g., `soul` stage's key is the SOUL.md content hash — not the whole workspace). The hash uses the same BOM-stripped, LF-normalized hashing as the IR hash (see LR-S02, LR-S03). The hash algorithm is **SHA-256**. _(Source: incremental/S01-F06)_
- Plus `compiler.version` (per CL-14 §1.4 — a version bump invalidates all stage caches, matching the existing compile-level cache rule).
- Plus any stage-specific configuration that affects output (e.g., the governance rule set version for stages that resolve against claws.json).
- Plus the effective crypto/key identifier (see §IS.2 — key rotation is part of the effective cache key).
- **Plus a `keySchemaVersion`** — a monotonic integer bumped whenever the set of inputs to cache-key derivation changes (e.g. adding a new input to the hash formula). Each cache entry stores its `keySchemaVersion` alongside the content; on read, a mismatch forces a cache miss. Without this, a future change to key derivation could produce silent hash collisions where two logically-different entries map to the same key. _(Source: incremental/S03-F07)_

**Downstream stage cache keys** (`modelToIR`, `baselineAnalysis`, `enforceR5`, `emit`, `validate`) **MUST** include the content hashes (or `byteHash` outputs per §IS.4) of ALL upstream IR outputs they consume, so an upstream invalidation propagates transitively through the cache. A downstream stage whose key tracks only direct inputs could `cacheHit` on stale upstream output — serving the analyzer's output derived from a pre-edit `soul` IR, for example, and silently missing new principles in the emit. _(Source: incremental/S01-F03, S02-F04)_

**Emit stage cache key additional input**: the emit stage's cache key **MUST** include a hash of the audit-chain signing key material (or the key's stable `key-id`). Emitted artifacts embed signed metadata; rotating the signing key without invalidating the emit cache would cause stale signatures to be served, silently breaking the audit chain at runtime without surfacing a compile-time error. The reader stages (pre-emit) are not required to include signing-key identity because their outputs do not carry signatures. _(Source: incremental/S03-F02)_

**Cache lookup fast-path** _(Source: incremental/S01-F04)_: A naive lookup that re-reads each input file to compute its content hash costs ~1ms per file (file I/O dominates); eight lookups = ~8ms, blowing the "≤2ms per cacheHit stage" budget from the incremental scenarios. Stage cache lookups therefore MUST use an **mtime fast-path**: stat the input (~50μs) and compare against the stored mtime; only when mtime has changed does the reader re-hash the content to confirm the cache entry is still valid. Content-hash remains the authoritative correctness check — mtime is a hint that makes the common no-change case cheap.

Stage cache entries are stored under `.claws/cache/stages/<stage-name>/<key>.json` alongside the existing compile-level entries. The `.claws/` boundary documented in LR-S01-F08 applies: stage caches are internal pipeline state, not workspace files.

### §IS.2 Invalidation rules

- **File change** → the corresponding reader stage's cache entry is invalidated (its content hash changes); downstream dependents are invalidated transitively via the dependency graph in §IS.3. Sibling readers that do not share the changed file stay cached.
- **Key rotation** → **ALL** stage caches are invalidated. Crypto keys are part of the effective cache key because they affect OBO signing, sidecar encryption, and any stage output that embeds or references key material. A key rotation must not serve pre-rotation cached output.
- **Compiler upgrade** (`compiler.version` bump) → **ALL** stage caches are invalidated. This matches the existing compile-level behavior from LR-S04-F08: generated-code template changes in a new compiler version must invalidate stale caches even when source content is byte-identical.
- **claws.json change that affects rule resolution** → stages that consume the rule set are invalidated; file-only readers (pure content hash) are not.

### §IS.3 Dependency graph between stages

Reader stages are leaf nodes — they depend only on their own input file. Downstream stages depend on the reader outputs they consume.

```
Readers (leaves — cache per input file):
  soul       ← SOUL.md              (no upstream dependency)
  tools      ← TOOLS.md             (no upstream dependency)
  agents     ← AGENTS.md            (no upstream dependency)
  memory     ← MEMORY.md            (no upstream dependency)
  identity   ← IDENTITY.md          (no upstream dependency)
  user       ← USER.md              (no upstream dependency)
  heartbeat  ← HEARTBEAT.md         (no upstream dependency)
  skills     ← skills/*             (no upstream dependency)
  lobster    ← lobster.yaml         (no upstream dependency)

Aggregator and downstream stages:
  modelToIR         ← ALL 9 reader outputs           (aggregator)
  baselineAnalysis  ← modelToIR                      (ANALYZE phase)
  enforceR5         ← baselineAnalysis               (analysis consumer)
  emit              ← modelToIR + baselineAnalysis   (EMIT phase)
  validate          ← emit output                    (post-emit checks)
  cache.set         ← all of the above               (final compile-level cache entry)
```

**Invalidation semantics**: when a reader file changes, that reader's cache entry invalidates, but sibling readers can `cacheHit`. `modelToIR` re-runs because one of its inputs changed, but its work is cheap because 8 of 9 reader outputs are cached. `baselineAnalysis`, `enforceR5`, `emit`, and `validate` re-run transitively. The **bottom-line compile cache key still aggregates everything** (same CM-4 content-hash key), so a lobster-only edit still writes a fresh compile-level cache entry — but the per-stage work leading up to it is mostly skipped.

**No cross-reader dependencies**: the 9 readers are deliberately independent so a change to any one file invalidates exactly one reader entry. Cross-file governance conflicts (§7 Cross-File Conflicts) are detected in `baselineAnalysis`, not in readers, so they do not create hidden dependencies between reader stages.

### §IS.4 `CompileResult.stageTimings`

A new field on the `CompileResult` type exposes per-stage cache outcomes so watch-mode UI (H1) and operators can see which stages were cached vs re-run:

```typescript
type StageName =
  | "soul"
  | "tools"
  | "agents"
  | "memory"
  | "identity"
  | "user"
  | "heartbeat"
  | "skills"
  | "lobster"
  | "modelToIR"
  | "baselineAnalysis"
  | "enforceR5"
  | "emit"
  | "validate";

interface StageTiming {
  readonly stage: StageName;
  readonly cacheHit: boolean;
  readonly durationMs: number;
  readonly byteHash: string; // content hash of the stage's effective input, for traceability
}

interface CompileResult {
  // ... existing fields ...
  readonly stageTimings: readonly StageTiming[];
}
```

`byteHash` is the same normalized content hash used for the stage's cache key, which lets consumers correlate a `StageTiming` entry with the on-disk cache entry without re-hashing.

`stageTimings` is **always populated**, including when the compile-level cache hits — in that case timings are synthesized from cached IR metadata so watch-mode UI can still show which stages were relevant even though none re-ran. Synthesized timings report `cacheHit: true` and `durationMs: 0`.

### §IS.5 Backward compatibility with the compile-level cache

Incremental stages layer on top of the existing content-hash compile-level cache (CP-2, commit abf6d45d8). The coexistence rules:

- **The existing compile-level cache is NOT removed.** It remains a fast-path for the common case where the entire workspace is unchanged (a re-invocation with no edits).
- **Compile-level cache hit → short-circuit.** If the compile-level cache hits, stage-level caches are never consulted. The short-circuit avoids redundant hashing work and keeps no-change compiles at their current sub-millisecond cost. `stageTimings` is synthesized from cached IR metadata per §IS.4.
- **Compile-level cache miss → stage caches run first, THEN the bottom-line entry is written.** On miss, each stage consults its per-stage cache; hits skip the stage's work. At the end, the aggregated result is written to the compile-level cache so a future identical workspace re-hit takes the fast path.
- **`stageTimings` is always populated** (fresh or synthesized), regardless of which cache path served the compile.

This layering preserves the CP-2 performance guarantee for the no-change case while adding the per-stage optimization for the single-file-edit case that dominates `claws watch` usage.

### §IS.6 Cross-references

- **CL-14 §1.4** — `compiler.version` is part of every stage cache key (and the compile-level key).
- **CL-14 §9** — `CompilerEventBus` emits per-stage events carrying the same `cacheHit` / `durationMs` payload surfaced on `StageTiming`.
- **CL-01** — `claws watch` (pulse TBD) consumes `stageTimings` for per-change output; `claws cache list` (pulse TBD) enumerates stage cache entries alongside compile-level entries.
- **LR-S02, LR-S03** — normalized hashing rules (BOM strip, LF normalize) that stage cache keys inherit.
- **LR-S04-F08** — compiler-version-triggered invalidation; §IS.2 extends this from compile-level to stage-level.
- **Plan**: `.craft/plans/claws-compile-dx.md` — H2 "Incremental compile skips unchanged subsystems" drove this amendment.

### §IS.7 Emit atomic write + principle observability

_Added by the scenario findings audit (watch/S03, incremental/S02, incremental/S03)._

**Atomic emit writes** _(Source: watch/S03-F02, fleet/S01-F03)_: The emit pipeline MUST write every output file using **tempfile-plus-atomic-rename**, never in-place writes. An interrupted compile (SIGINT, SIGTERM, process crash, power loss) MUST leave either the old complete file or the new complete file on disk — never a partial. This guarantee underwrites (a) `claws watch` Ctrl-C cleanup (CL-01 §claws watch), (b) `claws fleet compile` per-workspace failure isolation (CL-01 §claws fleet compile), and (c) emit pipeline robustness generally. In-place writes are prohibited in the emit path.

The tempfile naming convention is `<target-path>.tmp-<pid>-<nonce>` (e.g. `plugins/claws-governance/index.ts.tmp-4812-a3f1`). Stale tempfiles MUST be cleaned up either by the SIGINT handler OR by a startup sweep on the next compile invocation — stale tempfiles accumulating on disk confuse operators inspecting emit output. _(Source: watch/S03-F07)_

**Principles observable in emit** _(Source: incremental/S02-F03)_: The emit contract MUST guarantee that SOUL.md principles surface in the generated governance plugin output in an **observable form** — either as generated code comments, exported constants, or runtime-queryable metadata on the plugin's exported object. Emitting principles as silent pipeline metadata (parsed but not rendered) would defeat the `incremental/S02` test assertion that an added principle reaches the emitted artifact, and more importantly would mean operators cannot verify that their SOUL.md edits are actually reaching production governance.

**Signatures embedded in emit** _(Source: incremental/S03-F04)_: Emitted artifacts that carry signed metadata (per the audit chain) MUST embed the signature bytes directly in the emit output — not by reference to an external key material file. This makes key-rotation effects observable: after rotating the audit-chain signing key, the emit output bytes MUST differ from the pre-rotation bytes even if all 9 input files are unchanged. A byte-identical emit across a key rotation indicates either the signing step was a no-op or the rotation wasn't effective — both are silent bugs.

**Deterministic JSON key ordering** _(Source: incremental/S01-F08)_: Emitted JSON files (e.g. `.claws-manifest.json`, Bedrock guardrail JSON) MUST use a stable key order — either alphabetic sort or a fixed schema-driven order. Non-deterministic key order defeats snapshot testing and produces spurious diffs across builds. This subsumes the general CL-14 §2.4 determinism requirement.

**Stage-timing stability for snapshot testing**: `stageTimings` output (§IS.4) SHOULD be serializable to a deterministic JSON form (keys sorted, durations optionally rounded when snapshotting) so CI snapshots can detect cache-behavior regressions over time without bit-flip noise. _(Source: incremental/S01-F08)_

## Open Questions

1. Should the compiler include an LLM-assisted extraction mode for SOUL.md constraints below the 0.5 confidence threshold?
2. How should the GovernanceIR be versioned across workspaces in a fleet? Push compiled IR or recompile per-workspace?
3. Can the optimizer perform cross-workspace optimization (shared guard libraries for identical tool sets)?
4. Should `claws import` (reverse-compile) reconstruct a GovernanceAST from existing enforcement code?
5. How does workflow inversion interact with lobster.yaml schema versions?
6. Should the conflict table be expanded from 7 to 8 categories with USER-TOOL-GHOST? _(Source: CP-S02-F03)_
7. Should SKILL-TOOL-GHOST be reclassified as a lint rule (G1 assertion) rather than a cross-file conflict category? _(Source: CFC-S06-F02)_
8. Should DATA-LABEL-MISMATCH severity scale with label distance (1-level downgrade = warning, 2+ levels = error)? Currently all downgrades are errors. _(Source: CFC-S04-F07)_
9. Should the staging directory use per-invocation UUIDs (`.claws/staging-{uuid}/`) to prevent concurrent build race conditions? _(Source: PC2-S02)_
10. Should the polyfill for AbortSignal.timeout() be a separate importable module or inlined in the generated handler? _(Source: PC2-S06)_
11. Should the PRESS safety keyword allowlist be curated per compliance framework (SOC2, HIPAA, PCI)? _(Source: PF2-S07)_

## Research References

| Source                     | What it contributed                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q12j                       | 5-phase pipeline, GovernanceIR types, mechanical intent extraction from 9 files, 7 cross-file conflict categories, workflow inversion, guard library architecture                |
| Q12m                       | claws-sdk sibling architecture, OperationIR TS emitter (OP9), QueryIR openclaw-memory target, DataFrame adapter inversion, IR reuse map (4 DIRECT, 4 EXTEND, 5 INSPIRE, 36 SKIP) |
| R1 review                  | CB-10 SDK mapping fix, Dragon type-level R5 constraint, EMIT phase 4-artifact model, conformance to FORMA/RELAX/PRESS, three-engine model, skill vs plugin correction            |
| claws-compile-dx plan (Ra) | §Incremental Stages: per-subsystem cache keys, 9-reader dependency graph, `CompileResult.stageTimings`, compile-level/stage-level cache layering                                 |

## Version History

| Version | Change                                                                                                                                                                                                                                                                                                                                                          | Source                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| v1.0    | Initial draft: 5-phase pipeline, GovernanceIR, 7 cross-file conflicts, EMIT 4-artifact model, all amendment sections (PC2, PF1, PF2, Anubis-Thoth, Pitfall P-162+, Integration)                                                                                                                                                                                 | Q12j, Q12m, R1 review                                                                                    |
| v1.1    | Added §Incremental Stages: per-subsystem cache keys, 9-reader dependency graph, `CompileResult.stageTimings` field, compile-level/stage-level cache layering rules. Enables `claws watch` (H1) and skips unchanged subsystems (H2).                                                                                                                             | `.craft/plans/claws-compile-dx.md` H2                                                                    |
| v1.2    | Scenario findings audit (claws-compile-dx R1): §IS.1 strengthened (downstream-key includes upstream IR hashes, emit-key includes signing-key identity, SHA-256 explicit, mtime fast-path, keySchemaVersion); §IS.7 added (atomic emit writes, principles observable in emit, signatures embedded, deterministic JSON ordering, stageTimings snapshot stability) | `.craft/waves/260412+ra-the-radiant+claws-graduation/panels/claws-compile-dx-findings-audit/R1-audit.md` |
