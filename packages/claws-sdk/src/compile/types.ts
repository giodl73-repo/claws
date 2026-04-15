/**
 * Types for the claws parse pipeline.
 *
 * ParseResult, FileEntry (present/absent), ParseDiagnostic with file:line,
 * CGRProvenance record, and InputResolver source types.
 *
 * @module claws-sdk/compile/types
 */

/**
 * The 9 default OC workspace file sources.
 *
 * These are the files that claws reads from an agent workspace:
 * SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md,
 * HEARTBEAT.md, skills/ directory, and lobster.yaml.
 */
export const DEFAULT_FILE_SOURCES = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'IDENTITY.md',
  'USER.md',
  'MEMORY.md',
  'HEARTBEAT.md',
  'skills/',
  'lobster.yaml',
] as const;

/** A default OC workspace file source name. */
export type DefaultFileSource = (typeof DEFAULT_FILE_SOURCES)[number];

/**
 * Source type for InputResolver resolution.
 *
 * - 'filesystem': default file read from workspace root
 * - 'package': npm package source (deferred to future pulse)
 * - 'url': URL source from claws.json inputs (deferred to future pulse)
 */
export type SourceType = 'filesystem' | 'package' | 'url';

/**
 * CGR (Compiler Governance Record) provenance for a single source.
 *
 * Spec 89: Every file read records its origin, content hash, and
 * read timestamp for audit trails.
 */
export interface CGRProvenance {
  /** Source file path (relative to workspace root). */
  readonly source: string;
  /** How this source was resolved. */
  readonly sourceType: SourceType;
  /** SHA-256 hash of the normalized content (BOM-stripped, LF-normalized). */
  readonly contentHash: string;
  /** ISO 8601 timestamp when the file was read. */
  readonly readAt: string;
  /** Byte size of the raw content before normalization. */
  readonly rawSize: number;
}

/**
 * A present file entry -- the file was found and read successfully.
 */
export interface FileEntryPresent {
  readonly status: 'present';
  /** Relative path to the file from workspace root. */
  readonly source: string;
  /** Raw content of the file (after BOM strip + LF normalization). */
  readonly content: string;
  /** CGR provenance record. */
  readonly provenance: CGRProvenance;
}

/**
 * An absent file entry -- the file was not found.
 *
 * Per CP-S03-F06: absent files produce warnings with specific defaults,
 * not errors.
 */
export interface FileEntryAbsent {
  readonly status: 'absent';
  /** Relative path that was expected. */
  readonly source: string;
  /** Human-readable default description for the missing file. */
  readonly defaultDescription: string;
}

/** A file entry is either present or absent. */
export type FileEntry = FileEntryPresent | FileEntryAbsent;

/**
 * Severity levels for parse diagnostics.
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A parse diagnostic with file:line:column location.
 *
 * Produced when a file is malformed or has structural issues.
 */
export interface ParseDiagnostic {
  /** Severity of the diagnostic. */
  readonly severity: DiagnosticSeverity;
  /** Diagnostic message. */
  readonly message: string;
  /** Source file path (relative to workspace root). */
  readonly file: string;
  /** 1-based line number (undefined if not locatable). */
  readonly line?: number;
  /** 1-based column number (undefined if not locatable). */
  readonly column?: number;
  /** Diagnostic code for programmatic matching. */
  readonly code: string;
}

/**
 * Result of the parse phase.
 *
 * Contains file entries for all 9 default sources (present or absent),
 * diagnostics from malformed files, and CGR provenance records.
 *
 * P-060: Collect-all-errors -- ALL files are parsed before returning.
 * P-108: Per-file parser isolation -- failure in one file does not
 * corrupt parser state for other files.
 */
export interface ParseResult {
  /** File entries for all resolved sources. */
  readonly entries: readonly FileEntry[];
  /** Diagnostics from malformed or problematic files. */
  readonly diagnostics: readonly ParseDiagnostic[];
  /** Total count of present entries. */
  readonly presentCount: number;
  /** Total count of absent entries. */
  readonly absentCount: number;
  /** Whether the parse phase should halt (all files failed). */
  readonly shouldHalt: boolean;
}

/**
 * Configuration for the claws compiler.
 *
 * Minimal config surface for parse phase -- expanded in later pulses.
 */
export interface ClawsConfig {
  /** Additional input sources beyond the 9 defaults. */
  readonly inputs?: readonly InputSource[];
}

/**
 * An additional input source from claws.json.
 */
