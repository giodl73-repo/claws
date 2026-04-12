# Experiment a: The Compilation Pipeline

**Method**: design analysis
**Date**: 2026-04-11

---

## Overview

The governance compiler transforms 9 workspace source files into executable enforcement code through a 5-phase pipeline that parallels the astro compiler:

```
                      glint compile                          glint build
                 ┌──────────────────────┐            ┌──────────────────┐
Workspace files  │ PARSE → EXTRACT →    │            │                  │
(9 source files) │        ANALYZE →     │ → GovIR → │ OPTIMIZE → EMIT  │ → Platform code
                 │                      │            │                  │
                 └──────────────────────┘            └──────────────────┘
```

`glint compile` runs phases 1-3 and produces the GovernanceIR (the intermediate representation). `glint build` takes the GovernanceIR through phases 4-5 and emits platform-native code. `glint pinch` is a subset of `glint compile` — it runs phases 1-3 and reports violations without proceeding to emit.

---

## Phase 1: PARSE

### Purpose

Read each of the 9 workspace source files into a typed GovernanceAST. Each file type has a dedicated parser. Missing files are handled gracefully (the workspace need not have all 9). Malformed content produces diagnostics, not crashes.

### Input

The workspace directory path. The parser walks the directory and reads each file it recognizes.

### Output

A `GovernanceAST` — a typed tree of nodes representing the workspace's governance surface.

### AST Node Types

