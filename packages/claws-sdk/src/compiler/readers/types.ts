/**
 * WorkspaceReader interface and shared types for the OC workspace reader module.
 *
 * Defines the contract for all 9 file readers: read method signature,
 * file path, parse result. Zero imports from `@craftworks`-scoped packages.
 *
 * @module claws-sdk/compiler/readers/types
 */

/**
 * Severity levels for workspace read diagnostics.
 */
export type WorkspaceDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A diagnostic produced during workspace file reading or parsing.
 */
export interface WorkspaceDiagnostic {
  /** Severity of the diagnostic. */
  readonly severity: WorkspaceDiagnosticSeverity;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Source file path (relative to workspace root). */
  readonly file: string;
  /** 1-based line number (undefined if not locatable). */
  readonly line?: number;
  /** Diagnostic code for programmatic matching. */
  readonly code: string;
}

/**
 * A workspace file with raw and normalized content.
 */
export interface WorkspaceFile {
  /** Path relative to workspace root. */
  readonly path: string;
  /** Raw file content as read from disk. */
  readonly rawContent: string;
  /** Normalized content (BOM-stripped, CRLF→LF, trailing newline enforced). */
  readonly normalizedContent: string;
}

/**
 * Successful read result.
 */
export interface WorkspaceReadSuccess<T> {
  readonly ok: true;
  /** The workspace file with raw and normalized content. */
  readonly file: WorkspaceFile;
  /** Parsed data extracted from the file. */
  readonly data: T;
  /** Diagnostics (warnings/info) produced during parsing. */
  readonly diagnostics: readonly WorkspaceDiagnostic[];
}

/**
 * Failed read result.
 */
export interface WorkspaceReadFailure {
  readonly ok: false;
  /** Path that was attempted. */
  readonly path: string;
  /** Diagnostics explaining the failure. */
  readonly diagnostics: readonly WorkspaceDiagnostic[];
}

/**
 * Discriminated union: success or failure of a workspace file read.
 */
export type WorkspaceReadResult<T> = WorkspaceReadSuccess<T> | WorkspaceReadFailure;

/**
 * Interface that all 9 workspace readers implement.
 */
export interface WorkspaceReader<T> {
  /** Relative path(s) this reader handles. */
  readonly filePath: string;
  /** Whether this file is required (error if missing) or optional (warning if missing). */
  readonly required: boolean;
  /** Read and parse the file from the workspace root. */
  read(workspaceRoot: string): Promise<WorkspaceReadResult<T>>;
}

// ── Parsed data types for each reader ────────────────────────────────

/** Parsed section from a markdown file. */
export interface MarkdownSection {
  /** Section heading text. */
  readonly heading: string;
  /** Section body content (trimmed). */
  readonly body: string;
  /** 1-based line number of the heading. */
  readonly line: number;
}

/** Parsed SOUL.md data. */
export interface SoulData {
  /** Persona/purpose text (top-level content before first section). */
  readonly persona: string;
  /** Named sections (Purpose, Principles, Voice, Boundaries, etc.). */
  readonly sections: readonly MarkdownSection[];
}

/** Parsed tool declaration from TOOLS.md. */
export interface ToolDeclaration {
  /** Tool name. */
  readonly name: string;
  /** Tool description/guidance. */
  readonly description: string;
  /** 1-based line number of the tool heading. */
  readonly line: number;
}

/** Parsed TOOLS.md data. */
export interface ToolsData {
  /** Tool declarations extracted from H2 sections. */
  readonly tools: readonly ToolDeclaration[];
}

/** Parsed agent definition from AGENTS.md. */
export interface AgentDefinition {
  /** Agent name. */
  readonly name: string;
  /** Agent description or model info. */
  readonly description: string;
  /** Tools granted to this agent. */
  readonly tools: readonly string[];
  /** 1-based line number of the agent heading. */
  readonly line: number;
}

/** Parsed AGENTS.md data. */
export interface AgentsData {
  /** Agent definitions extracted from H2 sections. */
  readonly agents: readonly AgentDefinition[];
}

/** Parsed memory entry from MEMORY.md. */
export interface MemoryEntry {
  /** Entry heading/title. */
  readonly title: string;
  /** Entry body content. */
  readonly body: string;
  /** 1-based line number of the entry heading. */
  readonly line: number;
}