export interface InputSource {
  /** Source type. */
  readonly type: SourceType;
  /** Source path, package name, or URL. */
  readonly target: string;
}

/**
 * Default descriptions for absent OC workspace files.
 *
 * Per CP-S03-F06: each absent file gets a specific default message
 * explaining what the file would provide and the fallback behavior.
 */
export const ABSENT_DEFAULTS: Record<DefaultFileSource, string> = {
  'SOUL.md': 'SOUL.md not found -- agent has no persona or purpose declaration',
  'TOOLS.md': 'TOOLS.md not found -- no tool guidance defined',
  'AGENTS.md': 'AGENTS.md not found -- no agent delegation defined',
  'IDENTITY.md': 'IDENTITY.md not found -- defaults to L0 identity',
  'USER.md': 'USER.md not found -- no user profile defined',
  'MEMORY.md': 'MEMORY.md not found -- no durable memory defined',
  'HEARTBEAT.md': 'HEARTBEAT.md not found -- no lifecycle hooks defined',
  'skills/': 'skills/ not found -- no skills directory defined',
  'lobster.yaml': 'lobster.yaml not found -- no workflow defined',
};

// ── Intent Extraction Types ───────────────────────────────────────────

/**
 * Confidence score for an extracted intent (0.0 -- 1.0).
 *
 * Intents above 0.5 are automatically extracted.
 * Intents at or below 0.5 are flagged for user confirmation.
 */
export type ConfidenceScore = number;

/**
 * Auto-extract threshold. Intents with confidence > this value
 * are automatically included; at or below are flagged.
 */
export const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Keyword-to-confidence mapping for SOUL.md extraction.
 *
 * Keywords are matched case-insensitively at word boundaries.
 */
export const SOUL_KEYWORD_CONFIDENCE: Record<string, ConfidenceScore> = {
  // Formal keywords (original)
  'never': 0.95,
  'must not': 0.95,
  'always': 0.90,
  'require': 0.85,
  'should not': 0.70,
  'avoid': 0.60,
  'prefer': 0.55,
  'be careful': 0.30,
  'consider': 0.25,
  // Natural language deny constraints (CL-09 format tolerance)
  "don't let": 0.90,
  "don't ever": 0.95,
  "do not": 0.90,
  "not allowed to": 0.90,
  "always check with me before": 0.85,
  "check with me before": 0.80,
  "make sure": 0.70,
  "under no circumstances": 0.95,
};

/**
 * Scope qualifier for a SOUL.md constraint.
 *
 * - 'tool': applies to a specific tool or tool pattern
 * - 'action': applies to a category of actions
 * - 'data': applies to data categories
 * - 'agent': applies to agent behavior
 */
export type ConstraintScope = 'tool' | 'action' | 'data' | 'agent';

/**
 * A single extracted intent from a SOUL.md constraint line.
 */
export interface SoulIntent {
  /** The keyword that anchored this extraction. */
  readonly keyword: string;
  /** Confidence score from keyword lookup. */
  readonly confidence: ConfidenceScore;
  /** Scope qualifier (what the constraint applies to). */
  readonly scope: ConstraintScope;
  /** Pattern or target of the constraint. */
  readonly pattern: string;
  /** The original raw line from SOUL.md. */
  readonly rawLine: string;
  /** 1-based line number in the source file. */
  readonly line: number;
  /** Whether this intent is auto-extracted (confidence > 0.5). */
  readonly autoExtracted: boolean;
  /** Mapped mechanical intent kind. */
  readonly intentKind: 'deny' | 'elicit' | 'require' | 'limit' | 'label';
}

/**
 * R1-R5 tool risk classification per CL-02 G-CLASS rules.
 *
 * - R1: computation only (pure functions)
 * - R2: file system access
 * - R3: external API calls
 * - R4: production read access
 * - R5: production write access
 */
export type ToolRiskClass = 1 | 2 | 3 | 4 | 5;

/**
 * A single tool manifest entry extracted from TOOLS.md.
 */
export interface ToolManifestEntry {
  /** Tool name. */
  readonly name: string;
  /** Risk classification R1-R5. */
  readonly riskClass: ToolRiskClass;
  /** Whether this tool operates on-behalf-of another principal. */
  readonly oboFlag: boolean;
  /** Capability tags extracted from description. */
  readonly capabilities: readonly string[];
  /** Raw description text. */
  readonly description: string;
  /** 1-based line number in the source file. */
  readonly line: number;
}

/**
 * A delegation edge in the agent delegation graph.
 */