```typescript
// ─── Top-Level AST ───────────────────────────────────────────────

interface GovernanceAST {
  readonly version: 1;
  readonly workspace: string;             // absolute path to workspace root
  readonly parsedAt: string;              // ISO 8601 timestamp
  readonly sources: SourceFile[];         // which files were found and parsed
  readonly soul: SoulNode | null;
  readonly agents: AgentsNode | null;
  readonly tools: ToolsNode | null;
  readonly identity: IdentityNode | null;
  readonly user: UserNode | null;
  readonly memory: MemoryNode | null;
  readonly heartbeat: HeartbeatNode | null;
  readonly skills: SkillNode[];           // one per skill directory
  readonly workflow: WorkflowNode | null;
  readonly diagnostics: Diagnostic[];     // parse-time diagnostics
}

interface SourceFile {
  readonly path: string;                  // relative to workspace root
  readonly kind: SourceKind;
  readonly hash: string;                  // SHA-256 for incremental recompilation
  readonly exists: boolean;
  readonly parsedOk: boolean;
}

type SourceKind =
  | 'soul' | 'agents' | 'tools' | 'identity' | 'user'
  | 'memory' | 'heartbeat' | 'skill' | 'workflow';

// ─── Diagnostic ──────────────────────────────────────────────────

interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly code: string;                  // e.g., "PARSE-001"
  readonly message: string;
  readonly source: string;                // file path
  readonly line?: number;
  readonly column?: number;
}

// ─── SOUL.md ─────────────────────────────────────────────────────

interface SoulNode {
  readonly kind: 'soul';
  readonly source: string;
  readonly identity: IdentityBlock;       // who the agent is
  readonly constraints: ConstraintNode[]; // behavioral rules
  readonly personality: PersonalityBlock; // tone, style
}

interface IdentityBlock {
  readonly name: string | null;
  readonly role: string | null;
  readonly description: string | null;
}

interface ConstraintNode {
  readonly kind: 'constraint';
  readonly text: string;                  // original prose
  readonly polarity: 'must' | 'must-not' | 'should' | 'should-not';
  readonly scope: 'tool' | 'communication' | 'data' | 'behavior' | 'general';
  readonly confidence: number;            // 0-1, parser's confidence in extraction
}

interface PersonalityBlock {
  readonly tone: string[];
  readonly style: string[];
}

// ─── AGENTS.md ───────────────────────────────────────────────────

interface AgentsNode {
  readonly kind: 'agents';
  readonly source: string;
  readonly subagents: SubagentNode[];
  readonly delegationRules: DelegationRuleNode[];
}

interface SubagentNode {
  readonly kind: 'subagent';
  readonly name: string;
  readonly description: string;
  readonly skills: string[];              // skill references
  readonly tools: string[];              // tool references
  readonly trustLevel: 'L0' | 'L1' | 'L2' | 'L3' | null;
  readonly oboAllowed: boolean;
}

interface DelegationRuleNode {
  readonly kind: 'delegation-rule';
  readonly from: string;                  // parent agent or "*"
  readonly to: string;                    // subagent name or pattern
  readonly permissions: string[];         // what can be delegated
  readonly maxChainDepth: number;         // default 1
}

// ─── TOOLS.md ────────────────────────────────────────────────────

interface ToolsNode {
  readonly kind: 'tools';
  readonly source: string;
  readonly tools: ToolNode[];
}

interface ToolNode {
  readonly kind: 'tool';
  readonly name: string;
  readonly description: string;
  readonly parameters?: Record<string, ToolParam>;
  readonly capabilities: ToolCapability[];  // extracted from description
  readonly riskHint?: RiskLevel;            // explicit annotation if present
}

type ToolCapability = 'READ' | 'WRITE' | 'COMMUNICATE' | 'EXECUTE' | 'TRANSACT';
type RiskLevel = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

interface ToolParam {
  readonly type: string;
  readonly description?: string;
  readonly required?: boolean;
}

// ─── IDENTITY.md ─────────────────────────────────────────────────

interface IdentityNode {
  readonly kind: 'identity';
  readonly source: string;
  readonly authMethod: string | null;     // "sso", "api-key", "certificate"
  readonly roles: string[];
  readonly attestationLevel: 'L0' | 'L1' | 'L2' | 'L3' | null;
  readonly ssoConfig?: SsoConfig;
}

interface SsoConfig {
  readonly provider: string;
  readonly tenantId?: string;
  readonly scopes?: string[];
}

// ─── USER.md ─────────────────────────────────────────────────────

interface UserNode {
  readonly kind: 'user';
  readonly source: string;
  readonly preferences: Record<string, string>;
  readonly authority: AuthorityBlock | null;
}

interface AuthorityBlock {
  readonly oboScope: string[];            // what the agent can do as-user
  readonly dataAccess: string[];          // data domains the agent can access
  readonly timezone?: string;
  readonly locale?: string;
}

// ─── MEMORY.md ───────────────────────────────────────────────────

interface MemoryNode {
  readonly kind: 'memory';
  readonly source: string;
  readonly storageType: 'local' | 'cloud' | 'hybrid' | null;
  readonly entries: MemoryEntry[];
  readonly retentionPolicy?: RetentionPolicy;
}

interface MemoryEntry {
  readonly key: string;
  readonly sensitivityLabel: DataLabel;
  readonly description?: string;
}

type DataLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

interface RetentionPolicy {
  readonly maxAge?: string;               // e.g., "30d", "1y"
  readonly autoDelete?: boolean;
}

// ─── HEARTBEAT.md ────────────────────────────────────────────────

interface HeartbeatNode {
  readonly kind: 'heartbeat';
  readonly source: string;
  readonly schedules: ScheduleNode[];
}

interface ScheduleNode {
  readonly kind: 'schedule';
  readonly name: string;
  readonly cron: string;
  readonly description: string;
  readonly maxDuration?: number;          // seconds
  readonly approvalRequired: boolean;
  readonly tools: string[];              // tools this schedule may use
}

// ─── skills/ ─────────────────────────────────────────────────────

interface SkillNode {
  readonly kind: 'skill';
  readonly source: string;                // path to skill directory
  readonly name: string;
  readonly type: 'markdown' | 'typescript' | 'cli';
  readonly instructions: string | null;   // SKILL.md content (type 1)
  readonly capabilities: string[];        // claimed capabilities
  readonly toolUsage: string[];           // tools the skill references
  readonly dataLabels: DataLabel[];       // data sensitivity
  readonly supplyChainStatus: SupplyChainStatus;
}

type SupplyChainStatus =
  | { kind: 'local' }                    // developed in workspace
  | { kind: 'marketplace'; signed: boolean; publisher: string }
  | { kind: 'custom'; origin: string };

// ─── lobster.yaml ────────────────────────────────────────────────

interface WorkflowNode {
  readonly kind: 'workflow';
  readonly source: string;
  readonly steps: WorkflowStep[];
  readonly escalationPoints: EscalationPoint[];
}

interface WorkflowStep {
  readonly name: string;
  readonly agent?: string;                // which agent runs this step
  readonly tools: string[];
  readonly dataFlow: DataFlowEdge[];
  readonly canRollback: boolean;
}

interface DataFlowEdge {
  readonly from: string;
  readonly to: string;
  readonly label: DataLabel;
}

interface EscalationPoint {
  readonly step: string;
  readonly condition: string;
  readonly target: 'human' | 'supervisor-agent';
}
```

### Parsing Strategy Per File

| # | File | Parser type | Missing file behavior | Malformed behavior |
|---|------|------------|----------------------|-------------------|
| 1 | SOUL.md | Markdown → section → constraint extraction | soul = null, info diagnostic | Parse what's parseable, warning per unparseable section |
| 2 | AGENTS.md | Markdown → structured subagent blocks | agents = null, info diagnostic | Parse recognized blocks, warning per malformed block |
| 3 | TOOLS.md | Markdown or YAML → tool definitions | tools = null, **error** (no tools = no governance surface) |  Warning per malformed tool |
| 4 | IDENTITY.md | Markdown → key-value extraction | identity = null, info diagnostic | Warning, fill nulls |
| 5 | USER.md | Markdown → preference extraction | user = null, info diagnostic | Warning, fill nulls |
| 6 | MEMORY.md | Markdown → memory entry extraction | memory = null, info diagnostic | Warning per entry |
| 7 | HEARTBEAT.md | Markdown → cron extraction | heartbeat = null, info diagnostic | Warning per schedule |
| 8 | skills/ | Directory walk → per-skill parse | skills = [], info diagnostic | Warning per skill, skip unparseable |
| 9 | lobster.yaml | YAML parse → workflow extraction | workflow = null, info diagnostic | Error if YAML is invalid syntax |