/** Parsed MEMORY.md data. */
export interface MemoryData {
  /** Memory entries extracted from H2 sections. */
  readonly entries: readonly MemoryEntry[];
}

/** Parsed IDENTITY.md data. */
export interface IdentityData {
  /** Organization name. */
  readonly organization: string;
  /** Team name. */
  readonly team: string;
  /** Trust level string (e.g. "L3 — Verified enterprise deployment"). */
  readonly trustLevel: string;
  /** All named sections. */
  readonly sections: readonly MarkdownSection[];
}

/** Parsed USER.md data. */
export interface UserData {
  /** User role. */
  readonly role: string;
  /** User preferences as key-value pairs. */
  readonly preferences: readonly string[];
  /** All named sections. */
  readonly sections: readonly MarkdownSection[];
}

/** Parsed schedule entry from HEARTBEAT.md. */
export interface HeartbeatSchedule {
  /** Schedule trigger (heading text, e.g. "On Start", "Every 5 Minutes"). */
  readonly trigger: string;
  /** Actions listed under this schedule. */
  readonly actions: readonly string[];
  /** 1-based line number of the schedule heading. */
  readonly line: number;
}

/** Parsed HEARTBEAT.md data. */
export interface HeartbeatData {
  /** Schedule entries extracted from H2 sections. */
  readonly schedules: readonly HeartbeatSchedule[];
}

/** Parsed skill metadata from a SKILL.md file. */
export interface SkillMetadata {
  /** Skill name (from frontmatter or directory name). */
  readonly name: string;
  /** Skill description (from frontmatter or first paragraph). */
  readonly description: string;
  /** Tools listed in frontmatter. */
  readonly tools: readonly string[];
  /** Relative path to the SKILL.md file. */
  readonly path: string;
}

/** Parsed skills/ directory data. */
export interface SkillsData {
  /** Skill manifests from each SKILL.md found. */
  readonly skills: readonly SkillMetadata[];
}

/** Parsed workflow step from lobster.yaml. */
export interface LobsterStep {
  /** Step name. */
  readonly name: string;
  /** Step command. */
  readonly command: string;
}

/** Parsed lobster.yaml data. */
export interface LobsterData {
  /** Workflow name. */
  readonly name: string;
  /** Workflow description. */
  readonly description: string;
  /** Ordered workflow steps. */
  readonly steps: readonly LobsterStep[];
  /** Step dependencies (step name -> depends-on names). */
  readonly dependencies: Readonly<Record<string, readonly string[]>>;
}

/**
 * The unified OC workspace model returned by readOCWorkspace().
 *
 * Each field is either a successful read result with parsed data,
 * or a failure result with diagnostics explaining why.
 */
export interface OCWorkspaceModel {
  /** SOUL.md — persona, purpose, boundaries. */
  readonly soul: WorkspaceReadResult<SoulData>;
  /** TOOLS.md — tool declarations and usage constraints. */
  readonly tools: WorkspaceReadResult<ToolsData>;
  /** AGENTS.md — agent definitions and delegation rules. */
  readonly agents: WorkspaceReadResult<AgentsData>;
  /** MEMORY.md — memory entries and retention policies. */
  readonly memory: WorkspaceReadResult<MemoryData>;
  /** IDENTITY.md — identity config, SSO references, RBAC hints. */
  readonly identity: WorkspaceReadResult<IdentityData>;
  /** USER.md — user preferences and environment. */
  readonly user: WorkspaceReadResult<UserData>;
  /** HEARTBEAT.md — health signals and lifecycle schedules. */
  readonly heartbeat: WorkspaceReadResult<HeartbeatData>;
  /** skills/ directory — skill file manifests. */
  readonly skills: WorkspaceReadResult<SkillsData>;
  /** lobster.yaml — workflow configuration. */
  readonly lobster: WorkspaceReadResult<LobsterData>;
  /** Aggregated diagnostics from all readers. */
  readonly diagnostics: readonly WorkspaceDiagnostic[];
  /** Count of successfully read files. */
  readonly presentCount: number;
  /** Count of missing/failed files. */
  readonly absentCount: number;
}