export interface DelegationIntent {
  /** Source agent name. */
  readonly from: string;
  /** Target agent name. */
  readonly to: string;
  /** Tools the delegation carries. */
  readonly tools: readonly string[];
  /** 1-based line number in the source file. */
  readonly line: number;
}

/**
 * Authentication method extracted from IDENTITY.md.
 */
export type AuthMethod = 'none' | 'basic' | 'token' | 'certificate' | 'sso';

/**
 * Attestation level extracted from IDENTITY.md.
 */
export type AttestationLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/**
 * Identity intent extracted from IDENTITY.md.
 */
export interface IdentityIntent {
  /** Organization name. */
  readonly organization: string;
  /** Team name. */
  readonly team: string;
  /** Authentication method. */
  readonly authMethod: AuthMethod;
  /** Trust/attestation level. */
  readonly attestationLevel: AttestationLevel;
}

/**
 * OBO (on-behalf-of) scope extracted from USER.md.
 */
export interface AuthorityIntent {
  /** User role. */
  readonly role: string;
  /** Authority bounds (what the user authorizes). */
  readonly bounds: readonly string[];
  /** 1-based line number in the source file. */
  readonly line: number;
}

/**
 * Data label for memory retention extracted from MEMORY.md.
 */
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * Memory intent extracted from MEMORY.md.
 */
export interface MemoryIntent {
  /** Label/title of the memory entry. */
  readonly label: string;
  /** Data sensitivity classification. */
  readonly sensitivity: DataSensitivity;
  /** Retention hint (e.g., "permanent", "30d", "session"). */
  readonly retention: string;
  /** 1-based line number in the source file. */
  readonly line: number;
}

/**
 * Schedule extracted from HEARTBEAT.md.
 */
export interface ScheduleIntent {
  /** Schedule trigger (e.g. "on_start", "every_5m"). */
  readonly trigger: string;
  /** Actions to perform on this schedule. */
  readonly actions: readonly string[];
  /** Derived risk level based on action sensitivity. */
  readonly riskLevel: ToolRiskClass;
  /** 1-based line number in the source file. */
  readonly line: number;
}

/**
 * Skill intent extracted from skills/ directory.
 */
export interface SkillIntent {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Tools required by this skill. */
  readonly requiredTools: readonly string[];
  /** 1-based line number in the source content. */
  readonly line: number;
}

/**
 * Workflow step extracted from lobster.yaml.
 */
export interface WorkflowStep {
  /** Step name. */
  readonly name: string;
  /** Step command or action. */
  readonly command: string;
}

/**
 * Workflow intent extracted from lobster.yaml.
 */
export interface WorkflowIntent {
  /** Workflow name. */
  readonly name: string;
  /** Workflow description. */
  readonly description: string;
  /** Ordered steps forming the DAG. */
  readonly steps: readonly WorkflowStep[];
  /** Dependencies between steps (step name -> depends-on names). */
  readonly dependencies: Record<string, readonly string[]>;
}

/**
 * Result of intent extraction from a single OC workspace file.
 *
 * Each extractor returns an IntentResult with typed intents and
 * any extraction diagnostics.
 */
export interface IntentResult<T> {
  /** Source file that was analyzed. */
  readonly source: string;
  /** Extracted intents. */
  readonly intents: readonly T[];
  /** Diagnostics produced during extraction. */
  readonly diagnostics: readonly ParseDiagnostic[];
}

// ── GovernanceAST Types ─────────────────────────────────────────────────

/**
 * Intent categories in the GovernanceAST.
 *
 * Maps the 9 OC workspace files to governance intent categories.
 */
export type IntentCategory =
  | 'deny'
  | 'tool'
  | 'delegation'
  | 'identity'
  | 'authority'
  | 'memory'
  | 'schedule'
  | 'skill'
  | 'workflow';

/**
 * A source-attributed intent group within the GovernanceAST.
 *
 * Each group contains intents from a single source file,
 * categorized by intent type.
 */
export interface IntentGroup<T> {
  /** Source file that produced these intents. */
  readonly source: string;
  /** The intents in this group. */
  readonly intents: readonly T[];
}

/**
 * A cross-reference resolution result.
 *
 * When a SOUL.md deny constraint references a tool name, pass 2
 * resolves it against the TOOLS.md tool declarations.
 */