### Cross-File Reference Resolution

The parser performs cross-file reference resolution after individual files are parsed:

1. **AGENTS.md → skills/**: Subagent skill references resolve to parsed SkillNodes. Unresolved references produce a warning diagnostic.
2. **AGENTS.md → TOOLS.md**: Subagent tool references resolve to parsed ToolNodes. Unresolved references produce a warning.
3. **HEARTBEAT.md → TOOLS.md**: Schedule tool references resolve to ToolNodes.
4. **lobster.yaml → AGENTS.md**: Workflow step agent assignments resolve to SubagentNodes.
5. **lobster.yaml → TOOLS.md**: Workflow step tool references resolve to ToolNodes.
6. **skills/ → TOOLS.md**: Skill tool usage references resolve to ToolNodes.

---

## Phase 2: EXTRACT

### Purpose

Walk the GovernanceAST and extract a `CapabilityManifest` — the typed representation of everything the agent CAN do, IS configured to do, and SHOULD be governed for.

### Input

The `GovernanceAST` from Phase 1.

### Output

A `CapabilityManifest` — a flat, queryable structure that collapses the tree into governance-relevant facts.

### CapabilityManifest Type

```typescript
interface CapabilityManifest {
  readonly version: 1;
  readonly workspace: string;
  readonly extractedAt: string;

  // ─── Agent Identity ──────────────────
  readonly agentName: string | null;
  readonly agentRole: string | null;
  readonly authMethod: string | null;
  readonly attestationLevel: 'L0' | 'L1' | 'L2' | 'L3';

  // ─── Capability Surface ──────────────
  readonly tools: ToolManifestEntry[];
  readonly skills: SkillManifestEntry[];
  readonly totalCapabilities: Set<ToolCapability>;

  // ─── Delegation Graph ────────────────
  readonly subagents: SubagentManifestEntry[];
  readonly delegationEdges: DelegationEdge[];
  readonly hasA2A: boolean;               // true if AGENTS.md has subagents

  // ─── Data Governance ─────────────────
  readonly dataLabels: Map<string, DataLabel>;  // resource → label
  readonly highWaterMark: DataLabel;       // highest sensitivity in workspace
  readonly memoryEntries: MemoryManifestEntry[];

  // ─── Behavioral Constraints ──────────
  readonly constraints: ExtractedConstraint[];
  readonly denyPatterns: DenyPattern[];
  readonly elicitationRequirements: ElicitationRequirement[];

  // ─── Autonomy ────────────────────────
  readonly schedules: ScheduleManifestEntry[];
  readonly hasAutonomousOps: boolean;     // true if HEARTBEAT.md has schedules

  // ─── Workflows ───────────────────────
  readonly workflows: WorkflowManifestEntry[];
  readonly hasEscalation: boolean;

  // ─── Supply Chain ────────────────────
  readonly marketplaceSkills: number;
  readonly unsignedSkills: string[];
  readonly localSkills: number;

  // ─── Authority ───────────────────────
  readonly oboScope: string[];
  readonly userDataAccess: string[];
}

// ─── Manifest Entry Types ────────────────────────────────────────

interface ToolManifestEntry {
  readonly name: string;
  readonly risk: RiskLevel;               // R1-R5 (classified)
  readonly capabilities: ToolCapability[];
  readonly obo: boolean;                  // does this tool act AS the user?
  readonly dataLabels: DataLabel[];
  readonly referencedBy: string[];        // which files reference this tool
}

interface SkillManifestEntry {
  readonly name: string;
  readonly type: 'markdown' | 'typescript' | 'cli';
  readonly capabilities: ToolCapability[];
  readonly toolUsage: string[];
  readonly dataLabels: DataLabel[];
  readonly supplyChain: SupplyChainStatus;
}

interface SubagentManifestEntry {
  readonly name: string;
  readonly tools: string[];
  readonly skills: string[];
  readonly trustLevel: 'L0' | 'L1' | 'L2' | 'L3';
  readonly oboAllowed: boolean;
  readonly permissionCeiling: ToolCapability[];  // derived from tools
}

interface DelegationEdge {
  readonly from: string;                  // parent agent or "self"
  readonly to: string;                    // subagent name
  readonly permissions: ToolCapability[];
  readonly maxChainDepth: number;
  readonly dataFlowLabel: DataLabel;
}

interface ExtractedConstraint {
  readonly text: string;
  readonly polarity: 'must' | 'must-not' | 'should' | 'should-not';
  readonly scope: 'tool' | 'communication' | 'data' | 'behavior' | 'general';
  readonly mechanicalIntent: MechanicalIntent | null;  // null if not extractable
}

type MechanicalIntent =
  | DenyIntent
  | ElicitIntent
  | RequireIntent
  | LimitIntent
  | LabelIntent;

interface DenyIntent {
  readonly kind: 'deny';
  readonly scope: 'tool' | 'data' | 'communication';
  readonly pattern: string;               // glob pattern, e.g., "prod-*"
}

interface ElicitIntent {
  readonly kind: 'elicit';
  readonly tool: string;                  // tool name or pattern
  readonly reason: string;
}

interface RequireIntent {
  readonly kind: 'require';
  readonly what: string;                  // e.g., "confirmation", "audit"
  readonly when: string;                  // condition
}

interface LimitIntent {
  readonly kind: 'limit';
  readonly resource: string;              // e.g., "tokens", "steps", "tools"
  readonly max: number;
}

interface LabelIntent {
  readonly kind: 'label';
  readonly target: string;
  readonly label: DataLabel;
}

interface DenyPattern {
  readonly source: string;                // which constraint produced this
  readonly scope: 'tool' | 'data' | 'communication';
  readonly pattern: string;               // e.g., "prod-*", "*.secret"
}

interface ElicitationRequirement {
  readonly tool: string;
  readonly reason: string;                // from constraint or OBO detection
  readonly source: 'constraint' | 'obo-detection' | 'risk-classification';
}

interface MemoryManifestEntry {
  readonly key: string;
  readonly sensitivityLabel: DataLabel;
  readonly retentionMax: string | null;
}

interface ScheduleManifestEntry {
  readonly name: string;
  readonly cron: string;
  readonly maxDuration: number | null;
  readonly approvalRequired: boolean;
  readonly tools: string[];
  readonly risk: RiskLevel;               // derived from tools
}

interface WorkflowManifestEntry {
  readonly name: string;
  readonly steps: string[];
  readonly hasEscalation: boolean;
  readonly maxDataLabel: DataLabel;
}
```

### Extraction Logic

The extractor performs several transformations:

1. **Tool Risk Classification**: Each tool is classified R1-R5 based on its capabilities. The classification table:

| Capability | Default Risk | Conditions for Upgrade |
|-----------|-------------|----------------------|
| READ | R1 | R2 if data label >= INTERNAL |
| WRITE | R3 | R4 if scope is system/config |
| COMMUNICATE | R3 | R5 if OBO detected |
| EXECUTE | R4 | R5 if arbitrary code execution |
| TRANSACT | R5 | Always R5 |

2. **OBO Detection**: A tool is marked `obo: true` if:
   - Its description contains "on behalf of", "as the user", "send as"
   - Its capability is COMMUNICATE or TRANSACT
   - USER.md's oboScope includes the tool name
   - A SOUL.md constraint uses "ask before" with this tool

3. **Constraint → Mechanical Intent**: Natural language constraints are pattern-matched to typed intents (detailed in exp-b).

4. **High Water Mark**: The highest DataLabel across all tools, skills, memory entries, and workflow data flows becomes the workspace's `highWaterMark`. This gates what classification policies apply.

---

## Phase 3: ANALYZE

### Purpose

Apply all 29 governance rules (from Q12h) against the CapabilityManifest. Produce a `GovAnalysis` containing violations, warnings, the enforcement plan, and what `glint pinch` reports.

### Input

The `CapabilityManifest` from Phase 2, plus the workspace's `glint.json` policy configuration.

### Output

A `GovAnalysis` — the complete governance analysis.

### GovAnalysis Type

```typescript
interface GovAnalysis {
  readonly version: 1;
  readonly workspace: string;
  readonly analyzedAt: string;
  readonly manifest: CapabilityManifest;    // reference to input

  // ─── Rule Results ────────────────────
  readonly results: RuleResult[];
  readonly violations: RuleResult[];        // severity: 'error'
  readonly warnings: RuleResult[];          // severity: 'warning'
  readonly passed: RuleResult[];            // severity: 'pass'
  readonly skipped: RuleResult[];           // rule not applicable

  // ─── Summary ─────────────────────────
  readonly summary: AnalysisSummary;

  // ─── Enforcement Plan ────────────────
  readonly enforcementPlan: EnforcementPlan;

  // ─── Cross-File Conflicts ────────────
  readonly conflicts: ConflictResult[];
}

interface RuleResult {
  readonly rule: GovernanceRule;
  readonly severity: 'error' | 'warning' | 'pass' | 'skip';
  readonly message: string;
  readonly details?: string;
  readonly source?: string;               // file that triggered the finding
  readonly line?: number;
  readonly fix?: AutoFix;                 // for --fix mode
}

interface GovernanceRule {
  readonly id: string;                    // e.g., "G-CLASS-001"
  readonly group: RuleGroup;
  readonly name: string;
  readonly description: string;
  readonly owasp?: string;                // OWASP Agentic Top 10 reference
}

type RuleGroup =
  | 'G-CLASS' | 'G-PERM' | 'G-DATA'
  | 'G-A2A-IDENTITY' | 'G-A2A-TRUST' | 'G-A2A-FLOW' | 'G-A2A-ESCALATE' | 'G-A2A-DELEGATE'
  | 'G-INPUT' | 'G-CONTEXT' | 'G-OUTPUT' | 'G-BOUND'
  | 'G-ELICIT' | 'G-ELICIT-TIMEOUT' | 'G-ELICIT-CHAIN' | 'G-ELICIT-AUDIT'
  | 'G-SUPPLY';

interface AutoFix {
  readonly description: string;
  readonly edits: FileEdit[];
}

interface FileEdit {
  readonly file: string;
  readonly action: 'create' | 'modify' | 'delete';
  readonly content?: string;              // for create
  readonly search?: string;               // for modify (find)
  readonly replace?: string;              // for modify (replace with)
}

interface AnalysisSummary {
  readonly totalRules: number;
  readonly passed: number;
  readonly warnings: number;
  readonly violations: number;
  readonly skipped: number;
  readonly riskProfile: RiskLevel;        // highest risk tool in workspace
  readonly owaspCoverage: OwaspCoverage[];
  readonly durationMs: number;
}

interface OwaspCoverage {
  readonly risk: string;                  // "Excessive Agency", etc.
  readonly coverage: 'full' | 'partial' | 'none';
  readonly rules: string[];              // which rules provide coverage
}

// ─── Enforcement Plan ────────────────────────────────────────────

interface EnforcementPlan {
  readonly layers: EnforcementLayer[];
  readonly ruleToLayer: Map<string, string[]>;  // rule ID → layer IDs
  readonly unenforceable: string[];       // rules with no runtime enforcement
}

interface EnforcementLayer {
  readonly id: string;                    // "skill", "hook", "plugin", "exec", "sidecar"
  readonly rules: string[];              // rule IDs enforced by this layer
  readonly failMode: 'open' | 'closed';
  readonly latencyBudgetMs: number;
}

// ─── Conflict Detection ──────────────────────────────────────────

interface ConflictResult {
  readonly kind: ConflictKind;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly sources: string[];             // files involved
  readonly details: string;
}

type ConflictKind =
  | 'deny-vs-tool'       // SOUL denies something TOOLS provides
  | 'trust-escalation'   // subagent has higher trust than parent
  | 'obo-without-elicit' // OBO tool without elicitation gate
  | 'data-label-mismatch'// data flows between mismatched labels
  | 'circular-delegation'// A delegates to B delegates to A
  | 'skill-tool-ghost'   // skill references tool not in TOOLS.md
  | 'schedule-no-approval'// R5 tool in schedule without approval gate
  ;
```

### Rule Application

The analyzer runs each of the 29 governance rules in order. Each rule receives the full CapabilityManifest and produces zero or more RuleResults. Rules are organized by group:

| Group | Rules | What they check |
|-------|-------|----------------|
| G-CLASS (R1-R5) | 5 | Each tool's risk classification is declared and consistent |
| G-PERM | 3 | Capabilities don't exceed workspace trust tier |
| G-DATA | 2 | Data labels assigned, high water mark consistent |
| G-A2A-* | 5 | Subagent trust, identity, data flow, escalation, delegation |
| G-INPUT | 4 | Input validation patterns present |
| G-CONTEXT | 4 | Context isolation patterns present |
| G-OUTPUT | 4 | Output guard patterns present |
| G-BOUND | 4 | Budget, step, tool, recursion limits set |
| G-ELICIT | 4 | OBO tools have elicitation gates |
| G-SUPPLY | 1 | Marketplace skills are signed |

### Rule Skipping Logic

Rules are skipped (not just passed) when they're structurally inapplicable:

- **G-A2A-* (all 5)**: Skipped if `manifest.hasA2A === false` (no AGENTS.md subagents)
- **G-ELICIT (all 4)**: Skipped if no tools are marked `obo: true`
- **G-SUPPLY**: Skipped if `manifest.marketplaceSkills === 0`
- **G-BOUND-RECURSION**: Skipped if no workflows have cycles
- **G-CONTEXT-MEMORY**: Skipped if `manifest.memoryEntries.length === 0`

This is the foundation for Phase 4 optimization — skipped rules produce no emitted code.

---

## Phase 4: OPTIMIZE

### Purpose

Dead-code eliminate enforcement code for rules that don't apply to this workspace. Merge redundant checks. Minimize the runtime overhead of governance.

### Input

The `GovAnalysis` from Phase 3.

### Output

An `OptimizedPlan` — a minimized version of the enforcement plan that contains only the rules and guard functions this specific workspace needs.

### OptimizedPlan Type

```typescript
interface OptimizedPlan {
  readonly version: 1;
  readonly workspace: string;
  readonly optimizedAt: string;

  // ─── What was eliminated ─────────────
  readonly eliminated: EliminationRecord[];
  readonly mergedChecks: MergeRecord[];

  // ─── What remains ────────────────────
  readonly activeRules: string[];         // rule IDs that produce code
  readonly guardFunctions: GuardFunction[];
  readonly classificationTable: ClassificationEntry[];
  readonly elicitationTable: ElicitationEntry[];
  readonly a2aTrustTable: A2ATrustEntry[];

  // ─── Metrics ─────────────────────────
  readonly metrics: OptimizationMetrics;
}

interface EliminationRecord {
  readonly rule: string;
  readonly reason: string;                // "no-a2a", "no-obo", "no-marketplace-skills", etc.
}

interface MergeRecord {
  readonly rules: string[];               // rules that were merged
  readonly mergedInto: string;            // the surviving guard function
  readonly reason: string;
}

interface GuardFunction {
  readonly name: string;                  // function name in emitted code
  readonly rules: string[];              // which rules it enforces
  readonly layer: string;                // "hook", "plugin", "skill"
  readonly parameters: string[];         // function parameters
}

interface ClassificationEntry {
  readonly tool: string;
  readonly risk: RiskLevel;
  readonly capabilities: ToolCapability[];
  readonly failMode: 'open' | 'closed';
  readonly obo: boolean;
  readonly elicitation: ElicitationConfig | null;
}

interface ElicitationConfig {
  readonly mode: 'inline' | 'async';
  readonly timeout: number;               // seconds
  readonly denyDefault: boolean;
}

interface ElicitationEntry {
  readonly tool: string;
  readonly reason: string;
  readonly mode: 'inline' | 'async';
  readonly timeout: number;
}

interface A2ATrustEntry {
  readonly source: string;
  readonly target: string;
  readonly allowed: boolean;
  readonly dataFlowCeiling: DataLabel;
  readonly permissionCeiling: ToolCapability[];
}

interface OptimizationMetrics {
  readonly totalRules: number;
  readonly activeRules: number;
  readonly eliminatedRules: number;
  readonly mergedChecks: number;
  readonly estimatedRuntimeMs: number;    // per-tool-call overhead
  readonly generatedFunctions: number;
}
```

### Optimization Passes

1. **Dead Rule Elimination**: Remove all rules marked `skip` in GovAnalysis. No code emitted.

2. **Constant Folding**: If all tools have the same risk level, the classification function collapses to a constant return. If all tools are R1, the elicitation check is eliminated entirely.

3. **Check Merging**: Rules that check the same property at the same enforcement point merge into a single guard function. Example: G-CLASS-001 (tool risk) and G-PERM-001 (capability check) both run on tool invocation → merge into `classifyAndCheckTool()`.

4. **Table Compression**: The classification table is sorted by access frequency (most-called tools first). Tools with identical classification share a single table row.

5. **Layer Consolidation**: If only one enforcement layer is needed (e.g., only the hook layer for a simple workspace), the plugin and skill layers are eliminated from the emit plan.

---

## Phase 5: EMIT

### Purpose

Generate platform-native enforcement code from the OptimizedPlan. Each target platform gets its own emitter. New platforms are added by implementing the `Emitter` interface.

### Input

The `OptimizedPlan` from Phase 4.

### Output

Platform-specific files written to `build/<target>/`.

### Emitter Interface

```typescript
interface Emitter {
  readonly target: EmitTarget;
  readonly fileExtension: string;
  readonly description: string;

  emit(plan: OptimizedPlan, analysis: GovAnalysis, options: EmitOptions): EmitResult;
}

type EmitTarget =
  | 'openclaw'    // TypeScript skill + plugin + hook
  | 'cursor'      // .cursorrules markdown section
  | 'claude'      // CLAUDE.md section
  | 'github'      // .github/copilot-instructions.md section
  | 'bedrock'     // AWS Guardrail policy JSON
  | 'langgraph'   // Python guard decorators
  | 'crewai';     // YAML guard config

interface EmitOptions {
  readonly outDir: string;                // default: build/<target>/
  readonly dryRun: boolean;
  readonly minify: boolean;
  readonly sourceMap: boolean;            // embed source references in comments
  readonly includeTests: boolean;         // emit test files alongside guards
}

interface EmitResult {
  readonly target: EmitTarget;
  readonly files: EmittedFile[];
  readonly totalTokens: number;           // for markdown targets
  readonly totalBytes: number;            // for code targets
  readonly durationMs: number;
}

interface EmittedFile {
  readonly path: string;                  // relative to outDir
  readonly content: string;
  readonly purpose: string;               // description
  readonly hash: string;                  // SHA-256
}
```

### Per-Target Emit Strategy

| Target | Output files | Strategy |
|--------|-------------|----------|
| `openclaw` | `skills/glint-governance/SKILL.md`, `skills/glint-governance/guard.ts`, `hooks/glint-guard.ts`, `plugins/glint-gateway/index.ts` | Full enforcement code — typed TypeScript with runtime guards |
| `cursor` | `build/cursor/.cursorrules` | Governance rules as structured markdown sections appended to cursorrules |
| `claude` | `build/claude/CLAUDE.md` | Governance rules as structured markdown sections |
| `github` | `build/github/.github/copilot-instructions.md` | Governance rules as copilot instructions |
| `bedrock` | `build/bedrock/guardrail.json` | AWS Guardrail API-compatible JSON policy |
| `langgraph` | `build/langgraph/guards.py`, `build/langgraph/decorators.py` | Python decorator functions wrapping guard logic |
| `crewai` | `build/crewai/guards.yaml` | YAML guard configuration for CrewAI tasks |

### Adding a New Emitter

To add a new platform target:

```typescript
// 1. Implement the Emitter interface
class MyPlatformEmitter implements Emitter {
  readonly target = 'myplatform' as EmitTarget;
  readonly fileExtension = '.json';
  readonly description = 'MyPlatform guard config';

  emit(plan: OptimizedPlan, analysis: GovAnalysis, options: EmitOptions): EmitResult {
    // Transform plan into platform-specific format
    const files: EmittedFile[] = [];
    // ... generate files
    return { target: this.target, files, totalTokens: 0, totalBytes: 0, durationMs: 0 };
  }
}

// 2. Register in the emitter registry
emitterRegistry.register(new MyPlatformEmitter());
```

---

## Workflow Inversion (Phase 5 Extension)

### The Insight

OpenClaw workflows (lobster.yaml) define DAGs that call skills and tools. The compiler does not just emit governance skills alongside the workflow — it reads the workflow, identifies governance-sensitive steps, and INJECTS governance steps directly into the DAG. The user writes the workflow; the compiler makes it safe.

Three enforcement levels, escalating:

| Level | Mechanism | What it does | Already covered? |
|-------|-----------|-------------|-----------------|
| 1. Hook (passive) | `before_tool_call` | Intercepts tool calls at runtime | Yes (Phase 5 hook emit) |
| 2. Skill (active) | Governance skill as context | Agent sees governance instructions | Yes (Phase 5 skill emit) |
| 3. Compiler (generative) | Workflow rewriting | Injects governance steps into the DAG | **NEW** |

Level 3 is the most powerful: the compiler reads `lobster.yaml`, identifies steps that touch R5 tools, A2A calls, or data-sensitive operations, and emits `lobster.compiled.yaml` with governance steps woven in. The injected steps call the generated governance skills.

### Workflow Compilation Example

**Input** — `lobster.yaml` (user-authored):
```yaml
name: customer-support
steps:
  - name: trigger
    on: message
  - name: research
    skill: web-search
    tools: [web-search, kb-read]
  - name: draft
    skill: email-drafter
    tools: [compose-email]
  - name: send-email
    skill: email-sender
    tools: [send-email]       # R5/OBO — acts AS user
  - name: respond
    skill: chat-respond
    tools: [post-message]
```

**Output** — `lobster.compiled.yaml` (compiler-generated):
```yaml
name: customer-support
# Auto-generated by glint. Do not edit — run `glint build` to regenerate.
# Source: lobster.yaml (SHA-256: a1b2c3...)
steps:
  - name: trigger
    on: message
  - name: glint-classify-research       # INJECTED: classify tools before research
    skill: glint-governance/classify-step
    input:
      tools: [web-search, kb-read]
      risk_threshold: R2
  - name: research
    skill: web-search
    tools: [web-search, kb-read]
    depends_on: [glint-classify-research]
  - name: draft
    skill: email-drafter
    tools: [compose-email]
  - name: glint-elicit-send-email       # INJECTED: OBO gate before send-email
    skill: glint-governance/elicit-step
    input:
      tool: send-email
      action: "send email as user"
      timeout: 300
      deny_default: true
    depends_on: [draft]
  - name: send-email
    skill: email-sender
    tools: [send-email]
    depends_on: [glint-elicit-send-email]  # now depends on elicitation gate
  - name: glint-audit-send-email        # INJECTED: audit after OBO action
    skill: glint-governance/audit-step
    input:
      tool: send-email
      event_type: obo-action
      capture: [recipient, subject]
    depends_on: [send-email]
  - name: respond
    skill: chat-respond
    tools: [post-message]
    depends_on: [glint-audit-send-email]
```

### Injection Rules

The compiler applies these rules when rewriting the workflow DAG:

| Condition | Injected step | Position |
|-----------|--------------|----------|
| Step uses R3+ tools | `glint-classify-{step}` | Before the step |
| Step uses R5/OBO tool | `glint-elicit-{step}` | Before the step (after classify if both) |
| Step involves A2A delegation | `glint-a2a-check-{step}` | Before the step |
| Step uses CONFIDENTIAL+ data | `glint-data-label-{step}` | Before the step |
| Step completes an OBO action | `glint-audit-{step}` | After the step |
| Step completes a WRITE/EXECUTE | `glint-audit-{step}` | After the step |

### Dependency Rewiring

When a governance step is injected BEFORE step X:
- The governance step inherits all of X's `depends_on` entries
- X's `depends_on` is rewritten to depend on the governance step
- This preserves DAG ordering while inserting the gate

When a governance step is injected AFTER step X:
- The governance step depends on X
- All steps that previously depended on X now depend on the governance step

### Updated Emit Output

The OpenClaw emitter produces these additional files:

| File | Purpose |
|------|---------|
| `lobster.compiled.yaml` | Rewritten workflow with governance steps |
| `skills/glint-governance/classify-step.ts` | Classification step handler |
| `skills/glint-governance/elicit-step.ts` | Elicitation gate step handler |
| `skills/glint-governance/audit-step.ts` | Audit recording step handler |
| `skills/glint-governance/a2a-check-step.ts` | A2A trust verification step handler |
| `skills/glint-governance/data-label-step.ts` | Data label verification step handler |

"We create the skills and the workflows call us." The user writes `lobster.yaml`; the compiler emits `lobster.compiled.yaml` that calls governance skills at every governance-sensitive point.

---

## The GovernanceIR

The intermediate representation is the combination of `CapabilityManifest` + `GovAnalysis`. This is what `glint compile` serializes to `.glint/compiled/governance-ir.json`. It is a stable, versioned, inspectable artifact.

```typescript
interface GovernanceIR {
  readonly version: 1;
  readonly manifest: CapabilityManifest;
  readonly analysis: GovAnalysis;
  readonly hash: string;                  // SHA-256 of the IR
}
```

`glint inspect` reads this file and prints it human-readably. `glint build` reads this file and passes it through OPTIMIZE and EMIT. `glint diff` compares two IR files and shows what changed.

---

## Command Mapping

| Phase | glint compile | glint build | glint pinch |
|-------|:------------:|:-----------:|:-----------:|
| 1. PARSE | Yes | Yes | Yes |
| 2. EXTRACT | Yes | Yes | Yes |
| 3. ANALYZE | Yes | Yes | Yes |
| 4. OPTIMIZE | No | Yes | No |
| 5. EMIT | No | Yes | No |
| Output | GovernanceIR | Platform code | Violations/warnings |

`glint compile` produces the IR (phases 1-3). `glint build` produces the IR and then platform code (phases 1-5). `glint pinch` produces only the analysis report (phases 1-3, report only).

---

## Error Handling

| Phase | Error type | Behavior |
|-------|-----------|----------|
| PARSE | Missing required file (TOOLS.md) | Error diagnostic, compilation continues with reduced manifest |
| PARSE | Malformed YAML in lobster.yaml | Error diagnostic, workflow = null |
| PARSE | Unparseable markdown section | Warning diagnostic, skip section |
| EXTRACT | Tool with no classifiable capability | Warning, default to R3/WRITE |
| EXTRACT | Unresolvable cross-file reference | Warning diagnostic |
| ANALYZE | Rule violation | Error in result, continues checking remaining rules |
| ANALYZE | Rule produces contradictory results | Conflict in conflicts[], both results preserved |
| OPTIMIZE | All rules eliminated | Info: "no governance rules apply", emit minimal stub |
| EMIT | Target not supported | Error, list available targets |
| EMIT | Output directory not writable | Error, suggest --dry-run |

---

## Performance Budget

| Phase | Target latency | Scaling factor |
|-------|---------------|----------------|
| PARSE | < 100ms | 9 files, largest is skills/ directory walk |
| EXTRACT | < 50ms | Linear in AST node count |
| ANALYZE | < 200ms | 29 rules x manifest size |
| OPTIMIZE | < 50ms | Linear in active rules |
| EMIT | < 100ms | Per emitter, parallel for multi-target |
| **Total (glint build)** | **< 500ms** | Target: instant feedback |
| **Total (glint pinch)** | **< 350ms** | No optimize/emit |

---

## Findings

1. The 5-phase pipeline maps cleanly to glint's command surface: `compile` (phases 1-3), `build` (phases 1-5), `pinch` (phases 1-3, report only).

2. The GovernanceIR is the stable pivot point — serializable, inspectable, diffable, cacheable. It decouples analysis from emission, enabling incremental recompilation.

3. The emitter interface makes new platforms trivial to add. The core governance analysis is done once; only the final code generation differs per platform.

4. The optimization phase is what makes this a COMPILER, not a linter. A linter reports; a compiler eliminates dead code, merges redundant checks, and emits minimized enforcement. The optimizer reduces runtime overhead to only what the workspace actually needs.

5. TOOLS.md is the only source file whose absence is a true error — without tools, there is no capability surface to govern. All other files degrade gracefully.