export interface CrossReference {
  /** The source of the reference (e.g., SOUL.md deny intent). */
  readonly fromSource: string;
  /** 1-based line number of the reference. */
  readonly fromLine: number;
  /** The referenced name (e.g., tool name). */
  readonly referencedName: string;
  /** The normalized name used for lookup. */
  readonly normalizedName: string;
  /** Whether the reference was resolved. */
  readonly resolved: boolean;
  /** The resolved target source, if found. */
  readonly targetSource?: string | undefined;
}

/**
 * GovernanceAST — intermediate representation grouping intents by category.
 *
 * Constructed from per-file IntentResult arrays (pass 1 output).
 * Pass 2 cross-reference resolution links deny constraints to tool
 * declarations and resolves delegation targets.
 *
 * This is NOT the GovernanceIR — it is an intermediate form before
 * governance analysis by claws-rules.
 */
export interface GovernanceAST {
  /** Deny intents from SOUL.md (constraints with "never", "must not", etc.). */
  readonly deny: readonly IntentGroup<SoulIntent>[];
  /** Tool declarations from TOOLS.md. */
  readonly tool: readonly IntentGroup<ToolManifestEntry>[];
  /** Delegation edges from AGENTS.md. */
  readonly delegation: readonly IntentGroup<DelegationIntent>[];
  /** Identity from IDENTITY.md. */
  readonly identity: readonly IntentGroup<IdentityIntent>[];
  /** Authority from USER.md. */
  readonly authority: readonly IntentGroup<AuthorityIntent>[];
  /** Memory entries from MEMORY.md. */
  readonly memory: readonly IntentGroup<MemoryIntent>[];
  /** Schedule entries from HEARTBEAT.md. */
  readonly schedule: readonly IntentGroup<ScheduleIntent>[];
  /** Skills from skills/ directory. */
  readonly skill: readonly IntentGroup<SkillIntent>[];
  /** Workflows from lobster.yaml. */
  readonly workflow: readonly IntentGroup<WorkflowIntent>[];
  /** Cross-references resolved in pass 2. */
  readonly crossReferences: readonly CrossReference[];
  /** Diagnostics from AST construction and cross-reference resolution. */
  readonly diagnostics: readonly ParseDiagnostic[];
}

// ── ParsedManifest Types ───────────────────────────────────────────────

/**
 * A flat tool entry in the ParsedManifest.
 *
 * Combines tool declaration data with deny constraints that reference it.
 */
export interface ToolEntry {
  /** Tool name. */
  readonly name: string;
  /** Normalized name (lowercase, hyphens). */
  readonly normalizedName: string;
  /** Risk classification R1-R5. */
  readonly riskClass: ToolRiskClass;
  /** Whether this tool operates on-behalf-of another principal. */
  readonly oboFlag: boolean;
  /** Capability tags from description. */
  readonly capabilities: readonly string[];
  /** Source file and line where the tool was declared. */
  readonly source: string;
  /** 1-based line number in source. */
  readonly line: number;
  /** Deny constraints referencing this tool (from SOUL.md). */
  readonly denyConstraints: readonly SoulIntent[];
}

/**
 * A flat skill entry in the ParsedManifest.
 */
export interface SkillEntry {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Tools required by this skill. */
  readonly requiredTools: readonly string[];
  /** Source file. */
  readonly source: string;
  /** 1-based line number. */
  readonly line: number;
}

/**
 * An agent roster entry in the ParsedManifest.
 */
export interface AgentRosterEntry {
  /** Agent name. */
  readonly name: string;
  /** Tools this agent has access to. */
  readonly tools: readonly string[];
  /** Agents this agent delegates to. */
  readonly delegatesTo: readonly string[];
  /** Maximum delegation depth from this agent. */
  readonly delegationDepth: number;
  /** Source file. */
  readonly source: string;
  /** 1-based line number. */
  readonly line: number;
}

/**
 * A data label entry in the ParsedManifest.
 */
export interface DataLabelEntry {
  /** Label name. */
  readonly label: string;
  /** Data sensitivity classification. */
  readonly sensitivity: DataSensitivity;
  /** Retention hint. */
  readonly retention: string;
  /** Source file. */
  readonly source: string;
  /** 1-based line number. */
  readonly line: number;
}

// ── Conflict Detection Types ──────────────────────────────────────────

/**
 * The 7 conflict categories detected by cross-file conflict analysis.
 *
 * CLAWS-C001: DENY-vs-TOOL — deny constraint contradicts tool declaration
 * CLAWS-C002: TRUST-ESCALATION — subagent holds R4+ tools under lower-tier parent
 * CLAWS-C003: OBO-WITHOUT-ELICIT — OBO tool without elicitation gate
 * CLAWS-C004: DATA-LABEL-MISMATCH — data label conflicts with agent data ceiling
 * CLAWS-C005: CIRCULAR-DELEGATION — delegation cycle (including self-delegation)
 * CLAWS-C006: SKILL-TOOL-GHOST — skill references undeclared tool
 * CLAWS-C007: SCHEDULE-NO-APPROVAL — scheduled R4+ tool without pre-authorization
 */
export type ConflictCategory =
  | 'DENY-vs-TOOL'
  | 'TRUST-ESCALATION'
  | 'OBO-WITHOUT-ELICIT'
  | 'DATA-LABEL-MISMATCH'
  | 'CIRCULAR-DELEGATION'
  | 'SKILL-TOOL-GHOST'
  | 'SCHEDULE-NO-APPROVAL';

/**
 * Conflict level: Error (must fix) or Warning (should fix).
 *
 * PascalCase values — display-oriented. Distinct from ir/conflict-report's
 * lowercase ConflictLevel ('error' | 'warning' | 'info').
 */
export type ConflictLevel = 'Error' | 'Warning';

/**
 * Diagnostic codes for the 7 conflict categories.
 */
export const CONFLICT_DIAGNOSTIC_CODES: Record<ConflictCategory, string> = {
  'DENY-vs-TOOL': 'CLAWS-C001',
  'TRUST-ESCALATION': 'CLAWS-C002',
  'OBO-WITHOUT-ELICIT': 'CLAWS-C003',
  'DATA-LABEL-MISMATCH': 'CLAWS-C004',
  'CIRCULAR-DELEGATION': 'CLAWS-C005',
  'SKILL-TOOL-GHOST': 'CLAWS-C006',
  'SCHEDULE-NO-APPROVAL': 'CLAWS-C007',
};

/**
 * A file:line location within the OC workspace.
 */
export interface ConflictLocation {
  /** Source file path (relative to workspace root). */
  readonly file: string;
  /** 1-based line number. */
  readonly line: number;
}

/**
 * A single conflict entry in a ConflictReport.
 *
 * Each entry documents an inter-file contradiction with:
 * - The conflict category and diagnostic code
 * - Severity (Error/Warning)
 * - Two conflicting locations (file:line)
 * - A human-readable explanation
 */
export interface ConflictEntry {
  /** Conflict category. */
  readonly category: ConflictCategory;
  /** Diagnostic code (CLAWS-C001 through CLAWS-C007). */
  readonly code: string;
  /** Severity: Error (must fix) or Warning (should fix). */
  readonly severity: ConflictLevel;
  /** First conflicting location. */
  readonly locationA: ConflictLocation;
  /** Second conflicting location. */
  readonly locationB: ConflictLocation;
  /** Human-readable explanation of the conflict. */
  readonly explanation: string;
}

/**
 * ConflictReport — result of cross-file conflict detection.
 *
 * Ordered by severity (Error first), then by category.
 */
export interface ConflictReport {
  /** All detected conflicts, ordered by severity then category. */
  readonly conflicts: readonly ConflictEntry[];
  /** Count of Error-severity conflicts. */
  readonly errorCount: number;
  /** Count of Warning-severity conflicts. */
  readonly warningCount: number;
}

/**
 * Trust tier for agents (T1-T5), derived from identity attestation.
 *
 * Used by TRUST-ESCALATION detection: a subagent's tools must not
 * exceed its parent's trust tier.
 */
export type TrustTier = 1 | 2 | 3 | 4 | 5;

/**
 * ParsedManifest — flat, queryable form of the GovernanceAST.
 *
 * Input to both the rule engine (claws-rules) and conflict detector (Pulse 12).
 * Provides O(1) lookup by normalized name.
 *
 * Named ParsedManifest to avoid collision with ir/capability-manifest's
 * CapabilityManifest which has a different shape (ToolCapability, etc.).
 */
export interface ParsedManifest {
  /** All tool entries (from TOOLS.md + cross-referenced deny constraints). */
  readonly tools: readonly ToolEntry[];
  /** All skill entries (from skills/ directory). */
  readonly skills: readonly SkillEntry[];
  /** Agent roster (from AGENTS.md delegation graph). */
  readonly agents: readonly AgentRosterEntry[];
  /** Data label inventory (from MEMORY.md). */
  readonly dataLabels: readonly DataLabelEntry[];
  /** Diagnostics from manifest extraction. */
  readonly diagnostics: readonly ParseDiagnostic[];
}
